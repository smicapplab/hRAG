# hRAG Architecture Specification: Stateless Document Intelligence

This document defines the technical architecture of **hRAG** (Hybrid RAG), a document intelligence platform designed to be **stateless at the compute layer**.

## 1. System Topography

hRAG follows a shared-nothing, three-tier architecture. Each tier is physically and logically decoupled to allow for independent scaling and failure isolation.

### 1.1 Ingress Tier (Gateway)
*   **Technology:** Nginx
*   **Role:** SSL termination, request routing, and load balancing.
*   **Responsibility:** Distributes traffic across the compute pool and handles static asset caching.

### 1.2 Compute Tier (The hRAG Node)
*   **Technology:** SvelteKit (Node.js)
*   **Role:** API Server, Frontend, and Ingestion Engine.
*   **Responsibility:** Executes business logic, handles authenticated uploads/downloads, orchestrates vector searches, and manages the ingestion worker threads.
*   **Statelessness:** These nodes store no persistent data. On boot, they recover their state (JWT secrets and SQLite snapshots) from the Storage Tier.

### 1.3 Storage Tier (Persistence)
*   **Technology:** Garage S3 + Litestream
*   **Role:** Source of truth for all data.
*   **Responsibility:** 
    *   **Garage S3:** Replicated object storage. Standardized bucket/path conventions:
        *   `hrag-raw/`: Original document binaries.
        *   `hrag-vectors/`: LanceDB vector fragments.
        *   `hrag-system/secrets`: AES-GCM encrypted JWT keys.
        *   `hrag-system/metadata`: Litestream SQLite snapshots and Postgres migration logs.
    *   **Automated Provisioning:** hRAG automates storage setup across three modes:
        1. **Native Binary**: Portable `garage` binary setup for standalone use.
        2. **Docker Sidecar**: Containerized setup for developers and easy cleanup.
        3. **Enterprise Cluster**: Manual connection to a distributed, multi-node cluster.
    *   **Litestream:** Continuously streams SQLite metadata changes from the compute node to Garage S3.

---

## 2. Pluggable Engine Strategies

hRAG supports a pluggable architecture to balance portability with enterprise-grade scaling.

### 2.1 Metadata Strategy (Drizzle ORM)
*   **Mode A: SQLite (Default / Portable)**
    *   **Architecture:** Single-file database on the compute node.
    *   **Storage:** Replicated to S3 via Litestream.
    *   **Best for:** Standalone, small teams, and environments where managing a Postgres cluster is overkill.
*   **Mode B: PostgreSQL (Enterprise)**
    *   **Architecture:** External managed service or cluster.
    *   **Storage:** Direct connection via TCP.
    *   **Best for:** High-concurrency environments requiring strict ACID compliance across many compute nodes.

### 2.2 Vector Engine Strategy
*   **Mode A: LanceDB (Default / S3-Native)**
    *   **Architecture:** Embedded Rust engine using Node bindings.
    *   **Storage:** Direct S3 fragment reads/writes.
    *   **Best for:** Standalone, small-to-medium teams, and "zero-dependency" clusters.
*   **Mode B: Qdrant (Enterprise Service)**
    *   **Architecture:** Client-server model via REST/gRPC.
    *   **Storage:** Managed by the Qdrant cluster.
    *   **Best for:** Very large datasets requiring dedicated vector indexing hardware or managed service isolation.
    *   **Deployment:** Set `VECTOR_STORE_TYPE=qdrant` and provide `QDRANT_URL` and `QDRANT_API_KEY`.

### 2.3 Embedding Engine Strategy
hRAG provides a flexible embedding layer to support varying operational requirements.

*   **Mode A: Local Transformers (@xenova/transformers) [DEFAULT]**
    *   **Architecture:** Fully in-process inference via WASM/ONNX.
    *   **Connectivity:** **Air-gapped compatible.** No sidecar or external API required. Works out of the box with zero configuration or additional installation.
    *   **Best for:** High-privacy, zero-dependency, and restricted-network environments.
*   **Mode B: Ollama (Local Sidecar)**
    *   **Architecture:** Separate process running on the same host or cluster.
    *   **Connectivity:** Local network access to the Ollama API (usually port 11434).
    *   **Performance:** **GPU-accelerated.** Faster than WASM if a GPU is available.
    *   **Best for:** High-performance local deployments with hardware acceleration.
*   **Mode C: Cloud (OpenAI / Gemini / Anthropic)**
    *   **Architecture:** External SaaS API.
    *   **Connectivity:** **Outbound internet access required.** API keys must be provided.
    *   **Best for:** Rapid prototyping and deployments where internet access is not a constraint.

---

## 3. Core Data Flows

### 3.1 The Ingestion Journey (Async & Isolated)
To keep the UI responsive, all ingestion is handled asynchronously via **Node.js Worker Threads**.

1.  **Authenticated Upload:** User uploads a file via the API. The node verifies the JWT, checks quotas, and streams the file directly to the `hrag-raw/` S3 bucket.
2.  **Job Enqueue:** A job is added to the internal queue:
    *   **Standalone Mode:** Local worker threads (no extra infrastructure).
    *   **Enterprise Mode:** **BullMQ/Redis**. Adding Redis allows for distributed job coordination, ensuring any node in the pool can act as a worker while the primary node coordinates.
3.  **Extraction & OCR:** 
    *   The worker pulls the file from S3.
    *   Text is extracted using pure JS parsers (`pdf-parse`, `mammoth`).
    *   If no text is found, **Tesseract.js (WASM)** is triggered for OCR.
4.  **Chunking & Embedding:**
    *   Text is split into chunks (default: 512 tokens / 64 overlap).
    *   Embeddings are generated via the selected provider.
5.  **Indexing (The Write Path):**
    *   Metadata is written to Drizzle (SQLite/Postgres).
    *   Vector fragments are written to the `VectorStore`. **Important:** For LanceDB/S3, writes are routed to the `PRIMARY` node to prevent fragment conflicts.

### 3.2 The Search Path (Defense-in-Depth)
hRAG implements "Iron-Clad" security to prevent data leakage between tenants.

1.  **Identity:** Extract `user_id` and `group_ids` from the incoming JWT.
2.  **Relational Pre-Filter:** Query Drizzle to generate a list of `Authorized Document IDs` for that user:
    `WHERE (owner_id = sub OR group_id IN (groups) OR is_public = true)`
3.  **Vector Search:** Pass the user's query vector and the `Authorized ID` list as a **hard filter** to LanceDB/Qdrant.
4.  **Relational Post-Validation:** After retrieval, results are cross-verified against relational permissions one final time before delivery.
5.  **Audit Trail:** All search activities are logged (Identity + Query Hash + Result Count).

### 3.3 The Download Flow (Pre-signed URLs)
To maintain statelessness and handle large binaries efficiently:
1.  User requests a file view/download.
2.  API verifies permissions via Drizzle.
3.  API generates an **authenticated S3 Pre-signed URL** with a **60-second TTL**.
4.  The browser retrieves the file directly from Garage S3.

### 3.4 The Intelligence Chat Path (Context-Anchored)
hRAG provides a strictly anchored RAG chat experience:
1.  **Session Loading:** Retrieve chat history for the active `sessionId`, filtered by the current `user_id`.
2.  **RAG Augmentation:** 
    *   Perform a vector search using the "Iron-Clad" search path (Section 3.2).
    *   Retrieve the top-N authorized fragments.
3.  **LLM Orchestration:**
    *   Construct a prompt containing ONLY the authorized fragments and the sliding-window history.
    *   Invoke the selected LLM provider (Ollama, OpenAI, etc.).
4.  **Gap Analysis:** If no authorized fragments match the query, the system is instructed to report a "Gap Analysis" rather than hallucinating.
5.  **Persistence:** Store the assistant's response and the evidence (fragment IDs) in the `chat_messages` table for future reference.

---

## 4. State Recovery & Node Initialization

Every compute node follows a strict boot sequence to ensure cluster consistency:

1.  **S3 Handshake:** Verify connectivity to the Garage S3 cluster.
2.  **Secret Recovery (AES-GCM):**
    *   Retrieve the encrypted JWT Secret from `hrag-system/secrets`.
    *   Decrypt into memory using the user-provided **Master Passphrase**.
3.  **Metadata Restoration:**
    *   Run `litestream restore` to pull the latest SQLite snapshot from `hrag-system/metadata`.
4.  **App Start:**
    *   Launch the SvelteKit server.
    *   Initialize `litestream replicate` to stream local `.db` changes back to S3.

---

## 5. Operational Principles

### 5.1 Primary Node Election
In multi-node deployments, one node must be designated as the `PRIMARY` (`HRAG_PRIMARY=true`).
*   **Writes:** All ingestion and LanceDB compaction tasks are executed on the Primary.
*   **Reads:** All nodes can perform concurrent searches and metadata reads.
*   **Failure State:** If the primary node is unreachable, ingestion jobs queue and retry. A secondary node must be manually promoted to Primary to resume ingestion operations.

### 5.2 Security: Defense-in-Depth
Beyond data-path isolation, hRAG enforces:
*   **Audit Logging:** Every administrative action, search, and download is logged with timestamp and user ID.
*   **Rate Limiting:** Per-identity limits on ingestion and search endpoints to prevent resource exhaustion.
*   **Pre-signed URLs:** Direct document access is limited to short-lived (60s) authenticated tokens.

### 5.3 Portability & WASM
By using **Tesseract.js (WASM)** and **LanceDB (embedded Node bindings)**, hRAG removes the need for system-level dependencies beyond a standard Node.js runtime.

---

## 6. Runtime Rationale: Node.js vs Python

hRAG intentionally avoids the Python ecosystem to prioritize **system integrity** and **user accessibility**.

### 6.1 Dependency Hell Avoidance
Python-based RAG stacks frequently suffer from "dependency hell," requiring complex combinations of `pip`, `venv`, system-level C++ compilers, and specific CUDA versions. This often makes Docker a requirement rather than an option.
*   **hRAG Strategy:** By standardizing on **SvelteKit (Node.js)**, we ensure that any machine with a modern Node.js runtime can run the entire platform. 
*   **UNIX-First Focus:** hRAG is optimized for **Linux** and **macOS**. Windows is supported strictly via **WSL2** to maintain a consistent environment and avoid platform-specific path and binary issues.
*   **WASM Isolation:** High-performance tasks (OCR, Vector Search) are handled via WASM-compiled binaries, ensuring they run consistently across supported systems without local compilation.

### 6.2 Security & Maintenance
*   **Single Runtime:** Maintaining a single runtime (Node.js) reduces the attack surface and simplifies supply chain auditing compared to multi-language stacks (e.g., Node frontend + Python backend).
*   **Zero-Config Deployment:** Our goal is "Git clone & npm install." This accessibility ensures that non-technical users can deploy a secure, private document intelligence platform without needing to manage virtual environments or system libraries.

### 6.3 Pragmatic Trade-offs
We acknowledge that the "Single Runtime" mandate carries specific performance and ecosystem constraints:
*   **LangChain JS Lag:** The Python ecosystem is the primary driver for LangChain. Features, experimental integrations, and specific loaders may trail in the JS/TS version. hRAG addresses this by focusing on stable, core modules and implementing custom logic for gaps.
*   **Tesseract.js Performance:** OCR via Tesseract.js WASM incurs a 3-5x performance penalty compared to native system binaries on CPU. This penalty applies strictly to the OCR path; embedding performance depends on the selected provider (e.g., GPU-accelerated Ollama in Mode B provides high-performance inference).
*   **Asynchronous Relief:** These trade-offs are mitigated by our **Async Worker Strategy**. Heavy ingestion/OCR tasks are offloaded to Worker Threads (or BullMQ), ensuring that "slow" WASM processing never blocks the UI or API response times.

---

## 7. The "Power User" Escape Hatch (Sidecar Ingestion)

hRAG will NOT integrate Python into the core repository. However, the architecture is designed to allow "Power Users" to bypass internal Node.js workers.

### 7.1 The Sidecar Pattern
Since hRAG is **stateless at the compute layer** and uses standard S3/REST protocols, users who require Python-specific performance (e.g., `pytesseract` or advanced LLM frameworks) can implement an **External Ingestion Sidecar**:
1.  **Process Externally:** Run a Python script to extract, chunk, and embed documents.
2.  **Push to S3:** Upload processed fragments directly to the `hrag-raw` and `hrag-vectors` buckets.
3.  **Sync Metadata:** The hRAG API will provide endpoints to sync externally generated document metadata and relational permissions.

This ensures hRAG remains a "Clean" JS platform while providing a high-performance path for those comfortable with system-level complexities.

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
    *   **Garage S3:** Replicated object storage for raw documents (`hrag-raw`), LanceDB vector fragments (`hrag-vectors`), and system config (`hrag-system`).
    *   **Litestream:** Continuously streams SQLite metadata changes from the compute node to Garage S3.

---

## 2. Vector Engine Strategy

hRAG supports a pluggable vector architecture via an abstract `VectorStore` interface.

### 2.1 Mode A: LanceDB (Default / S3-Native)
*   **Architecture:** Embedded Rust engine using Node bindings.
*   **Storage:** Direct S3 fragment reads/writes.
*   **Best for:** Standalone, small-to-medium teams, and "zero-dependency" clusters.
*   **Deployment:** Default configuration.

### 2.2 Mode B: Qdrant (Enterprise Service)
*   **Architecture:** Client-server model via REST/gRPC.
*   **Storage:** Managed by the Qdrant cluster.
*   **Best for:** Very large datasets requiring dedicated vector indexing hardware or managed service isolation.
*   **Deployment:** Set `VECTOR_STORE_TYPE=qdrant` and provide `QDRANT_URL` and `QDRANT_API_KEY`.

---

## 3. Core Data Flows

### 3.1 The Ingestion Journey (Async & Isolated)
To keep the UI responsive, all ingestion is handled asynchronously via **Node.js Worker Threads**.

1.  **Authenticated Upload:** User uploads a file via the API. The node verifies the JWT, checks quotas, and streams the file directly to the `hrag-raw` S3 bucket.
2.  **Job Enqueue:** A job is added to the internal queue (Worker Threads for standalone, BullMQ/Redis for enterprise).
3.  **Extraction & OCR:** 
    *   The worker pulls the file from S3.
    *   Text is extracted using pure JS parsers (`pdf-parse`, `mammoth`).
    *   If no text is found, **Tesseract.js (WASM)** is triggered for OCR.
4.  **Chunking & Embedding:**
    *   Text is split into chunks (default: 512 tokens / 64 overlap).
    *   Embeddings are generated via the configured provider (Ollama, OpenAI, Gemini, or Anthropic).
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

### 3.3 The Download Flow (Pre-signed URLs)
To maintain statelessness and handle large binaries efficiently:
1.  User requests a file view/download.
2.  API verifies permissions via Drizzle.
3.  API generates an **authenticated S3 Pre-signed URL** with a **60-second TTL**.
4.  The browser retrieves the file directly from Garage S3.

---

## 4. State Recovery & Node Initialization

Every compute node follows a strict boot sequence to ensure cluster consistency:

1.  **S3 Handshake:** Verify connectivity to the Garage S3 cluster.
2.  **Secret Recovery (AES-GCM):**
    *   Retrieve the encrypted JWT Secret from `s3://hrag-system/secrets`.
    *   Decrypt into memory using the user-provided **Master Passphrase**.
3.  **Metadata Restoration:**
    *   Run `litestream restore` to pull the latest SQLite snapshot from `s3://hrag-system/metadata`.
4.  **App Start:**
    *   Launch the SvelteKit server.
    *   Initialize `litestream replicate` to stream local `.db` changes back to S3.

---

## 5. Operational Principles

### 5.1 Primary Node Election
In multi-node deployments, one node must be designated as the `PRIMARY` (`HRAG_PRIMARY=true`).
*   **Writes:** All ingestion and LanceDB compaction tasks are executed on the Primary.
*   **Reads:** All nodes can perform concurrent searches and metadata reads.

### 5.2 Portability & WASM
By using **Tesseract.js (WASM)** and **LanceDB (embedded Node bindings)**, hRAG removes the need for system-level dependencies beyond a standard Node.js runtime.

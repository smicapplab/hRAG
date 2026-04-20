# Project Plan: hRAG (Hybrid RAG)

## 1. Project Vision
**hRAG** is a unified, scalable document intelligence platform designed to be "stateless at the compute layer." By standardizing on **Garage S3** for storage and **JWT** for authentication, hRAG removes the distinction between a local "portable" app and a "robust" enterprise server. Scaling is achieved simply by adding more nodes to the Nginx/Garage cluster.

### Core Principles
* **Unified Stack:** Standalone is simply a single-node cluster.
* **Stateless Compute:** App nodes can be destroyed and recreated without data loss.
* **S3-Native:** All heavy lifting (Vectors and Metadata) resides in or is backed by **Garage S3**.
* **Browser-First:** No heavy desktop wrappers. A clean, responsive web interface that connects to the hRAG API.
* **Single Runtime Focus:** To ensure maximum portability and minimal bundle size, hRAG targets a pure **SvelteKit** (Node.js) runtime, avoiding Python and heavy Virtual DOM overhead.
* **No-Docker Requirement:** Components ship as high-performance binaries or standard Node.js environments.

---

## 2. Standardized Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | **SvelteKit** | Unified API Server (Server Routes) and Frontend. |
| **Ingestion Engine** | **SvelteKit (LangChain JS)** | Text extraction, chunking, and WASM-based OCR. |
| **Frontend** | **Svelte 5 / shadcn-svelte** | High-performance reactive UI with Bits UI-based components. |
| **Metadata** | **Drizzle ORM** | **SQLite** (Single-file) or **Postgres** (Enterprise). |
| **Vector Engine** | **VectorStore Interface** | Abstract interface supporting **LanceDB** (default) and **Qdrant**. |
| **Storage** | **Garage S3** | Lightweight Rust binary for replicated object storage. |
| **Proxy/LB** | **Nginx** | Handles SSL termination and request distribution. |
| **Auth** | **JWT** | Stateless identity management for users, teams, and groups. |

---

## 3. Architecture: The "Shared-Nothing" Model
Every deployment, regardless of size, follows the same three-tier structure:

1.  **Ingress Tier:** **Nginx** acts as the gateway, providing a single IP/Domain while load-balancing across app nodes.
2.  **Compute Tier:** One or more **hRAG** app instances (**SvelteKit**/Node.js). These pull configuration from environment variables and store no persistent data locally.
    *   **LanceDB Constraint:** In multi-node deployments, vector writes (ingestion/compaction) are routed to a **Designated Primary Node** (defined via `HRAG_PRIMARY=true` env var). If the primary node is unreachable, ingestion jobs queue and retry until a new primary is manually promoted.
3.  **Storage Tier:** A **Garage S3** cluster.
    * **Vectors:** LanceDB fragments are stored and queried directly from S3.
    * **Metadata:** SQLite files (for standalone) or Postgres connections (for enterprise).
    * **Config:** Shared secrets (JWT) are stored in a protected `hrag-system` bucket, encrypted via AES-GCM using a key derived from a user-provided **Master Passphrase** (entered once during `install.sh` and not stored on disk).

---

## 4. The "Metadata Switch" Strategy
While the storage is always S3-compatible, the relational engine can be swapped based on scale:

* **Mode A: SQLite (Standard/Portable)**
    * Best for single-node or smaller teams.
    * **Clustered SQLite:** To ensure persistence on S3, we use **Litestream**. It streams SQLite changes to Garage S3 in near real-time. On boot, a new compute node restores the latest snapshot from S3.
* **Mode B: PostgreSQL (Enterprise Cluster)**
    * Best for high-concurrency and strict data integrity.
    * Point the app to a clustered Postgres instance via connection string.

---

## 5. Deployment & Scaling Workflow

### 5.1 Startup Sequence (Node Initialization)
Every hRAG compute node follows this sequence on boot to ensure state recovery and persistence:

1.  **Storage Check:** Verify connection to the **Garage S3** cluster.
2.  **Secret Recovery:** Prompt for/retrieve the **Master Passphrase** to decrypt the **JWT Secret** from the `hrag-system` S3 bucket.
    *   **Automation Note:** Automated environments can provide the passphrase via an environment variable (`HRAG_MASTER_PASSPHRASE`) as an escape hatch, though this is less secure than manual input.
3.  **Database Restore:** Run `litestream restore` to pull the latest SQLite snapshot from S3 (if in SQLite mode).
4.  **App Launch:** Start the **SvelteKit server** wrapped by `litestream replicate`.

### 5.2 Phase 1: Zero-Config Setup
1.  **Launch Garage:** Start a single-node Garage instance (`garage server --single-node`).
    *   **WARNING:** Single-node Garage has **ZERO replication**. Data loss will occur if the physical disk fails.
2.  **Run hRAG:** The `install.sh` script prompts for:
    *   **Master Passphrase** (for secret encryption).
    *   **Embedding Provider**:
        *   **Local Transformers** (In-process, air-gapped).
        *   **Ollama** (Local GPU-accelerated sidecar).
        *   **Cloud** (OpenAI, Gemini, or Anthropic).
    *   **Database Mode** (SQLite vs Postgres).
3.  **Nginx:** Proxy traffic from port 80/443 to the app port (default: 3000).

---

## 6. Security & Multi-Tenancy (Iron-Clad Isolation)
hRAG follows a "Defense-in-Depth" strategy to ensure absolute multi-tenant isolation.

* **Stateless Auth:** Users log in and receive a JWT containing their `user_id` and `group_ids`.
* **Secret Integrity:** The JWT secret is never stored in plaintext. Decryption happens in-memory on node boot using the KDF-derived key from the user's passphrase.
* **Privacy Scoping (Relational Layer):**
    * Every query to the metadata database (Drizzle) is wrapped in a mandatory permission filter:
      `WHERE (owner_id = jwt.sub OR group_id IN (jwt.groups) OR is_public = true)`
* **Iron-Clad Vector Search:** 
    1. **Pre-Filter Generation:** The API first queries the relational database to get a list of "Authorized Document IDs" for the current user session.
    2. **Vector Constraint:** This list is passed as a **hard filter** to the VectorStore (LanceDB/Qdrant).
    3. **Post-Validation:** As a second layer of defense, search results are cross-verified against the relational permission set *after* retrieval and before being sent to the client.
* **Iron-Clad Download/View:**
    * **Zero Public Access:** S3 buckets have absolute `Block Public Access` enabled.
    * **Short-Lived Tokens:** Pre-signed URLs are generated with an extremely short TTL (e.g., **60 seconds**).
    * **Single-Use Enforcement:** If required, a one-time-token (OTT) strategy can be used where the URL is invalidated immediately after the first successful GET.
* **Audit Logging:** Every search query, document upload, and download request is logged with the user's identity, timestamp, and requested resource ID for compliance auditing.
* **Rate Limiting:** Per-user rate limiting on search and metadata endpoints to prevent "scraping" or metadata enumeration attacks.

---

## 7. Ingestion Pipeline
To keep the UI responsive, ingestion is handled via an internal async queue.
*   **Mode A (Standalone):** Uses in-process **Worker Threads** via SvelteKit server logic.
*   **Mode B (Enterprise):** Optionally supports **BullMQ/Redis** for distributed ingestion across multiple workers.

### 7.1 Supported Document Types (Pure Node.js)
*   **Standard Text:** MD, TXT, CSV, JSON.
*   **Office Documents:** DOCX, XLSX, PPTX (via `mammoth` or `xlsx`).
*   **Portable Documents (PDF):**
    *   **Text-based:** Native text extraction via `pdf-parse`.
    *   **Scanned/Image-based:** Automatic OCR fallback using **Tesseract.js (WASM)**. OCR is performed asynchronously and may take significant time for large scanned documents.
*   **Images:** JPG, PNG, WEBP (via `tesseract.js`).

### 7.2 Processing Workflow
1.  **Upload:** Files are uploaded to the `hrag-raw` S3 bucket via the hRAG API (verifying user quota and permissions first).
2.  **Processing:** 
    *   **Extraction & OCR:** Pure JS normalization. OCR is triggered automatically if the PDF contains no text.
    *   **Chunking:** Recursive character splitting. Defaults: **512 tokens / 64 overlap**.
    *   **Embedding:** Sent to the selected provider (Local Transformers, Ollama, OpenAI, Gemini, or Anthropic).
3.  **Indexing:** Chunks are written to the `VectorStore` (LanceDB on S3) and metadata to Drizzle.
4.  **Failure Contract:** 3 retries with backoff, Dead-Letter S3 bucket, and UI error visibility.

---

## 8. Observability
*   **Health:** `/api/v1/health` (Checks SvelteKit status, DB connection, S3 reachability, and Litestream replication lag).
*   **Ready:** `/api/v1/ready` (Returns 200 ONLY after Litestream restore is complete).
*   **Logs:** Standard JSON logging for ELK/Loki integration.

---

## 9. Maintenance & Upgrades
*   **Relational:** Managed via `drizzle-kit` migrations. **All modes (including SQLite) use migration files in production**.
*   **Vector:** LanceDB handles schema-on-read. Large format changes trigger a background re-index task.
*   **App Update:** Replace the binary. The startup sequence (Section 5.1) handles the rest.

---

## 10. Frontend Design: "The Control Room"
The UI targets a dense, industrial aesthetic optimized for infrastructure monitoring and technical document management.

*   **Aesthetic:** Dark by default. High information density using tables and grids (avoiding large card layouts).
*   **Stack:** **Svelte 5 + shadcn-svelte**.
*   **Styling:** **Tailwind CSS** (build-time only) utilizing a custom "Control Room" token palette. Design tokens (charcoal, signal blue, neon green, safety orange) are defined in `tailwind.config.js` to ensure the visual language is entirely project-specific, avoiding the default shadcn look.
*   **Typography:** **Plus Jakarta Sans** for headings/UI; **IBM Plex Mono** for filenames, chunk previews, metadata values, and status indicators.
*   **Palette:** Muted charcoal/slate baseline with functional accent colors (Signal Blue for actions, Neon Green for health, Safety Orange for errors).
*   **Layout:** "Supabase dashboard meets Terminal app" — structural borders, clear grid lines, and technical data overlays.

---

## 11. Development Milestones
The following milestones are planned for implementation. Note that some tracks (Frontend vs Vector) can proceed in parallel once the SvelteKit project is initialized.

- [ ] **SvelteKit Setup:** Initialize SvelteKit project with Tailwind and shadcn-svelte. (No dependencies)
- [x] **Security & Compliance Guide:** Formalize "Iron-Clad" mandates and trade-offs. (Completed)
- [ ] **Node Automation Scripts:** Implement `install.sh`, `run.sh`, `dev.sh`, and `reset-db.sh`. (No dependencies)
- [ ] **Data Seeding:** Implement `db:seed:essential` (roles/super-user) and `db:seed:demo` (multi-tenant sample data). (Depends on: SvelteKit Setup)
- [ ] **Frontend Foundation:** Implement "Control Room" design system components. (Depends on: SvelteKit Setup)
- [x] **JWT Secret Management:** Implement AES-GCM encryption and S3 storage/recovery logic. (Completed)
- [ ] **Vector Abstraction:** Define `VectorStore` interface and LanceDB/S3 provider. (No dependencies)
- [ ] **SQLite/Litestream Integration:** Automate Litestream sidecar and restore logic. (Depends on: SvelteKit Setup)
- [ ] **Ingestion Pipeline:** Pure Node extraction (WASM OCR), queue (Worker Threads vs BullMQ), and embedding (Local/Ollama/OpenAI/Gemini/Anthropic). (Depends on: Vector Abstraction, SvelteKit Setup)
- [ ] **External Metadata Sync API:** REST endpoints for the "Power User Sidecar" to push externally processed document metadata. (Depends on: Ingestion Pipeline)
- [ ] **Audit Log Ingestion API:** REST endpoints for external agents to report activities for centralized auditing. (Depends on: Health Endpoint)
- [ ] **Health Endpoint:** Monitor Garage, LanceDB, and Litestream lag. (Depends on: SQLite Integration)
- [ ] **Nginx Config Templating:** Automate SSL and upstream blocks. (Depends on: SvelteKit Setup)
- [ ] **Upgrade Strategy:** `hrag update` with Drizzle migrations. (Depends on: SvelteKit Setup)
- [ ] **Single-Node Warning:** Add a UI banner/alert for non-replicated storage. (Depends on: Frontend Foundation)
- [ ] **The Bridge:** Finalize `install.sh` with configuration prompts for the master passphrase, embedding provider (Local, Ollama, Cloud), and database mode. (Depends on: All above)

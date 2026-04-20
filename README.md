# hRAG (Hybrid RAG)

hRAG is a unified document intelligence platform designed for stateless horizontal scaling. By standardizing on Garage S3 for object and vector storage and Litestream for metadata replication, hRAG removes the architectural distinction between a portable standalone application and a robust enterprise cluster.

## Purpose
The project aims to provide a high-performance, S3-native RAG (Retrieval-Augmented Generation) system that remains "stateless at the compute layer." This allows compute nodes to be ephemeral and easily replicated without data loss, as the entire state is persisted in or replicated to the S3 storage tier.

## Documentation
Detailed specifications and guides for the hRAG platform:
*   **[Project Plan](./docs/project-plan.md)**: Development milestones, tech stack, and roadmap.
*   **[Architecture Spec](./docs/architecture.md)**: System topography, data flows, and runtime rationale.
*   **[Security & Compliance](./docs/security.md)**: Iron-Clad mandates, secret management, and GDPR/SOC2/HIPAA mapping.
*   **[UI Specification](./docs/ui-specs.md)**: "Control Room" design tokens and static interface mockups.

## Core Philosophy

* **Stateless Compute:** All identity, metadata, and vector state resides in the storage tier.
* **S3-Native:** LanceDB fragments and SQLite snapshots are stored directly in Garage S3.
* **Single Runtime:** Built exclusively on SvelteKit (Node.js/TypeScript) to ensure portability, minimal bundle size, and zero-config deployment.
* **Flexible Embeddings:** Supports **fully air-gapped** local inference (@xenova/transformers), GPU-accelerated local sidecars (Ollama), and cloud-based providers (OpenAI, Gemini, Anthropic).
* **No-Docker Mandate:** Designed to run as high-performance binaries or standard environments without requiring containerization.
* **Industrial Interface:** A dense, dark-themed "Control Room" aesthetic optimized for technical data density.

## Architecture: The "Shared-Nothing" Model
Every deployment, regardless of size, follows the same three-tier structure:

1.  **Ingress Tier:** **Nginx** acts as the gateway, providing a single IP/Domain while load-balancing across app nodes.
2.  **Compute Tier:** Ephemeral **hRAG** app nodes (SvelteKit/Node.js). These pull configuration from environment variables and store no persistent data locally.
    *   **LanceDB Constraint:** In multi-node deployments, vector writes (ingestion/compaction) are routed to a **Designated Primary Node** (defined via `HRAG_PRIMARY=true` env var). If the primary node is unreachable, ingestion jobs queue and retry until a new primary is manually promoted.
3.  **Storage Tier:** A **Garage S3** cluster.
    *   **Vectors:** LanceDB fragments are stored and queried directly from S3.
    *   **Metadata:** SQLite files (for standalone) or Postgres connections (for enterprise).
    *   **Config:** Shared secrets (JWT) are stored in a protected `hrag-system` bucket, encrypted via AES-GCM using a key derived from a user-provided **Master Passphrase** (entered once during `install.sh` and not stored on disk).

## Technical Stack
* **Framework:** SvelteKit (API Server Routes & Frontend).
* **Ingestion:** Node.js (LangChain JS), Worker Threads (Queue), Tesseract.js (WASM OCR).
* **Storage:** Garage S3 (Object Storage), Litestream (SQLite Replication).
* **Vector Engine:** Abstract VectorStore interface supporting LanceDB (S3-native default) and Qdrant.
* **Metadata:** Drizzle ORM (SQLite / PostgreSQL).
* **Frontend:** Svelte 5, shadcn-svelte, Tailwind CSS (custom "Control Room" tokens).
* **Identity:** Stateless JWT with AES-GCM encrypted secrets stored in S3.

## Security & Multi-Tenancy (Iron-Clad Isolation)
hRAG follows a "Defense-in-Depth" strategy to ensure absolute multi-tenant isolation:

*   **Stateless Auth:** JWT-based identity management for users, teams, and groups.
*   **Privacy Scoping:** Every relational query is wrapped in a mandatory permission filter (`WHERE owner_id = jwt.sub OR group_id IN (jwt.groups) OR is_public = true`).
*   **Iron-Clad Vector Search:** 
    1.  **Pre-Filter:** API queries relational DB for "Authorized Document IDs" for the current session.
    2.  **Vector Constraint:** This list is passed as a **hard filter** to the VectorStore.
    3.  **Post-Validation:** Results are cross-verified against relational permissions *after* retrieval and before delivery.
*   **Iron-Clad Download/View:**
    *   **Zero Public Access:** S3 buckets have absolute `Block Public Access` enabled.
    *   **Short-Lived Tokens:** Authenticated Pre-signed URLs with a maximum **60-second TTL**.
*   **Audit Logging:** Every search query, document upload, and download request is logged with user identity and timestamp.

## Ingestion Pipeline
To keep the API responsive, ingestion is handled via an internal async queue.
*   **Mode A (Standalone):** Uses in-process **Worker Threads** (no extra dependencies).
*   **Mode B (Enterprise):** Optionally supports **BullMQ/Redis** for distributed ingestion across multiple workers.

### Supported Document Types
*   **Standard Text:** MD, TXT, CSV, JSON.
*   **Office Documents:** DOCX, XLSX, PPTX.
*   **Portable Documents (PDF):** Native text extraction or automatic **Tesseract.js (WASM) OCR** fallback for scanned documents.
*   **Images:** JPG, PNG, WEBP (via OCR).

## Installation and Deployment

### Phase 1: Standalone Mode
1.  Initialize a single-node Garage S3 instance.
    *   **WARNING:** Single-node Garage has **ZERO replication**. Data loss will occur if the physical disk fails.
2.  Execute `install.sh` to configure:
    *   **Master Passphrase** (for secret encryption).
    *   **Embedding Provider** (Local Transformers, Ollama, OpenAI, Gemini, or Anthropic).
    *   **Database Mode** (SQLite vs Postgres).
3.  Start the hRAG server.

### Phase 2: Enterprise Cluster
1.  Deploy additional Garage nodes and join them to the cluster for replication.
2.  Spin up multiple hRAG compute nodes pointing to the shared S3 cluster.
3.  Designate a Primary Node via `HRAG_PRIMARY=true` for vector write operations.
4.  Configure Nginx to load balance across the compute pool.

## Observability
*   **Health:** `/api/v1/health` (Checks API, DB, S3, and Litestream replication lag).
*   **Ready:** `/api/v1/ready` (Returns 200 ONLY after Litestream restore is complete).
*   **Logs:** Standard JSON logging for ELK/Loki integration.

## Maintenance & Upgrades
*   **Relational:** Managed via `drizzle-kit` migrations. All modes (including SQLite) use migration files in production to ensure schema auditability.
*   **Vector:** LanceDB handles schema-on-read; format changes trigger background re-index tasks.
*   **App Update:** Replace the binary. The startup sequence handles secret recovery and database restoration automatically.

## Development Milestones
The following milestones are planned for implementation. Tracks such as Frontend Foundation and Vector Abstraction can proceed in parallel once the SvelteKit project is initialized.

* [x] **Security & Compliance Guide:** Formalize "Iron-Clad" mandates and trade-offs. (Completed)
* [x] **Node Automation Scripts:** Implement `install.sh`, `run.sh`, `dev.sh`, and `reset-db.sh`. (Completed)
* [ ] **SvelteKit Setup:** Initialization of the project with Tailwind and shadcn-svelte.
* [x] **Data Seeding:** Implementation of essential and demo seeds for multi-tenant verification. (Completed)
* [x] **Frontend Foundation:** Establishing the "Control Room" design system with reactive components. (Completed)
* [ ] **JWT Secret Management:** AES-GCM encryption and S3-based secret recovery.
* [ ] **Vector Abstraction:** Definition of the VectorStore interface and LanceDB/S3 provider.
* [ ] **SQLite/Litestream Integration:** Automation of the state recovery and replication bridge.
* [ ] **Ingestion Pipeline:** Pure Node.js extraction, WASM OCR, and async task queue.
* [ ] **External Metadata Sync API:** REST endpoints for external agents to push metadata.
* [ ] **Audit Log Ingestion API:** Centralized reporting for external sidecars.
* [ ] **Health Endpoint:** Monitor Garage, LanceDB, and Litestream lag.
* [ ] **Nginx Templating:** Automated generation of infrastructure configurations.
* [ ] **Upgrade Strategy:** Command-line management of migrations and versioning.
* [ ] **The Bridge:** Finalization of the installation and scale-out automation.

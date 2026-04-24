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
* **Single Runtime:** Built exclusively on SvelteKit (Node.js/TypeScript).
* **UNIX-First:** Optimized for **macOS** and **Linux**. Windows is supported via **WSL2** or **Docker Mode**.
* **Flexible Embeddings:** Supports **fully air-gapped** local inference by default using `@xenova/transformers`, requiring zero configuration or installation.

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

hRAG is designed for **Zero-Config** deployment. The `install.sh` wizard will automatically detect missing storage and offer three provisioning modes:

### 1. Storage Provisioning Modes
*   **Mode A: Native Binary** (The Portable Path): Downloads the `garage` binary directly to `./bin`. Ideal for single-machine, air-gapped, or Docker-free environments.
*   **Mode B: Docker** (The Clean Path): Generates a `docker-compose.yaml` and starts a containerized Garage instance. Ideal for developers who want easy cleanup.
*   **Mode C: External/Cluster** (The Enterprise Path): Skips local setup and connects to an existing Garage or S3-compatible cluster.

### 2. The Setup Protocol
1.  Run `./scripts/install.sh`.
2.  Select your **Storage Mode** if prompted.
3.  Provide a **Master Passphrase** (this is the key to your "Iron-Clad" vault).
4.  The script will automatically:
    *   Generate secure `JWT_SECRET` and `ADMIN_PASSWORD`.
    *   **Seal** those secrets into your S3 backend using AES-GCM.
    *   Initialize the **Drizzle** schema and seed the database.

### 3. Execution
*   **Development**: `./scripts/dev.sh` (Hot-reload, schema-push).
*   **Production**: `./scripts/run.sh` (Restore -> Migrate -> Replicate).

### 4. Sample Credentials (Demo Data)
If you opted to seed demo data during installation, use these identities to test multi-tenancy:

| Role | Identity (Email) | Access Secret |
| :--- | :--- | :--- |
| **System Overseer** | `admin@hrag.local` | `023ca5e527773ab6` |
| **Field Manager** | `manager.ops@hrag.local` | `password123` |
| **Logistics Staff** | `staff.logistics@hrag.local` | `password123` |
| **Compliance Auditor** | `auditor@hrag.local` | `password123` |

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

- [x] **SvelteKit Setup:** Initialize SvelteKit project with Tailwind and shadcn-svelte. (Completed)
- [x] **Security & Compliance Guide:** Formalize "Iron-Clad" mandates and trade-offs. (Completed)
- [x] **Node Automation Scripts:** Implement `install.sh`, `run.sh`, `dev.sh`, and `reset-db.sh`. (Completed)
- [x] **Data Seeding:** Implement `db:seed:essential` (roles/super-user/policies) and `db:seed:demo` (multi-tenant sample data). (Completed)
- [x] **Frontend Foundation:** Implement "Control Room" design system components. (Completed)
- [x] **JWT Secret Management:** Implement AES-GCM encryption and S3 storage/recovery logic. (Completed)
- [x] **Admin & Settings Control Plane (Phase 1):** Hierarchy Groups and Per-Group Roles. (Completed)
- [x] **Admin & Settings Control Plane (Phase 2):** Stateless Registry, Fleet Health (Heartbeats), and Audit Vault. (Completed)
- [x] **Vector Abstraction:** Define `VectorStore` interface and LanceDB/S3 provider. (Completed)
- [x] **Ingestion Pipeline:** Pure Node extraction (WASM OCR), queue (Worker Threads), and auto-classification. (Completed)
- [x] **Health Endpoint:** Monitor Garage, LanceDB, and DB connection. (Completed)
- [x] **The Bridge:** Finalize `install.sh` with configuration prompts for the master passphrase. (Completed)
- [x] **Content Discovery & Tagging (Phase 1):** Multi-label schema, AI-suggested tags, and search filters. (Completed)
- [x] **Content Discovery & Tagging (Phase 2):** Document Detail View and manual tag management. (Completed)
- [x] **Content Discovery & Tagging (Phase 3):** Semantic matching, privacy leakage fixes, and discovery sidebar. (Completed)
- [x] **Managed Taxonomy:** Governed tag creation (Admins/Managers only) and canonical seeding. (Completed)
- [x] **Advanced Taxonomy Governance:** Tag promotion (AI -> Canonical) and atomic merging logic. (Completed)
- [x] **Admin Taxonomy Registry:** Global management interface for merging and promoting taxonomy labels. (Completed)
- [x] **External Metadata Sync API:** REST endpoints for the "Power User Sidecar" to push document metadata. (Completed)
- [x] **Audit Log Ingestion API:** REST endpoints for external agents to report activities. (Completed)
- [x] **SQLite/Litestream Integration:** Automate Litestream sidecar and restore logic with `litestream.yml`. (Completed)
- [x] **Single-Node Warning:** Add a UI banner/alert for non-replicated storage (Single-node Garage). (Completed)
- [x] **Nginx Config Templating:** Automate SSL and upstream blocks for multi-node clusters. (Completed)
- [x] **Upgrade Strategy:** Implement `hrag update` with Drizzle migrations and binary swaps. (Completed)
- [x] **Intelligence Chat:** Implement document-anchored RAG chat with split-pane UI and history. (Completed)

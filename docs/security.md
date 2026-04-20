# hRAG Security & Compliance Guide: Iron-Clad Protection

This document operationalizes the **"Iron-Clad Security"** mandates for the hRAG platform. It serves as both a developer implementation guide and an auditing foundation for compliance readiness.

## 1. Threat Model & Tenant Isolation

hRAG is designed to protect sensitive document intelligence across multi-tenant environments. Our primary defense targets **Metadata Enumeration**, **Cross-Tenant Leakage**, and **Unauthorized Binary Access**.

### 1.1 The "Secure Runtime" Pillar

By standardizing on a **Single Runtime (SvelteKit/Node.js)** and **WASM Isolation**, we eliminate the supply-chain risks and "dependency hell" associated with multi-language Python stacks.

- **Zero System Binaries:** All processing (OCR, Vectors) runs within the Node.js sandbox via WASM.
- **Minimal Surface Area:** No external C++ libraries or system-level compilers required for deployment.
- **Performance Note:** We explicitly trade raw processing speed (e.g., native OCR performance) for the **integrity and auditability** of a sandboxed, zero-dependency environment.

---

## 2. Secret Management (The Zero-Trust Boot)

hRAG compute nodes are ephemeral and store no plaintext secrets on disk.

### 2.1 Boot Sequence & AES-GCM

1.  **Master Passphrase:** Provided by the user on node boot (or via `HRAG_MASTER_PASSPHRASE`).
2.  **Key Derivation:** An encryption key is derived from the passphrase using PBKDF2.
3.  **Secret Recovery:** The node retrieves the **AES-GCM encrypted JWT Secret** from the `hrag-system` S3 bucket.
4.  **In-Memory Decryption:** The secret is decrypted directly into memory. It is never written to disk or logged.

### 2.2 JWT Stateless Identity

- All user identities and permissions are encapsulated in signed JWTs.
- **Rotation:** Secrets can be rotated by re-encrypting the JWT secret in S3 with a new master passphrase.
- **Operational Note:** Rotation immediately invalidates all active sessions, causing a global logout. Coordinate with users before rotating in production.

---

## 3. Data Path Security: The "Authorization Sandwich"

Every request for document data or vector search must pass through a three-layer validation process.

### Layer 1: Identity Extraction

- Extract `user_id` and `group_ids` from the cryptographically verified JWT.

### Layer 2: Relational Pre-Filter (Drizzle)

- **Mandatory Wrappers:** All database queries MUST include the isolation filter:
  ```sql
  WHERE (owner_id = current_user_id
     OR group_id IN (user_group_ids)
     OR is_public = true)
  ```
- **Authorized Set:** For vector searches, this layer generates a list of "Authorized Document IDs."

### Layer 3: Vector Hard-Filter & Post-Validation

- **Hard Filter:** The search query is constrained at the engine level (LanceDB) using a **Unified ACL predicate**: `WHERE (owner_id = :userId) OR (ANY_IN(access_ids, :tokens))`.
- **Private-by-Default:** Access is whitelisted only. Documents with empty `access_ids` are invisible to everyone except the `owner_id`.
- **Active Indexing (Option C):** Only the latest version of a document is indexed in the Vector Store. Previous versions are retained in S3 for audit only.
- **Double-Check:** Retrieved chunks are cross-verified against relational permissions _after_ retrieval and _before_ being sent to the client to prevent edge-case "leaks" from index corruption.

---

## 4. S3 Hardening & Binary Access

Raw documents are never served directly by the compute nodes.

- **Block Public Access:** All hRAG S3 buckets MUST have absolute public access blocks enabled.
- **Pre-signed URLs:**
  - **TTL:** Maximum **60 seconds**.
  - **Authentication:** URLs are only generated after a successful JWT and relational permission check.
- **TTL Enforcement:** Pre-signed tokens ensure that even if a URL is intercepted, its utility window is extremely narrow.

---

## 5. Traceable Delegation (Sharing)

- **Delegated Sharing:** Editors can share documents with other users or groups.
- **Audit Lock:** Every change to document permissions (ACLs) is captured as a high-priority audit event with the actor's identity and previous state.
- **Symmetry:** Permission changes in the relational database must be immediately synced to the `access_ids` of the corresponding vector chunks.

---

## 6. Compliance Mapping

### 6.1 GDPR (Privacy & Sovereignty)

- **Data Isolation:** Multi-tenancy is enforced at the query level (relational) and storage level (bucket/path scoping).
- **Right to Erasure:** Deleting a document in hRAG triggers a physical delete of the binary in S3 and associated chunks in the VectorStore.
- **Snapshot Note:** Complete erasure requires aging out **Litestream snapshots** in `hrag-system/metadata`. Operators should implement a snapshot retention policy aligned with their GDPR "Right to Erasure" SLA.
- **Data Minimization:** We only extract and store text required for embedding and retrieval.

### 6.2 SOC2 (Auditing & Availability)

- **Audit Logging:** Every administrative action, document upload, search query, and download request is logged with:
  - `Timestamp`
  - `User Identity (sub)`
  - `Resource ID`
  - `Action Type`
- **State Recovery:** Litestream provides near real-time replication to S3, ensuring high availability and rapid disaster recovery without local state.

### 6.3 HIPAA (Healthcare Confidentiality)

- **Encryption at Rest:** All data in S3 is encrypted. In self-hosted Garage deployments, Server-Side Encryption (SSE) is managed at the **Garage configuration level**. Operators are responsible for validating that their Garage version supports the required encryption provider.
- **Encryption in Transit:** All traffic (Ingress and Storage-Compute) MUST use TLS 1.3.

---

## 7. Audit Logging Requirements

All nodes must output audit logs in structured JSON format for aggregation.

### 7.1 External Sidecars

Users employing the **"Power User Escape Hatch"** (Section 7 of Architecture) must ensure their external agents log activity in the standard hRAG JSON format. The hRAG API will provide endpoints to ingest these logs for centralized auditing.

```json
{
	"event": "document_search",
	"user_id": "usr_123",
	"timestamp": "2026-04-21T16:00:00Z",
	"query_hash": "sha256:...",
	"results_count": 12,
	"status": "success"
}
```

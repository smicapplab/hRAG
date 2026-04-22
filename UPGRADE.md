# hRAG Upgrade Guide

This document outlines the procedure for upgrading an hRAG cluster.

## Orchestrated Update

The primary method for upgrading hRAG is using the automated orchestrator:

```bash
npm run hrag:update
```

This command performs the following actions:
1. **Version Validation:** Compares current DB version against `package.json`.
2. **Relational Migration:** Runs `drizzle-kit migrate` to update the SQLite/Postgres schema.
3. **Vector Migration:** Detects if `VECTOR_STORE_TYPE` has changed and triggers a data migration between engines (e.g., LanceDB -> PgVector).
4. **Registry Update:** Updates system-wide settings in the `system_settings` table.
5. **Health Check:** Verifies the cluster state via `/api/v1/health`.

## Pre-requisites

- **Backup:** Always backup your SQLite file (`data/hrag.db`) and S3 buckets before upgrading.
- **Primary Node:** Run the update from the node designated as `HRAG_PRIMARY=true`.
- **Passphrase:** You will need the `HRAG_MASTER_PASSPHRASE` to proceed.

## Manual Vector Migration

If you need to manually trigger a vector migration:

```bash
MIGRATE_SOURCE_ENGINE=lancedb MIGRATE_TARGET_ENGINE=pgvector tsx scripts/migrate-vectors.ts
```

## Rollback Procedures

### Relational Database
hRAG uses Drizzle ORM. Schema migrations are generally **one-way**. 
- To rollback, you must restore the database from a backup.
- **WARNING:** Do not manually delete migration files from the `drizzle/` directory.

### Vector Store
If a vector migration fails:
1. Revert the `VECTOR_STORE_TYPE` environment variable to the previous value.
2. The system will continue to use the previous store.
3. Investigate the logs from `scripts/migrate-vectors.ts`.

## Safety Guards

- **No-Revert:** Once relational migrations are applied, reverting the binary without restoring the DB may cause instability.
- **Atomic Operations:** The orchestrator attempts to be as atomic as possible, but networking issues during vector migration can leave the target store in a partial state. The migrator uses "Delete-then-Insert" logic per document ID to ensure consistency on retries.

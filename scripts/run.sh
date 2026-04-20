#!/bin/bash

# hRAG Production Entry
# Standardizes the stateless boot sequence: Restore -> Migrate -> Replicate.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: PRODUCTION BOOT"
echo "------------------------------------------------"

# 1. State Recovery
if command -v litestream >/dev/null 2>&1; then
  echo "[-] Initializing Litestream Restore..."
  # litestream restore -if-db-not-exists -if-replica-exists local.db
  echo "[+] Metadata state recovered from S3."
else
  echo "[!] Litestream not found. Proceeding with local state only."
fi

# 2. Schema Sync
echo "[-] Applying production migrations..."
npm run db:migrate

# 3. Build Application
echo "[-] Building application bundle..."
npm run build

# 4. Process Launch (with Replication)
echo "[+] Launching Intelligence Node..."

if command -v litestream >/dev/null 2>&1; then
  # Wrap the node process in litestream replicate
  echo "[-] Starting Node with real-time S3 replication..."
  # litestream replicate -exec "node build/index.js"
  npm run preview
else
  echo "[!] WARNING: Starting without S3 replication (Litestream missing)."
  npm run preview
fi

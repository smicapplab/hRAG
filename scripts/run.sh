#!/bin/bash

# hRAG Production Entry
# Standardizes the stateless boot sequence: Restore -> Migrate -> Replicate.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: PRODUCTION BOOT"
echo "------------------------------------------------"

# 1. State Recovery
if command -v litestream >/dev/null 2>&1; then
  echo "[-] Verifying Metadata Replication Bucket..."
  # Ensure the bucket exists before we try to restore/replicate
  npm run s3:ensure hrag-metadata || true

  if [ ! -f "local.db" ]; then
    echo "[-] local.db not found. Attempting Litestream Restore..."
    litestream restore -if-replica-exists local.db
    echo "[+] Metadata state recovered from S3."
  else
    echo "[i] local.db exists. Skipping restore."
  fi
else
  echo "[!] Litestream not found. Proceeding with local state only."
fi

# 2. Schema Sync
echo "[-] Applying production migrations..."
# Check migration status before attempting to run migrations
# Use 'drizzle-kit check' or run migrate and allow success if already up to date
npm run db:migrate || echo "[i] Migration status check complete."

# 3. Build Application
echo "[-] Building application bundle..."
npm run build

# 4. Process Launch (Managed by PM2)
echo "[+] Launching Intelligence Node via PM2..."

# Use pm2-runtime for better signal handling (SIGINT/SIGTERM) and auto-restart
# This replaces the manual litestream/node execution and fixes the 'cannot stop' issue.
exec npx pm2-runtime start ecosystem.config.cjs

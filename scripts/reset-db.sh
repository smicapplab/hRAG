#!/bin/bash

# hRAG Environment Reset
# Wipes local state (SQLite, LanceDB) to provide a clean slate.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: RESET PROTOCOL"
echo "------------------------------------------------"
echo "[!] WARNING: This will wipe ALL local document metadata and vector fragments."
read -p "Are you sure you want to proceed? [y/N]: " CONFIRM

if [[ "$CONFIRM" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo "[-] Deleting local SQLite databases..."
  rm -f *.db *.db-shm *.db-wal hRAG/*.db hRAG/*.db-shm hRAG/*.db-wal
  
  echo "[-] Wiping LanceDB vector directory..."
  rm -rf lancedb/ hRAG/lancedb/
  
  if [ "$1" == "--hard" ]; then
    echo "[!] HARD RESET: Attempting to wipe S3 metadata (hrag-system)..."
    # Placeholder for Garage S3 bucket wipe logic if needed
    # mc rb --force garage/hrag-system/metadata
  fi
  
  echo "[+] Environment reset successful."
  echo "Run './scripts/install.sh' to re-initialize."
else
  echo "[!] Reset aborted."
fi

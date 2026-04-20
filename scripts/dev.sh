#!/bin/bash

# hRAG Development Entry
# Automates schema sync and launches the Vite dev server.

set -e

if [ ! -f .env ]; then
  echo "[!] No .env found. Running install.sh first..."
  ./scripts/install.sh
fi

echo "[-] Syncing database schema (Push)..."
npm run db:push

echo "[+] Launching Control Room Intelligence..."
npm run dev

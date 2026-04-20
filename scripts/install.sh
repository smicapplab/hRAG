#!/bin/bash

# hRAG Installation Wizard: The Control Room Setup
# Automates environment generation, security keys, and initial seeding.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: INSTALLATION PROTOCOL"
echo "------------------------------------------------"

# 1. Environment Generation
if [ ! -f .env ]; then
  echo "[-] Generating .env from template..."
  cp .env.example .env
  
  # Generate a secure JWT Secret
  JWT_SECRET=$(openssl rand -base64 32)
  echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
  
  # Generate a temporary Admin Password
  ADMIN_PASSWORD=$(openssl rand -hex 8)
  echo "ADMIN_PASSWORD=\"$ADMIN_PASSWORD\"" >> .env
  
  echo "[+] Environment initialized."
else
  echo "[!] .env already exists. Skipping generation."
fi

# 2. Security Setup: Master Passphrase
if ! grep -q "HRAG_MASTER_PASSPHRASE" .env; then
  echo ""
  read -sp "Enter MASTER PASSPHRASE (for S3 secret encryption): " MASTER_PASSPHRASE
  echo ""
  echo "HRAG_MASTER_PASSPHRASE=\"$MASTER_PASSPHRASE\"" >> .env
  echo "[+] Master Passphrase secured."
fi

# 3. Initialization
echo "[-] Installing dependencies..."
npm install

echo "[-] Running database migrations..."
npm run db:migrate

echo "[-] Seeding Essential Data (System Roles & Super-User)..."
npm run db:seed:essential

# 4. Interactive Demo Seeding
echo ""
read -p "Do you want to seed DEMO DATA (Multi-tenant samples)? [y/N]: " SEED_DEMO
if [[ "$SEED_DEMO" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo "[-] Seeding Demo Data..."
  npm run db:seed:demo
  echo "[+] Demo data seeded."
else
  echo "[!] Skipping demo data seeding."
fi

# 5. Final Output
echo ""
echo "------------------------------------------------"
echo "INSTALLATION COMPLETE"
echo "------------------------------------------------"
echo "Identity: admin@hrag.local"
echo "Access Secret: $(grep "ADMIN_PASSWORD" .env | cut -d'=' -f2 | tr -d '\"')"
echo ""
echo "Run './scripts/dev.sh' to start development server."
echo "Run './scripts/run.sh' for production boot sequence."
echo "------------------------------------------------"

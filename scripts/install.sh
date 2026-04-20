#!/bin/bash

# hRAG Installation Wizard: The Control Room Setup
# Automates environment generation, security keys, and initial seeding.
# NOTE: In active dev mode, this script performs a FORCE RESET of local data.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: INSTALLATION PROTOCOL"
echo "------------------------------------------------"

# 0. Clean Slate Protocol (Active Development)
echo "[-] Initiating Clean Slate: Wiping local state..."
rm -f local.db local.db-shm local.db-wal hRAG/local.db hRAG/local.db-shm hRAG/local.db-wal
rm -f docker-compose.yaml hRAG/docker-compose.yaml docker.garage.toml hRAG/docker.garage.toml
rm -rf lancedb/ hRAG/lancedb/ .garage/ hRAG/.garage/

if [ -f "docker-compose.yaml" ]; then
  echo "[-] Shutting down and wiping Docker containers/volumes..."
  docker compose down -v --remove-orphans > /dev/null 2>&1 || true
fi
echo "[+] Local state and containers cleared."

# 1. Environment Base Generation
if [ ! -f .env ]; then
  echo "[-] Generating .env from template..."
  cp .env.example .env
  echo "[+] .env initialized."
fi

# 2. Security Key Verification (Repairable)

# Check JWT_SECRET
if ! grep -q "JWT_SECRET" .env; then
  echo "[-] Generating secure JWT Secret..."
  JWT_SECRET=$(openssl rand -base64 32)
  echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env
  echo "[+] JWT Secret secured."
fi

# Check ADMIN_PASSWORD
if ! grep -q "ADMIN_PASSWORD" .env; then
  echo "[-] Setting default Admin Password..."
  ADMIN_PASSWORD="023ca5e527773ab6"
  echo "ADMIN_PASSWORD=\"$ADMIN_PASSWORD\"" >> .env
  echo "[+] Admin Password secured."
fi

# Check S3 Endpoint
if ! grep -q "S3_ENDPOINT" .env; then
  read -p "Enter S3 ENDPOINT (default: http://localhost:3900): " S3_EP
  S3_EP=${S3_EP:-http://localhost:3900}
  echo "S3_ENDPOINT=\"$S3_EP\"" >> .env
fi

# Check S3 Access Key
if ! grep -q "S3_ACCESS_KEY" .env; then
  read -p "Enter S3 ACCESS KEY (default: securepass): " S3_AK
  S3_AK=${S3_AK:-securepass}
  echo "S3_ACCESS_KEY=\"$S3_AK\"" >> .env
fi

# Check S3 Secret Key
if ! grep -q "S3_SECRET_KEY" .env; then
  read -p "Enter S3 SECRET KEY (default: securepass): " S3_SK
  S3_SK=${S3_SK:-securepass}
  echo "S3_SECRET_KEY=\"$S3_SK\"" >> .env
fi

# Check MASTER PASSPHRASE
if ! grep -q "HRAG_MASTER_PASSPHRASE" .env; then
  echo ""
  read -sp "Enter MASTER PASSPHRASE (for S3 secret encryption): " MASTER_PASSPHRASE
  echo ""
  echo "HRAG_MASTER_PASSPHRASE=\"$MASTER_PASSPHRASE\"" >> .env
  echo "[+] Master Passphrase secured."
fi

# 2.4 Pre-flight: S3 Connectivity & Provisioning
S3_URL=$(grep "S3_ENDPOINT" .env | cut -d'=' -f2 | tr -d '\"' || echo "http://localhost:3900")
if ! curl -s --connect-timeout 2 "$S3_URL" > /dev/null; then
  echo ""
  echo "[!] S3 Backend not found at $S3_URL"
  chmod +x ./scripts/provision-s3.sh
  ./scripts/provision-s3.sh
  
  echo "[-] Waiting for S3 storage to initialize (this can take up to 60s)..."
  MAX_RETRIES=60
  RETRY_COUNT=0
  while ! curl -s --connect-timeout 2 "$S3_URL" > /dev/null; do
    printf "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo ""
      echo "[!] FATAL: S3 backend failed to start in time at $S3_URL."
      exit 1
    fi
  done
  echo ""
  echo "[+] S3 backend online."
fi

# 2.5 Sealing Secrets to S3
echo "[-] Vaulting security keys to S3..."
npm run db:seal

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

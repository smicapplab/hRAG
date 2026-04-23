#!/bin/bash

# hRAG Upgrade Orchestrator (Shell Wrapper)
# Handles code retrieval (binary swap simulation) and triggers the TS orchestrator.

set -e

echo "------------------------------------------------"
echo "hRAG CONTROL ROOM: UPGRADE ORCHESTRATOR"
echo "------------------------------------------------"

# 1. Identity Check
is_primary=$(grep "HRAG_PRIMARY=true" .env || echo "false")
if [[ "$is_primary" == "false" ]]; then
    echo "[!] WARNING: This node is not marked as HRAG_PRIMARY."
    echo "[!] It is recommended to run upgrades from the primary node."
    read -p "[?] Continue anyway? [y/N]: " continue_upgrade
    if [[ ! "$continue_upgrade" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        exit 0
    fi
fi

# 2. Binary Swap / Code Refresh
# In a real-world scenario, this might download a binary or pull from git.
# Here we simulate the code refresh.
echo "[-] Refreshing application code (git pull)..."
if [ -d ".git" ]; then
    # git fetch && git reset --hard origin/main
    echo "[i] Simulated: git pull origin main"
else
    echo "[!] No .git directory found. Skipping code refresh."
fi

# 3. Environment Preparation
echo "[-] Installing/Updating dependencies..."
npm install

# 4. Trigger TS Orchestrator
echo "[-] Handing off to hRAG Update Engine..."
npm run hrag:update

# 5. Build Application
echo "[-] Rebuilding application bundle..."
npm run build

echo "------------------------------------------------"
echo "[+] UPGRADE COMPLETE"
echo "[!] Please restart the application (./scripts/run.sh)"
echo "------------------------------------------------"

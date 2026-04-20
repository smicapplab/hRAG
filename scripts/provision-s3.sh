#!/bin/bash

# hRAG Garage S3 Provisioner
# Handles Native, Docker, and External S3 configuration.

set -e

BIN_DIR="./bin"
GARAGE_VERSION="v1.0.0"

echo "------------------------------------------------"
echo "hRAG STORAGE PROVISIONING"
echo "------------------------------------------------"
echo "Select your S3 Storage Mode:"
echo "1) Native Binary (Single file, no Docker)"
echo "2) Docker (Containerized, easy cleanup)"
echo "3) External / Existing (Cluster or Cloud)"
echo "------------------------------------------------"
read -p "Selection [1-3]: " MODE

case $MODE in
    1)
        echo "[-] Mode: Native Binary"
        OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH_NAME=$(uname -m)
        case $ARCH_NAME in
            x86_64|amd64) GARAGE_ARCH="x86_64" ;;
            arm64|aarch64) GARAGE_ARCH="aarch64" ;;
            *) echo "[!] Unsupported architecture: $ARCH_NAME"; exit 1 ;;
        esac
        case $OS_NAME in
            linux) GARAGE_OS="unknown-linux-musl" ;;
            darwin) GARAGE_OS="apple-darwin" ;;
            *) echo "[!] Unsupported OS: $OS_NAME. For Windows, please use WSL or Docker mode."; exit 1 ;;
        esac
        mkdir -p "$BIN_DIR"
        URL="https://garagehq.deuxfleurs.fr/_releases/$GARAGE_VERSION/$GARAGE_ARCH-$GARAGE_OS/garage"
        if [ ! -f "$BIN_DIR/garage" ]; then
            echo "[-] Downloading Garage..."
            curl -L -o "$BIN_DIR/garage" "$URL"
            chmod +x "$BIN_DIR/garage"
        fi
        if [ ! -f "garage.toml" ]; then
            RPC_SECRET=$(openssl rand -hex 32)
            cat <<EOF > garage.toml
metadata_dir = "./.garage/meta"
data_dir = "./.garage/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "127.0.0.1:3901"
rpc_secret = "$RPC_SECRET"
[s3_api]
api_bind_addr = "127.0.0.1:3900"
s3_region = "us-east-1"
EOF
        fi
        mkdir -p .garage/meta .garage/data
        echo "[+] Native provisioning complete."
        echo "[!] ACTION REQUIRED: Run './bin/garage server' then initialize layout/keys manually."
        ;;

    2)
        echo "[-] Mode: Docker"
        if [ ! -f "docker.garage.toml" ]; then
            RPC_SECRET=$(openssl rand -hex 32)
            cat <<EOF > docker.garage.toml
metadata_dir = "/meta"
data_dir = "/data"
db_engine = "sqlite"
replication_factor = 1
rpc_bind_addr = "0.0.0.0:3901"
rpc_secret = "$RPC_SECRET"
[s3_api]
api_bind_addr = "0.0.0.0:3900"
s3_region = "us-east-1"
EOF
        fi

        if [ ! -f "docker-compose.yaml" ]; then
            cat <<EOF > docker-compose.yaml
services:
  garage:
    image: dxflrs/garage:v1.0.0
    container_name: hrag-s3
    ports:
      - "3900:3900"
      - "3901:3901"
    volumes:
      - ./.garage/meta:/meta
      - ./.garage/data:/data
      - ./docker.garage.toml:/etc/garage.toml
    command: /garage -c /etc/garage.toml server
EOF
        fi
        mkdir -p .garage/meta .garage/data
        echo "[-] Starting Docker container..."
        docker compose up -d

        echo "[-] Initializing Garage Layout (Single Node)..."
        MAX_WAIT=30
        WAIT_COUNT=0
        until docker exec hrag-s3 /garage -c /etc/garage.toml node id > /dev/null 2>&1 || [ $WAIT_COUNT -eq $MAX_WAIT ]; do
            echo "[-] Waiting for RPC to bind... ($WAIT_COUNT/$MAX_WAIT)"
            sleep 1
            WAIT_COUNT=$((WAIT_COUNT+1))
        done

        NODE_ID=$(docker exec hrag-s3 /garage -c /etc/garage.toml node id)
        docker exec hrag-s3 /garage -c /etc/garage.toml layout assign "$NODE_ID" --capacity 1G -z local
        docker exec hrag-s3 /garage -c /etc/garage.toml layout apply --version 1
        
        echo "[-] Generating S3 Credentials..."
        # Create key
        KEY_INFO=$(docker exec hrag-s3 /garage -c /etc/garage.toml key create hrag-admin)
        S3_AK=$(echo "$KEY_INFO" | grep "Key ID" | cut -d: -f2 | xargs)
        S3_SK=$(echo "$KEY_INFO" | grep "Secret key" | cut -d: -f2 | xargs)

        # Grant bucket creation permission
        echo "[-] Authorizing key for bucket creation..."
        docker exec hrag-s3 /garage -c /etc/garage.toml key allow --create-bucket hrag-admin

        echo "[-] Injecting credentials into .env..."
        # Portable sed-delete for Mac/Linux
        grep -v "S3_ACCESS_KEY" .env > .env.tmp && mv .env.tmp .env
        grep -v "S3_SECRET_KEY" .env > .env.tmp && mv .env.tmp .env
        
        echo "S3_ACCESS_KEY=\"$S3_AK\"" >> .env
        echo "S3_SECRET_KEY=\"$S3_SK\"" >> .env

        echo "[+] Docker storage node active and authorized."
        ;;

    3)
        echo "[-] Mode: External S3"
        echo "[i] Skipping local provisioning. Credentials will be requested by install.sh."
        ;;

    *)
        echo "[!] Invalid selection."
        exit 1
        ;;
esac

#!/bin/bash

# hRAG Nginx Config Generator (Production Grade)
# Automates SSL and upstream blocks for multi-node clusters.
# Usage: ./setup-nginx.sh <server_name> <comma_separated_upstreams> [cert_path] [key_path]

SERVER_NAME=${1:-localhost}
UPSTREAMS=${2:-"127.0.0.1:3000"}
SSL_CERT_PATH=${3:-"/etc/nginx/ssl/hrag.crt"}
SSL_KEY_PATH=${4:-"/etc/nginx/ssl/hrag.key"}

TEMPLATE_FILE="scripts/templates/nginx/nginx.conf.template"
if [ ! -f "$TEMPLATE_FILE" ]; then
    # Try looking in the current directory if scripts/ is not at the root
    TEMPLATE_FILE="hRAG/scripts/templates/nginx/nginx.conf.template"
fi
OUTPUT_FILE="hRAG/nginx.conf"

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "Error: Template not found at $TEMPLATE_FILE"
    exit 1
fi

# 1. Build upstream string
UPSTREAM_STR=""
IFS=',' read -ra ADDR <<< "$UPSTREAMS"
for i in "${ADDR[@]}"; do
    UPSTREAM_STR+="server $i;"
done

# 2. Self-signed Cert Generation (if paths don't exist and we have permissions)
if [[ "$SSL_CERT_PATH" == "/etc/nginx/ssl/hrag.crt" ]] && [ ! -f "$SSL_CERT_PATH" ]; then
    echo "[-] Certificate not found at default path. Checking local dev certs..."
    mkdir -p hRAG/certs
    LOCAL_CERT="hRAG/certs/hrag.crt"
    LOCAL_KEY="hRAG/certs/hrag.key"
    
    if [ ! -f "$LOCAL_CERT" ]; then
        echo "[-] Generating self-signed development certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$LOCAL_KEY" -out "$LOCAL_CERT" \
            -subj "/C=US/ST=State/L=City/O=hRAG/OU=Dev/CN=$SERVER_NAME"
        echo "[+] Dev certificate generated at $LOCAL_CERT"
    fi
    SSL_CERT_PATH=$(realpath "$LOCAL_CERT")
    SSL_KEY_PATH=$(realpath "$LOCAL_KEY")
fi

# 3. Generate config
echo "[-] Populating Nginx template for $SERVER_NAME..."
sed -e "s|{{SERVER_NAME}}|$SERVER_NAME|g" \
    -e "s|{{UPSTREAM_NODES}}|$UPSTREAM_STR|g" \
    -e "s|{{SSL_CERT_PATH}}|$SSL_CERT_PATH|g" \
    -e "s|{{SSL_KEY_PATH}}|$SSL_KEY_PATH|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "[+] Generated Nginx config at $OUTPUT_FILE"
echo "[!] Remember to reload Nginx: sudo nginx -s reload"

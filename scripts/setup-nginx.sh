#!/bin/bash

# hRAG Nginx Config Generator
# Usage: ./setup-nginx.sh <server_name> <comma_separated_upstreams>

SERVER_NAME=${1:-localhost}
UPSTREAMS=${2:-"127.0.0.1:3000"}

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

# Build upstream string
UPSTREAM_STR=""
IFS=',' read -ra ADDR <<< "$UPSTREAMS"
for i in "${ADDR[@]}"; do
    UPSTREAM_STR+="server $i;"
done

# Generate config
sed -e "s|{{SERVER_NAME}}|$SERVER_NAME|g" \
    -e "s|{{UPSTREAM_NODES}}|$UPSTREAM_STR|g" \
    "$TEMPLATE_FILE" > "$OUTPUT_FILE"

echo "Generated Nginx config at $OUTPUT_FILE"

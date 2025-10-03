#!/bin/bash

# SSL Certificate Generation Script for ft_transcendence
# This script generates self-signed SSL certificates for development

set -e

SSL_DIR="./ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 Generating SSL certificates for ft_transcendence development..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "✅ SSL certificates already exist:"
    echo "   Certificate: $CERT_FILE"
    echo "   Private Key: $KEY_FILE"
    
    # Check certificate validity
    if openssl x509 -in "$CERT_FILE" -noout -checkend 86400 > /dev/null 2>&1; then
        echo "✅ Certificate is valid for at least 24 hours"
        exit 0
    else
        echo "⚠️  Certificate is expiring soon, regenerating..."
        rm -f "$CERT_FILE" "$KEY_FILE"
    fi
fi

# Generate new self-signed certificate
echo "🔧 Generating new self-signed SSL certificate..."

openssl req -x509 -newkey rsa:4096 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -nodes \
    -subj '/C=US/ST=Development/L=Local/O=ft_transcendence/CN=localhost' \
    -addext 'subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1'

# Set appropriate permissions
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"

echo "✅ SSL certificates generated successfully!"
echo "   Certificate: $CERT_FILE"
echo "   Private Key: $KEY_FILE"
echo "   Valid for: 365 days"
echo ""
echo "🌐 You can now access the application at:"
echo "   https://localhost"
echo ""
echo "⚠️  Note: You'll see a security warning for the self-signed certificate."
echo "   This is normal for development. Click 'Advanced' and 'Proceed to localhost'."
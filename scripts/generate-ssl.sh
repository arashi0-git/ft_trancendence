#!/bin/bash

# SSL Certificate Generation Script for ft_transcendence
# This script generates self-signed SSL certificates for development
# Supports macOS (LibreSSL/OpenSSL), Linux (OpenSSL), and other Unix systems

set -e

SSL_DIR="./ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

echo "🔐 Generating SSL certificates for ft_transcendence development..."

# Detect OS and OpenSSL version for compatibility
OS_TYPE=$(uname -s)
OPENSSL_VERSION=$(openssl version 2>/dev/null || echo "unknown")

echo "🔍 Detected environment:"
echo "   OS: $OS_TYPE"
echo "   OpenSSL: $OPENSSL_VERSION"

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

# Function to check if OpenSSL supports -addext option
check_addext_support() {
    # Test if -addext is supported (OpenSSL 1.1.1+)
    if openssl req -help 2>&1 | grep -q "\-addext"; then
        return 0  # Supported
    else
        return 1  # Not supported
    fi
}

# Try modern approach first, fallback to config file method
if check_addext_support; then
    echo "📋 Using modern OpenSSL with -addext option..."
    
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 \
        -nodes \
        -subj '/C=US/ST=Development/L=Local/O=ft_transcendence/CN=localhost' \
        -addext 'subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1'
else
    echo "📋 Using config file method for compatibility (LibreSSL/older OpenSSL)..."
    
    # Create temporary OpenSSL config for cross-platform compatibility
    TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Development
L = Local
O = ft_transcendence
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    # Generate certificate using config file for compatibility
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 \
        -nodes \
        -config "$TEMP_CONFIG" \
        -extensions v3_req

    # Clean up temporary config
    rm -f "$TEMP_CONFIG"
fi

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
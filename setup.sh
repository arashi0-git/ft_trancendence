#!/bin/bash

echo "🚀 Setting up ft_transcendence..."

# Create frontend .env file if it doesn't exist
if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend/.env file..."
    cp frontend/.env.example frontend/.env
    # Update the API URL for Docker environment
    sed -i.bak 's|VITE_API_BASE_URL=http://localhost:3000/api|VITE_API_BASE_URL=https://localhost/api|g' frontend/.env
    rm -f frontend/.env.bak
    echo "✅ Frontend environment variables configured"
else
    echo "✅ Frontend .env file already exists"
fi

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env file..."
    cat > backend/.env << EOF
# Database
DATABASE_PATH=./database/transcendence.db

# JWT Configuration (REQUIRED)
JWT_SECRET=test-jwt-secret-for-development-only-change-in-production

# Server Configuration
PORT=3000
NODE_ENV=development
EOF
    echo "✅ Backend environment variables configured"
else
    echo "✅ Backend .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p database
mkdir -p ssl

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod +x setup.sh

echo ""
echo "🎉 Setup complete! You can now run:"
echo "   docker-compose up -d"
echo ""
echo "📱 Access the application at:"
echo "   https://localhost (HTTPS - Recommended)"
echo "   http://localhost (HTTP - Redirects to HTTPS)"
echo ""
echo "⚠️  Note: You'll see a security warning for the self-signed certificate."
echo "   This is normal for development. Click 'Advanced' and 'Proceed to localhost'."
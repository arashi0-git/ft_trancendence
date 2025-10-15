# ft_transcendence

A modern Pong game platform with user authentication and tournament system.

## Features

- User authentication with JWT tokens
- Real-time Pong game with tournament support
- Secure HTTPS connection
- Responsive web interface

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd ft_transcendence
```

### 2. Start the application

```bash
docker-compose up -d
```

This will:
- Generate self-signed SSL certificates for development
- Build and start the frontend (Nginx + React/TypeScript)
- Build and start the backend (Node.js + Fastify)
- Initialize the SQLite database

### 3. Access the application

- **HTTPS (Recommended)**: https://localhost
- **HTTP (Redirects to HTTPS)**: http://localhost

**Note**: You'll see a security warning for the self-signed certificate. This is normal for development. Click "Advanced" and "Proceed to localhost" to continue.

## SSL Certificate Configuration

### Development Environment

The application automatically generates self-signed SSL certificates for development:

- Certificates are stored in `./ssl/` directory
- Generated on first run via the `ssl-cert` service
- Valid for 365 days with localhost and 127.0.0.1 as valid names
- **Cross-platform compatibility**: Works on macOS (LibreSSL/OpenSSL), Linux (OpenSSL), and other Unix systems
- Automatically detects OpenSSL capabilities and uses appropriate certificate generation method

### Production Environment

For production deployment, replace the self-signed certificates with valid SSL certificates:

1. **Option 1: Replace certificate files**
   ```bash
   # Place your certificates in the ssl directory
   cp your-cert.pem ./ssl/cert.pem
   cp your-private-key.pem ./ssl/key.pem
   ```

2. **Option 2: Use volume mounts**
   ```yaml
   # In docker-compose.yml or docker-compose.prod.yml
   services:
     frontend:
       volumes:
         - /path/to/your/certs:/etc/nginx/ssl:ro
   ```

3. **Option 3: Use Let's Encrypt with Certbot**
   ```bash
   # Example with certbot
   certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
   ```

### Certificate Requirements

- **Certificate file**: `cert.pem` (full certificate chain)
- **Private key file**: `key.pem` (private key)
- **Permissions**: 
  - Certificate: 644 (readable by all)
  - Private key: 600 (readable by owner only)
- **Cross-platform support**: 
  - macOS: Works with both system LibreSSL and Homebrew OpenSSL
  - Linux: Works with system OpenSSL (all distributions)
  - Docker: Uses Alpine Linux with OpenSSL for consistent behavior

## Development

### Local Development Setup

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Start development servers
npm run dev  # In both frontend and backend directories
```

### Environment Variables

Create `.env` files in frontend and backend directories:

**Frontend (.env)**:
```env
VITE_API_BASE_URL=https://localhost/api
```

**Backend (.env)**:
```env
NODE_ENV=development
DATABASE_PATH=./database/transcendence.db
JWT_SECRET=your-jwt-secret-key
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx +      │────│   (Node.js +    │────│   (SQLite)      │
│   TypeScript)   │    │   Fastify)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: TypeScript + Vite, served by Nginx with HTTPS
- **Backend**: Node.js + Fastify API server
- **Database**: SQLite with foreign key constraints enabled

## Security Features

- HTTPS enforced with security headers
- JWT-based authentication
- XSS protection with input sanitization
- CSRF protection
- SQL injection prevention with parameterized queries

## Troubleshooting

### SSL Certificate Issues

1. **Certificate not found error**:
   ```bash
   # Regenerate certificates
   docker-compose down
   rm -rf ./ssl
   docker-compose up ssl-cert
   ```

2. **Permission denied errors**:
   ```bash
   # Fix certificate permissions
   chmod 644 ./ssl/cert.pem
   chmod 600 ./ssl/key.pem
   ```

3. **Browser security warnings**:
   - This is normal for self-signed certificates
   - Click "Advanced" → "Proceed to localhost"
   - Or add the certificate to your browser's trusted certificates

4. **Platform-specific issues**:
   
   **macOS**:
   ```bash
   # If using Homebrew OpenSSL
   brew install openssl
   
   # Check OpenSSL version
   openssl version
   
   # Generate certificates manually if needed
   ./scripts/generate-ssl.sh
   ```
   
   **Linux**:
   ```bash
   # Install OpenSSL if not present
   # Ubuntu/Debian:
   sudo apt-get install openssl
   
   # CentOS/RHEL/Fedora:
   sudo yum install openssl  # or dnf install openssl
   
   # Check version
   openssl version
   ```
   
   **Docker Environment**:
   ```bash
   # Force regenerate in Docker
   docker-compose run --rm ssl-cert sh -c "rm -f /certs/*.pem && /bin/sh"
   ```

### Database Issues

1. **Database connection errors**:
   ```bash
   # Check database directory permissions
   ls -la ./database/
   
   # Recreate database
   rm -f ./database/transcendence.db
   docker-compose restart backend
   ```

## Known Issues

The following issues have been identified and are tracked in GitHub Issues:

### Critical Issues
- **[Issue #19](https://github.com/arashi0-git/ft_trancendence/issues/19)**: トーナメントで勝敗決定後、次の試合に進めない
  - Tournament progression fails after match completion
  - Next round generation not working properly
  - **Priority**: Critical

### High Priority Issues
- **[Issue #21](https://github.com/arashi0-git/ft_trancendence/issues/21)**: パドルがボールをすり抜ける（当たり判定の問題）
  - Paddle collision detection issues
  - Ball passes through paddles during fast movement
  - **Priority**: High

- **[Issue #20](https://github.com/arashi0-git/ft_trancendence/issues/20)**: ゲーム操作時の矢印キーでページスクロールが発生
  - Arrow keys cause page scrolling during gameplay
  - Affects Player 2 controls (↑/↓/←/→)
  - **Priority**: High

- **[Issue #18](https://github.com/arashi0-git/ft_trancendence/issues/18)**: 'Back to Bracket'ボタンが反応しない
  - Navigation button not responding in tournament match view
  - Users cannot return to bracket view
  - **Priority**: High

### Medium Priority Issues
- **[Issue #17](https://github.com/arashi0-git/ft_trancendence/issues/17)**: トーナメント試合でのreset/pauseボタンの動作不良
  - Reset and pause buttons not functioning properly in tournament matches
  - Game control issues during tournament play
  - **Priority**: Medium

### Issue Status
To view the latest status of all issues:
```bash
gh issue list
```

To view details of a specific issue:
```bash
gh issue view <issue-number>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the 42 School curriculum.

## Planned Modules

### Oliver's Modules
1. AI-Algo: AI opponent
2. Gameplay: MultiPlayer (more than 2 players)
3. Gameplay: Game customization options
4. Web: First 3 (1 Major, 2 Minor)
5. Graphics: Use Advanced 3D techniques
6. Accessibility: Supports multiple languages
7. Cybersecurity: Implement Two-Factor Authentication (2FA) and JWT

### スンジュン's Modules
- Add another game with user history and matchmaking
- Server modules are not planned
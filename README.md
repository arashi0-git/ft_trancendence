# ft_transcendence

A modern Pong game with tournament system, built with TypeScript, Fastify, and Docker.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Ports 80, 443, and 3000 available

### Running the Application

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd ft_transcendence
   ```

2. **Start the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend (HTTPS)**: https://localhost
   - **Frontend (HTTP)**: http://localhost (redirects to HTTPS)
   - **Backend API**: http://localhost:3000

### SSL Certificate Warning
Since we use self-signed certificates for development, your browser will show a security warning. Click "Advanced" and "Proceed to localhost" to continue.

### Stopping the Application
```bash
docker-compose down
```

### Viewing Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend
```

## 🎮 Features

- **Pong Game**: Classic Pong with 4-directional paddle movement
- **Tournament System**: Multi-player bracket tournaments
- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Real-time Communication**: WebSocket support for live gameplay
- **Responsive Design**: Built with Tailwind CSS
- **HTTPS Security**: SSL/TLS encryption for all communications

## 🏗️ Architecture

- **Frontend**: TypeScript + Vite + Tailwind CSS (Nginx container)
- **Backend**: Node.js + Fastify + TypeScript (Node.js container)
- **Database**: SQLite with migrations
- **Containerization**: Docker + Docker Compose
- **SSL**: Self-signed certificates for development

## 🔧 Development Tools

### PRコメント取得スクリプト

PRの差分レビューコメントをMarkdownファイルとして取得できます。

#### 使い方

```bash
# GitHub CLIを使用（推奨）
gh auth login  # 初回のみ
npm run pr-comments -- https://github.com/owner/repo/pull/123

# または直接実行
./pr_comments_to_md.sh https://github.com/owner/repo/pull/123

# オプション指定
./pr_comments_to_md.sh -o owner -r repo -p 123
```

#### 必要な環境

- `jq` コマンド
- `gh` コマンド（GitHub CLI）または `GH_TOKEN` 環境変数

#### 出力

`pr-{PR番号}-review-comments.md` ファイルが生成されます。

## 🧪 API Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### User Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🛠️ Local Development (without Docker)

### Backend Setup
1. Copy the environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and set your JWT secret:
   ```bash
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

## 📁 Project Structure

```
ft_transcendence/
├── frontend/                 # Frontend application
│   ├── src/                 # TypeScript source files
│   ├── Dockerfile           # Frontend container
│   └── nginx.conf           # Nginx configuration
├── backend/                 # Backend API
│   ├── src/                 # TypeScript source files
│   ├── Dockerfile           # Backend container
│   └── .env.example         # Environment template
├── database/                # Database files
│   ├── schema.sql           # Database schema
│   └── migrations/          # Database migrations
├── ssl/                     # SSL certificates (auto-generated)
└── docker-compose.yml       # Docker orchestration
```

## 🔒 Security Features

- **HTTPS Enforcement**: All traffic encrypted with SSL/TLS
- **Password Hashing**: bcryptjs with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for secure cross-origin requests

## 🎯 Game Features

- **Classic Pong**: Faithful recreation of the original game
- **4-Directional Movement**: Enhanced paddle control (W/A/S/D and Arrow keys)
- **Tournament Mode**: Bracket-style tournaments for multiple players
- **Real-time Scoring**: Live score updates during gameplay
- **Player Aliases**: Custom names for tournament participants

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Check what's using the ports
lsof -i :80
lsof -i :443
lsof -i :3000

# Stop conflicting services or change ports in docker-compose.yml
```

### SSL Certificate Issues
```bash
# Regenerate SSL certificates
docker-compose up ssl-cert
```

### Database Issues
```bash
# Reset database
rm -f database/transcendence.db
docker-compose up --build
```

### Container Issues
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose up --build
```

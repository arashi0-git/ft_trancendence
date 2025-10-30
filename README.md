# ft_transcendence

A modern Pong game platform with user authentication and tournament system.

<img width="1470" height="794" alt="image" src="https://github.com/user-attachments/assets/96aef5ee-fb55-40f1-861c-fd6b4a138669" />

<img width="1470" height="795" alt="image" src="https://github.com/user-attachments/assets/ac7910c5-abaf-4e89-8e50-25c2d0225bd4" />

## Features

- User authentication with JWT tokens
- Real-time Pong game with tournament support
- Secure HTTPS connection
- Responsive web interface

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd ft_transcendence
```

### 2. Initial setup (Required for first time)

```bash
# Run the setup script to create necessary configuration files
./setup.sh
```

**Or manually create the configuration files:**

```bash
# Copy environment variable templates
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# Edit the files as needed (the setup script handles this automatically)
```

### 3. Start the application

**Option A: Using Make (Recommended)**

```bash
# One command setup and start
make all
```

**Option B: Using Docker Compose**

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
VITE_API_BASE_URL=
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

### Common Setup Issues

1. **"Page not found" or connection refused**:

   ```bash
   # Make sure you ran the setup first
   ./setup.sh

   # Check if all containers are running
   docker ps

   # Check container logs
   docker-compose logs frontend
   docker-compose logs backend
   ```

2. **Environment variables not found**:

   ```bash
   # Create missing .env files
   ./setup.sh

   # Or manually:
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```

3. **Permission denied on setup.sh**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

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

---

# ft_transcendence (日本語)

JWT認証とトーナメントシステムを備えたモダンなPongゲームプラットフォーム。

## 機能

- JWTトークンによるユーザー認証
- トーナメント対応のリアルタイムPongゲーム
- セキュアなHTTPS接続
- レスポンシブWebインターフェース

## 前提条件

- Docker と Docker Compose
- Node.js 20+ (ローカル開発用)

## クイックスタート

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd ft_transcendence
```

### 2. 初期セットアップ（初回のみ必要）

```bash
# セットアップスクリプトを実行して必要な設定ファイルを作成
./setup.sh
```

**または手動で設定ファイルを作成:**

```bash
# 環境変数テンプレートをコピー
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 必要に応じてファイルを編集（セットアップスクリプトが自動で処理）
```

### 3. アプリケーションを起動

**オプションA: Make使用（推奨）**

```bash
# ワンコマンドでセットアップと起動
make all
```

**オプションB: Docker Compose使用**

```bash
docker-compose up -d
```

これにより以下が実行されます：

- 開発用の自己署名SSL証明書を生成
- フロントエンド（Nginx + React/TypeScript）をビルドして起動
- バックエンド（Node.js + Fastify）をビルドして起動
- SQLiteデータベースを初期化

### 4. アプリケーションにアクセス

- **HTTPS（推奨）**: https://localhost
- **HTTP（HTTPSにリダイレクト）**: http://localhost

**注意**: 自己署名証明書のセキュリティ警告が表示されます。これは開発環境では正常です。「詳細設定」をクリックして「localhostに進む」を選択してください。

## SSL証明書の設定

### 開発環境

アプリケーションは開発用の自己署名SSL証明書を自動生成します：

- 証明書は `./ssl/` ディレクトリに保存
- `ssl-cert` サービスにより初回実行時に生成
- localhost と 127.0.0.1 を有効な名前として365日間有効
- **クロスプラットフォーム対応**: macOS（LibreSSL/OpenSSL）、Linux（OpenSSL）、その他のUnixシステムで動作
- OpenSSLの機能を自動検出し、適切な証明書生成方法を使用

### 本番環境

本番環境では、自己署名証明書を有効なSSL証明書に置き換えてください：

1. **オプション1: 証明書ファイルを置き換え**

   ```bash
   # 証明書をsslディレクトリに配置
   cp your-cert.pem ./ssl/cert.pem
   cp your-private-key.pem ./ssl/key.pem
   ```

2. **オプション2: ボリュームマウントを使用**

   ```yaml
   # docker-compose.yml または docker-compose.prod.yml で
   services:
     frontend:
       volumes:
         - /path/to/your/certs:/etc/nginx/ssl:ro
   ```

3. **オプション3: Let's Encrypt と Certbot を使用**
   ```bash
   # certbot の例
   certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
   ```

### 証明書の要件

- **証明書ファイル**: `cert.pem`（完全な証明書チェーン）
- **秘密鍵ファイル**: `key.pem`（秘密鍵）
- **権限**:
  - 証明書: 644（全員が読み取り可能）
  - 秘密鍵: 600（所有者のみ読み取り可能）
- **クロスプラットフォーム対応**:
  - macOS: システムのLibreSSLとHomebrew OpenSSLの両方で動作
  - Linux: システムのOpenSSL（全ディストリビューション）で動作
  - Docker: 一貫した動作のためAlpine LinuxとOpenSSLを使用

## 開発

### ローカル開発環境のセットアップ

```bash
# 依存関係をインストール
cd frontend && npm install
cd ../backend && npm install

# 開発サーバーを起動
npm run dev  # frontendとbackendの両方のディレクトリで実行
```

### 環境変数

frontendとbackendディレクトリに `.env` ファイルを作成：

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

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx +      │────│   (Node.js +    │────│   (SQLite)      │
│   TypeScript)   │    │   Fastify)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: TypeScript + Vite、HTTPSでNginxによって配信
- **Backend**: Node.js + Fastify APIサーバー
- **Database**: 外部キー制約が有効なSQLite

## セキュリティ機能

- セキュリティヘッダーによるHTTPS強制
- JWTベースの認証
- 入力サニタイゼーションによるXSS保護
- CSRF保護
- パラメータ化クエリによるSQLインジェクション防止

## トラブルシューティング

### 一般的なセットアップの問題

1. **「ページが見つかりません」または接続拒否**:

   ```bash
   # 最初にセットアップを実行したことを確認
   ./setup.sh

   # 全てのコンテナが動作しているか確認
   docker ps

   # コンテナのログを確認
   docker-compose logs frontend
   docker-compose logs backend
   ```

2. **環境変数が見つからない**:

   ```bash
   # 不足している.envファイルを作成
   ./setup.sh

   # または手動で:
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```

3. **setup.shの権限拒否**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

### SSL証明書の問題

1. **証明書が見つからないエラー**:

   ```bash
   # 証明書を再生成
   docker-compose down
   rm -rf ./ssl
   docker-compose up ssl-cert
   ```

2. **権限拒否エラー**:

   ```bash
   # 証明書の権限を修正
   chmod 644 ./ssl/cert.pem
   chmod 600 ./ssl/key.pem
   ```

3. **ブラウザのセキュリティ警告**:
   - 自己署名証明書では正常な動作です
   - 「詳細設定」→「localhostに進む」をクリック
   - またはブラウザの信頼できる証明書に追加

4. **プラットフォーム固有の問題**:

   **macOS**:

   ```bash
   # Homebrew OpenSSLを使用している場合
   brew install openssl

   # OpenSSLバージョンを確認
   openssl version

   # 必要に応じて手動で証明書を生成
   ./scripts/generate-ssl.sh
   ```

   **Linux**:

   ```bash
   # OpenSSLがインストールされていない場合
   # Ubuntu/Debian:
   sudo apt-get install openssl

   # CentOS/RHEL/Fedora:
   sudo yum install openssl  # または dnf install openssl

   # バージョンを確認
   openssl version
   ```

   **Docker環境**:

   ```bash
   # Dockerで強制的に再生成
   docker-compose run --rm ssl-cert sh -c "rm -f /certs/*.pem && /bin/sh"
   ```

### データベースの問題

1. **データベース接続エラー**:

   ```bash
   # データベースディレクトリの権限を確認
   ls -la ./database/

   # データベースを再作成
   rm -f ./database/transcendence.db
   docker-compose restart backend
   ```

## 既知の問題

以下の問題が確認されており、GitHub Issuesで追跡されています：

### 重要な問題

- **[Issue #19](https://github.com/arashi0-git/ft_trancendence/issues/19)**: トーナメントで勝敗決定後、次の試合に進めない
  - 試合完了後のトーナメント進行が失敗
  - 次のラウンド生成が正常に動作しない
  - **優先度**: 重要

### 高優先度の問題

- **[Issue #21](https://github.com/arashi0-git/ft_trancendence/issues/21)**: パドルがボールをすり抜ける（当たり判定の問題）
  - パドルの衝突検出の問題
  - 高速移動時にボールがパドルを通り抜ける
  - **優先度**: 高

- **[Issue #20](https://github.com/arashi0-git/ft_trancendence/issues/20)**: ゲーム操作時の矢印キーでページスクロールが発生
  - ゲームプレイ中に矢印キーがページスクロールを引き起こす
  - プレイヤー2のコントロール（↑/↓/←/→）に影響
  - **優先度**: 高

- **[Issue #18](https://github.com/arashi0-git/ft_trancendence/issues/18)**: 'Back to Bracket'ボタンが反応しない
  - トーナメント試合ビューでナビゲーションボタンが応答しない
  - ユーザーがブラケットビューに戻れない
  - **優先度**: 高

### 中優先度の問題

- **[Issue #17](https://github.com/arashi0-git/ft_trancendence/issues/17)**: トーナメント試合でのreset/pauseボタンの動作不良
  - トーナメント試合でリセットと一時停止ボタンが正常に機能しない
  - トーナメントプレイ中のゲームコントロールの問題
  - **優先度**: 中

### 問題のステータス

全ての問題の最新ステータスを確認するには：

```bash
gh issue list
```

特定の問題の詳細を確認するには：

```bash
gh issue view <issue-number>
```

## 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成
3. 変更を加える
4. 十分にテスト
5. プルリクエストを提出

## ライセンス

このプロジェクトは42 Schoolのカリキュラムの一部です。

## 予定されているモジュール

### Oliverのモジュール

1. AI-Algo: AI対戦相手
2. Gameplay: マルチプレイヤー（2人以上のプレイヤー）
3. Gameplay: ゲームカスタマイゼーションオプション
4. Web: 最初の3つ（1つのメジャー、2つのマイナー）
5. Graphics: 高度な3D技術の使用
6. Accessibility: 複数言語のサポート
7. Cybersecurity: 二要素認証（2FA）とJWTの実装

### スンジュンのモジュール

- ユーザー履歴とマッチメイキング機能を持つ別のゲームの追加
- サーバーモジュールは予定されていません

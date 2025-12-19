# ft_transcendence

ft_transcendenceプロジェクト。

## 機能

- **ユーザー認証**: JWTトークンを使用したセキュアな認証システム
- **リアルタイムPongゲーム**: トーナメント機能を備えたオンラインマルチプレイヤーゲーム
- **セキュリティ**: 常時HTTPS接続による通信の暗号化
- **UI/UX**: レスポンシブデザインに対応したモダンなWebインターフェース

## 使用技術

### フロントエンド

- **言語**: TypeScript
- **フレームワーク**: なし (Vanilla TypeScript)
- **レンダリングエンジン**: Babylon.js
- **スタイリング**: Tailwind CSS
- **ビルドツール**: Vite
- **Webサーバー**: Nginx

### バックエンド

- **ランタイム**: Node.js
- **フレームワーク**: Fastify

### データベース

- **RDBMS**: SQLite

## 前提条件

- Docker
- Docker Compose

## クイックスタート

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd ft_transcendence
```

### 2. セットアップと起動

```bash
# 初期セットアップを実行
./setup.sh

# アプリケーションを起動 (Make使用)
make all
```

または Docker Compose を直接使用する場合:

```bash
docker-compose up -d
```

### 3. アプリケーションへアクセス

ブラウザで以下のURLにアクセスしてください。

- <https://localhost>

※ 自己署名証明書を使用しているため、ブラウザでセキュリティ警告が表示される場合がありますが、開発環境では正常な挙動です。

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Nginx +      │────│   (Node.js +    │────│   (SQLite)      │
│   TypeScript)   │    │   Fastify)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ライセンス

このプロジェクトは42 Schoolのカリキュラムの一部です。

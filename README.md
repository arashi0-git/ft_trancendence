# ft_transcendence

ft_transcendenceプロジェクト。

<img width="1470" height="794" alt="トップ画面" src="https://github.com/user-attachments/assets/75f0d3c6-f61e-4775-9dcf-0c1730fcd6eb" />

## スクリーンショット

### ログイン / 登録画面

<img width="1470" height="795" alt="ログインページ" src="https://github.com/user-attachments/assets/80a34e56-04b6-41a9-83fe-62ea55e4df41" />
<img width="1470" height="793" alt="登録ページ" src="https://github.com/user-attachments/assets/75e01ef9-9f9c-4143-a7fe-8f07a9832274" />

### プレイヤー登録

<img width="1470" height="793" alt="プレイヤー登録" src="https://github.com/user-attachments/assets/c8dbc714-2a25-476e-b196-81d46ac2235d" />
<img width="1470" height="794" alt="アバター選択" src="https://github.com/user-attachments/assets/472bc81f-f154-450c-91fe-9a78b9aecc73" />

### ゲームプレイ

<img width="1470" height="796" alt="ゲーム画面1" src="https://github.com/user-attachments/assets/4cb12f63-b2c6-404b-b161-26bd86da02ed" />
<img width="1470" height="795" alt="ゲーム画面2" src="https://github.com/user-attachments/assets/a87f1b8b-53c4-4ac7-b379-3d04cd4c955a" />

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
- **ランタイム (開発/ビルド)**: Node.js
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

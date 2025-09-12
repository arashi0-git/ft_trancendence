FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルをコピー
COPY backend/package*.json ./

# ビルドツールを最初にインストール
RUN apk add --no-cache python3 make g++ sqlite-dev

# 依存関係のインストール（SQLite3を除いて）
RUN npm install --ignore-scripts

# SQLite3をソースからビルド
RUN npm install sqlite3 --build-from-source

# 残りのスクリプトを実行
RUN npm rebuild
# アプリケーションコードをコピー
COPY backend/ .

# TypeScriptのビルド
RUN npm run build

# ポート3000を公開
EXPOSE 3000

# 本番環境ではビルドされたJSを実行、開発環境ではts-nodeを使用
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm start; else npm run dev; fi"]
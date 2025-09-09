FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルをコピー
COPY backend/package*.json ./

# 依存関係のインストール（npm ciの代わりにnpm installを使用）
RUN npm install

# アプリケーションコードをコピー
COPY backend/ .

# TypeScriptのビルド
RUN npm run build

# ポート3000を公開
EXPOSE 3000

# 本番環境ではビルドされたJSを実行、開発環境ではts-nodeを使用
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm start; else npm run dev; fi"]
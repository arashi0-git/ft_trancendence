FROM node:18-alpine

WORKDIR /app

# 依存のためのツール
RUN apk add --no-cache python3 make g++ sqlite-dev

# 先に package*.json
COPY backend/package*.json ./

# 依存関係のインストール（better-sqlite3）
RUN npm install

# アプリ本体
COPY backend/ .

# DatabaseファイルのディレクトリとSchemaファイルを共有
COPY database/shcema.sql /app/database/schema.sql

# TypeScriptビルド
RUN npm run build

# DBファイル保存先（例：/app/data/transcendence.db）
ENV DATABASE_PATH=/app/data/transcendence.db
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm start; else npm run dev; fi"]

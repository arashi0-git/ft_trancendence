FROM node:20-alpine

WORKDIR /app

# 依存のためのツール
RUN apk add --no-cache python3 make g++ sqlite-dev 

# The essential line: force musl-native build (no glibc prebuilds)
ENV npm_config_build_from_source=true

# 先に package*.json
COPY backend/package*.json ./

# 依存関係のインストールとネイティブモジュールのビルド
RUN npm ci \
    && npm rebuild better-sqlite3 --build-from-source \
    && rm -rf node_modules/.cache

# アプリ本体
COPY backend/ .

# DatabaseファイルのディレクトリとSchemaファイルを共有
COPY database/schema.sql /app/database/schema.sql

# TypeScriptビルド
RUN npm run build

RUN mkdir -p /app/ssl

# DBファイル保存先（例：/app/data/transcendence.db）
ENV DATABASE_PATH=/app/database/transcendence.db
RUN mkdir -p /app/database

EXPOSE 3000 

CMD ["npm", "start"]





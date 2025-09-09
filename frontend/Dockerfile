FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# パッケージファイルをコピー
COPY frontend/package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY frontend/ .

# TypeScriptのビルド
RUN npm run build

# HTTPS用の証明書ディレクトリ作成
RUN mkdir -p /app/ssl

# 本番用の静的ファイルサーバー設定
RUN npm install -g serve

# ポート443（HTTPS）を公開
EXPOSE 443
EXPOSE 80

# SSL証明書をボリュームマウントして使用
# HTTPS対応の静的ファイルサーバーを起動
CMD ["sh", "-c", "serve -s dist -l 443 --ssl-cert /app/ssl/cert.pem --ssl-key /app/ssl/key.pem || serve -s dist -l 80"]
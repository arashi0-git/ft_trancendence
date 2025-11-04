#!/bin/bash

# エラーが発生したらスクリプトを終了
set -e

# frontend と backend のディレクトリを指定
FRONT_DIR="./frontend"
BACK_DIR="./backend"

# 両方のサーバーをバックグラウンドで起動
echo "🚀 Starting backend..."
cd "$BACK_DIR"
npm run dev &
BACK_PID=$!

echo "🚀 Starting frontend..."
cd "../$FRONT_DIR"
npm run dev &
FRONT_PID=$!

# 終了時にプロセスを停止
trap "echo '🛑 Stopping servers...'; kill $BACK_PID $FRONT_PID" EXIT

# どちらかが終了するまで待機
wait

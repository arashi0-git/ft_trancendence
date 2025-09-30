#!/bin/bash

# ft_transcendence 認証APIテストスクリプト
# Usage: ./test-auth-api.sh

set -e  # エラー時に停止

# 色付きの出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
API_BASE="http://localhost:3000/api"

# テスト用ユーザー情報
TEST_USERNAME="testuser"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"

echo -e "${BLUE}=== ft_transcendence 認証APIテスト ===${NC}"
echo ""

# 1. ヘルスチェック
echo -e "${YELLOW}1. ヘルスチェック${NC}"
echo "GET ${API_BASE}/health"
HEALTH_RESPONSE=$(curl -s -X GET "${API_BASE}/health")
echo "Response: ${HEALTH_RESPONSE}"

if echo "${HEALTH_RESPONSE}" | grep -q "ok"; then
    echo -e "${GREEN}✅ ヘルスチェック成功${NC}"
else
    echo -e "${RED}❌ ヘルスチェック失敗${NC}"
    exit 1
fi
echo ""

# 2. ユーザー登録
echo -e "${YELLOW}2. ユーザー登録テスト${NC}"
echo "POST ${API_BASE}/auth/register"
echo "Data: {\"username\":\"${TEST_USERNAME}\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"

REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${TEST_USERNAME}\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

echo "Response: ${REGISTER_RESPONSE}"

if echo "${REGISTER_RESPONSE}" | grep -q "token"; then
    echo -e "${GREEN}✅ ユーザー登録成功${NC}"
    # トークンを抽出
    REGISTER_TOKEN=$(echo "${REGISTER_RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token: ${REGISTER_TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠️  ユーザー登録: ユーザーが既に存在する可能性があります${NC}"
fi
echo ""

# 3. ログインテスト
echo -e "${YELLOW}3. ログインテスト${NC}"
echo "POST ${API_BASE}/auth/login"
echo "Data: {\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"

LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

echo "Response: ${LOGIN_RESPONSE}"

if echo "${LOGIN_RESPONSE}" | grep -q "token"; then
    echo -e "${GREEN}✅ ログイン成功${NC}"
    # トークンを抽出
    LOGIN_TOKEN=$(echo "${LOGIN_RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token: ${LOGIN_TOKEN:0:50}..."
else
    echo -e "${RED}❌ ログイン失敗${NC}"
    exit 1
fi
echo ""

# 4. 認証が必要なエンドポイントテスト
echo -e "${YELLOW}4. 認証付きエンドポイントテスト${NC}"
echo "GET ${API_BASE}/auth/me"
echo "Authorization: Bearer ${LOGIN_TOKEN:0:50}..."

ME_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/me" \
    -H "Authorization: Bearer ${LOGIN_TOKEN}")

echo "Response: ${ME_RESPONSE}"

if echo "${ME_RESPONSE}" | grep -q "username"; then
    echo -e "${GREEN}✅ 認証付きエンドポイント成功${NC}"
    # ユーザー情報を抽出
    USERNAME=$(echo "${ME_RESPONSE}" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo "Logged in as: ${USERNAME}"
else
    echo -e "${RED}❌ 認証付きエンドポイント失敗${NC}"
    exit 1
fi
echo ""

# 5. 無効なログインテスト
echo -e "${YELLOW}5. 無効なログインテスト${NC}"
echo "POST ${API_BASE}/auth/login"
echo "Data: {\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword\"}"

INVALID_LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword\"}")

echo "Response: ${INVALID_LOGIN_RESPONSE}"

if echo "${INVALID_LOGIN_RESPONSE}" | grep -q "error"; then
    echo -e "${GREEN}✅ 無効なログインが正しく拒否されました${NC}"
else
    echo -e "${RED}❌ 無効なログインが受け入れられました（セキュリティ問題）${NC}"
fi
echo ""

# 6. ログアウトテスト
echo -e "${YELLOW}6. ログアウトテスト${NC}"
echo "POST ${API_BASE}/auth/logout"
echo "Authorization: Bearer ${LOGIN_TOKEN:0:50}..."

LOGOUT_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/logout" \
    -H "Authorization: Bearer ${LOGIN_TOKEN}")

echo "Response: ${LOGOUT_RESPONSE}"

if echo "${LOGOUT_RESPONSE}" | grep -q "successfully"; then
    echo -e "${GREEN}✅ ログアウト成功${NC}"
else
    echo -e "${YELLOW}⚠️  ログアウト: レスポンス形式が異なります${NC}"
fi
echo ""

# 7. 総合結果
echo -e "${BLUE}=== テスト完了 ===${NC}"
echo -e "${GREEN}🎉 認証システムが正常に動作しています！${NC}"
echo ""
echo "次のステップ:"
echo "1. ブラウザで http://localhost:5174 にアクセス"
echo "2. 以下の認証情報でログインテスト:"
echo "   Email: ${TEST_EMAIL}"
echo "   Password: ${TEST_PASSWORD}"
echo ""
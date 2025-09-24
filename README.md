# ft_trancendence

APIテスト
```sh
cd backend

npm run dev
```
```sh
# ユーザー登録テスト
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# ログインテスト
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# ヘルスチェック
curl http://localhost:3000/api/health

```
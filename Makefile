# ft_transcendence Makefile
# 単一コマンドでautonomousコンテナを起動する要件を満たす

.PHONY: all setup build up down clean fclean re logs

# デフォルトターゲット - 単一コマンドで全て起動
all: setup build up

# 初期セットアップ（環境変数ファイル作成）
setup:
	@echo "Running initial setup..."
	@./setup.sh

# SSL証明書生成（開発用）
ssl:
	@mkdir -p ssl
	@docker-compose run --rm ssl-cert

# イメージのビルド
build: ssl
	@echo "Building Docker images..."
	@docker-compose build

# コンテナの起動（autonomous実行）
up:
	@echo "Starting ft_transcendence..."
	@docker-compose up -d
	@echo "ft_transcendence is running at https://localhost"

# コンテナの停止
down:
	@echo "Stopping ft_transcendence..."
	@docker-compose down

# ログの確認
logs:
	@docker-compose logs -f

# データベースのリセット
db-reset:
	@rm -f database/transcendence.db
	@echo "Database reset complete"

# クリーンアップ（コンテナ停止、イメージ削除）
clean: down
	@echo "Cleaning up containers and images..."
	@docker-compose down --rmi all --volumes --remove-orphans

# 完全クリーンアップ（データも削除）
fclean: clean
	@echo "Removing all data..."
	@rm -rf database/transcendence.db ssl/
	@docker system prune -af

# 再構築
re: fclean all

# 開発モードでの起動（ログ表示）
dev: build
	@echo "Starting ft_transcendence in development mode..."
	@docker-compose up
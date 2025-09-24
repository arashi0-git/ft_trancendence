# ft_trancendence

## 開発ツール

### PRコメント取得スクリプト

PRの差分レビューコメントをMarkdownファイルとして取得できます。

#### 使い方

```bash
# GitHub CLIを使用（推奨）
gh auth login  # 初回のみ
npm run pr-comments -- https://github.com/owner/repo/pull/123

# または直接実行
./pr_comments_to_md.sh https://github.com/owner/repo/pull/123

# オプション指定
./pr_comments_to_md.sh -o owner -r repo -p 123
```

#### 必要な環境

- `jq` コマンド
- `gh` コマンド（GitHub CLI）または `GH_TOKEN` 環境変数

#### 出力

`pr-{PR番号}-review-comments.md` ファイルが生成されます。

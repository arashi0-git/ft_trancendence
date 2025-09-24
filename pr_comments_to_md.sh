#!/usr/bin/env bash
set -euo pipefail

# 使い方:
#   ./pr_comments_to_md.sh -o OWNER -r REPO -p PR_NUMBER
#   ./pr_comments_to_md.sh https://github.com/OWNER/REPO/pull/123
#
# 環境変数:
#   GH_TOKEN があれば curl に使用。gh が入っていれば gh api を優先利用。
#
# 出力:
#   pr-<PR_NUMBER>-review-comments.md をカレントディレクトリに生成。

OWNER=""
REPO=""
PR=""

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: $1 が見つかりません"; exit 1; }; }

# URL から owner/repo/pr を抽出
parse_url() {
  local url="$1"
  if [[ "$url" =~ github\.com/([^/]+)/([^/]+)/pull/([0-9]+) ]]; then
    OWNER="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
    PR="${BASH_REMATCH[3]}"
  else
    echo "ERROR: PR URL の形式ではありません: $url"
    exit 1
  fi
}

# 引数パース
if [[ $# -eq 1 && "$1" == https://github.com/*/pull/* ]]; then
  parse_url "$1"
else
  while getopts "o:r:p:" opt; do
    case "$opt" in
      o) OWNER="$OPTARG" ;;
      r) REPO="$OPTARG" ;;
      p) PR="$OPTARG" ;;
      *) echo "使い方: $0 -o OWNER -r REPO -p PR_NUMBER | $0 https://github.com/OWNER/REPO/pull/123"; exit 1 ;;
    esac
  done
fi

[[ -n "${OWNER}" && -n "${REPO}" && -n "${PR}" ]] || { echo "ERROR: OWNER/REPO/PR を指定してください"; exit 1; }

need jq

# gh があれば token 取得に利用
GH_AVAILABLE=false
if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    GH_AVAILABLE=true
  fi
fi

API_BASE="https://api.github.com/repos/${OWNER}/${REPO}"

# ページネーション対応: gh api または curl で全件取得
fetch_all() {
  local endpoint="$1"  # 例: /pulls/123/comments
  local acc="[]"
  if $GH_AVAILABLE; then
    # gh api は --paginate で自動追跡
    local json
    if ! json=$(gh api --paginate "repos/${OWNER}/${REPO}${endpoint}" -q '.[]' 2>/dev/null | jq -s '.'); then
      echo "ERROR: gh api で取得失敗: ${endpoint}" >&2
      exit 1
    fi
    acc="$json"
  else
    # curl + Linkヘッダで追跡
    [[ -n "${GH_TOKEN:-}" ]] || { echo "ERROR: GH_TOKEN が設定されていません。gh を使うか GH_TOKEN をエクスポートしてください。"; exit 1; }
    local page=1
    while :; do
      local resp headers body
      resp=$(curl -sS -D - -H "Authorization: Bearer ${GH_TOKEN}" \
        "${API_BASE}${endpoint}?per_page=100&page=${page}")
      headers=$(printf "%s" "$resp" | sed -n '1,/^\r$/p')
      body=$(printf "%s" "$resp" | sed '1,/^\r$/d')
      acc=$(jq -s '.[0] + .[1]' <(echo "$acc") <(echo "$body"))
      echo "$headers" | grep -qi 'rel="next"' || break
      page=$((page+1))
    done
  fi
  echo "$acc"
}

echo "Fetching review comments for ${OWNER}/${REPO} PR #${PR} ..."

# 差分に紐づくレビューコメントのみ取得
REVIEW_COMMENTS_JSON="$(fetch_all "/pulls/${PR}/comments")"

# Markdown 生成
OUTFILE="pr-${PR}-review-comments.md"
jq -r --arg PR "$PR" '
  "# PR #" + $PR + " 差分レビューコメント\n" +
  "(レビューで行に紐づいたコメントのみ)\n\n" +
  if length == 0 then
    "_コメントは見つかりませんでした_\n"
  else
    ( .[] |
      "- **\(.user.login)** [\(.created_at)]\n" +
      "  `\(.path)#L\(.line // .original_line // 0)`\n" +
      "  \((.body // "(空のコメント)"))\n" +
      "  _(diff_hunk)_\n```\n" +
      ((.diff_hunk // "(なし)") | gsub("\r";"")) +
      "\n```\n"
    )
  end
' <<< "$REVIEW_COMMENTS_JSON" > "$OUTFILE"

echo "生成しました -> $OUTFILE"
import { FastifyReply } from "fastify";

export interface ApiError {
  code: string;
  message: string;
}

export interface ErrorResponseBody {
  error: ApiError;
}

export function buildError(code: string, message: string): ErrorResponseBody {
  return {
    error: {
      code,
      message,
    },
  };
}

// HTTPステータスコード：
// 200 - OK（成功）
// 201 - Created（作成成功）
// 400 - Bad Request（リクエストエラー）
// 401 - Unauthorized（認証エラー）
// 403 - Forbidden（権限なし）
// 404 - Not Found（見つからない）
// 500 - Internal Server Error（サーバーエラー）

// バックエンド全エラーコード一覧
// 認証関連 (AUTH_*)
// AUTH_MISSING_FIELDS	400	必須フィールドが不足
// AUTH_PASSWORD_TOO_SHORT	400	パスワードが8文字未満
// AUTH_INVALID_EMAIL	400	メールアドレスが無効
// AUTH_USERNAME_LENGTH	400	ユーザー名が3〜20文字ではない
// AUTH_USER_CONFLICT	409	ユーザー名またはメールが既に存在
// AUTH_REGISTRATION_FAILED	500	登録処理失敗
// AUTH_LOGIN_MISSING_FIELDS	400	ログインフィールドが不足
// AUTH_INVALID_CREDENTIALS	401	ユーザー名またはパスワードが不正
// AUTH_2FA_RESEND_FAILED	500	2FAコード再送信失敗
// AUTH_2FA_VERIFY_FAILED	400	2FA検証失敗
// AUTH_2FA_MISSING_FIELDS	400	トークンまたはコードが不足
// AUTH_LOGOUT_FAILED	500	ログアウト失敗
// AUTH_TOKEN_REQUIRED	401	アクセストークンが必要
// AUTH_USER_NOT_FOUND	401	ユーザーが見つからない
// AUTH_TOKEN_INVALIDATED	401	トークンが無効化されている
// AUTH_INVALID_TOKEN	401	トークンが無効または期限切れ
// AUTH_UNAUTHORIZED	401	ユーザーが認証されていない

// ユーザー関連 (USER_*)
// USER_EMAIL_CHANGE_REQUIRES_2FA	400	メール変更には2FAが必要
// USER_UPDATE_FAILED	500	ユーザー情報更新失敗
// USER_UPDATE_INVALID	400	更新できるフィールドがない

// アバター関連 (AVATAR_*)
// AVATAR_NO_FILE	400	ファイルが提供されていない
// AVATAR_INVALID_TYPE	400	無効なファイル形式 (PNG/JPG/WEBP のみ)
// AVATAR_TOO_LARGE	413	ファイルサイズが5MBを超過
// AVATAR_READ_FAILED	500	ファイル読み込み失敗
// AVATAR_PROCESSING_FAILED	500	画像処理失敗
// AVATAR_INVALID_DIMENSIONS	400	無効な画像サイズ (最小48x48)
// AVATAR_UNSUPPORTED_TYPE	400	サポートされていない画像形式
// AVATAR_SAVE_FAILED	500	アバター保存失敗
// AVATAR_UPDATE_FAILED	500	データベース更新失敗

// 友達関連 (FRIENDS_*)
// FRIENDS_LIST_FAILED	500	友達リスト取得失敗
// FRIENDS_ADD_FAILED	500	友達追加失敗
// FRIENDS_INVALID_INPUT	400	無効な入力
// FRIENDS_CONFLICT	409	友達関係が既に存在
// FRIENDS_INVALID_ID	400	無効なユーザーID
// FRIENDS_REMOVE_FAILED	500	友達削除失敗

// ゲーム履歴関連 (HISTORY_*)
// HISTORY_FORBIDDEN_FOR_OTHER_USER	403	他のユーザーの履歴は作成不可
// HISTORY_INVALID_MATCH_TYPE	400	無効なマッチタイプ
// HISTORY_TOURNAMENT_NAME_REQUIRED	400	トーナメント名が必須
// HISTORY_TOURNAMENT_NAME_TOO_LONG	400	トーナメント名が30文字超過
// HISTORY_CREATE_FAILED	500	履歴作成失敗
// HISTORY_INVALID_TOURNAMENT_ID	400	無効なトーナメントID
// HISTORY_INVALID_LIMIT	400	無効なlimitパラメータ（1〜10）
// HISTORY_INVALID_OFFSET	400	無効なoffsetパラメータ
// HISTORY_FETCH_FAILED	500	履歴取得失敗
// HISTORY_STATS_FAILED	500	統計情報取得失敗

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  return reply.status(statusCode).send(buildError(code, message));
}

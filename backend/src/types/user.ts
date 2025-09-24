// 型定義構造体とかそんなイメージ
// DBに対してそれぞれの型の中身を取得し、呼び出し元に返す

// データベースのusersテーブルと同じ構造のUser型
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
  token_version: number;
}

// APIリクエスト
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// パスワードを除いた公開用のProfile型
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_online: boolean;
  last_login: string | null;
}

// APIレスポンス
export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface ApiError {
  error: string;
}

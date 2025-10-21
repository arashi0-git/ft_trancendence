export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_online: boolean;
  last_login: string;
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
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
}

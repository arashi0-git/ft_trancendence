export interface PublicUser {
  id: number;
  username: string;
  email: string;
  profile_image_url: string | null;
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

export interface UpdateUserSettingsPayload {
  username?: string;
  email?: string;
  profile_image_url?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateUserSettingsResponse {
  user: PublicUser;
  token?: string;
}

export interface FollowingListResponse {
  following: PublicUser[];
}

export interface FollowUserResponse {
  user: PublicUser;
}

export interface ApiError {
  error: string;
}

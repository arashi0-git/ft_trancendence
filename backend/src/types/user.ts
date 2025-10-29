import { PublicUser } from "../models/User";

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export type UserProfile = PublicUser;

export interface LoginRequest {
  email: string;
  password: string;
}

// APIレスポンス
export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface UpdateUserProfileRequest {
  username?: string;
  email?: string;
  profile_image_url?: string | null;
}

export interface UpdateUserSettingsRequest extends UpdateUserProfileRequest {
  currentPassword?: string;
  newPassword?: string;
}

export interface FollowUserRequest {
  username: string;
}

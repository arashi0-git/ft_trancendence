export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface UserWithoutPassword {
  id: number;
  username: string;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
  token_version: number;
  two_factor_enabled: boolean;
  language: string;
}

export type PublicUser = Omit<UserWithoutPassword, "token_version">;

export interface UpdateUserProfileRequest {
  username?: string;
  email?: string;
  profile_image_url?: string | null;
  language?: string;
}

export interface UpdateUserWithPasswordRequest
  extends UpdateUserProfileRequest {
  currentPassword?: string;
  newPassword?: string;
}

export interface FriendUserRequest {
  username: string;
}

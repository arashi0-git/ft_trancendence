export interface PublicUser {
  id: number;
  username: string;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
  two_factor_enabled: boolean;
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

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
  delivery: "email";
  expiresIn: number;
  message: string;
}

export type AuthResult = AuthResponse | TwoFactorChallengeResponse;

export interface TwoFactorVerifyPayload {
  token: string;
  code: string;
}

export interface TwoFactorStatusResponse {
  user: PublicUser;
  token?: string;
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

export type FollowedUserSummary = Pick<
  PublicUser,
  "id" | "username" | "profile_image_url" | "is_online" | "last_login"
>;

export interface FollowingListResponse {
  following: FollowedUserSummary[];
}

export interface FollowUserResponse {
  user: FollowedUserSummary;
}

export interface ApiError {
  error: string;
}

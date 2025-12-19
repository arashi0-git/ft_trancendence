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
  language: string;
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

export type TwoFactorPurpose =
  | "login"
  | "enable_2fa"
  | "disable_2fa"
  | "email_change";

export interface TwoFactorChallengeDetails {
  requiresTwoFactor: true;
  twoFactorToken: string;
  destination?: string;
  expiresIn: number;
  message: string;
  purpose: TwoFactorPurpose;
  user?: PublicUser;
  token?: string;
}

export type AuthResult = AuthResponse | TwoFactorChallengeDetails;

export interface TwoFactorVerifyPayload {
  token: string;
  code: string;
}

export interface TwoFactorVerificationResponse extends AuthResponse {
  operation: TwoFactorPurpose;
  twoFactorEnabled?: boolean;
}

export interface TwoFactorStatusResponse {
  user: PublicUser;
  token?: string;
}

export interface UpdateUserSettingsPayload {
  username?: string;
  email?: string;
  profile_image_url?: string | null;
  language?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface UpdateUserSettingsResponse {
  user: PublicUser;
  token?: string;
}

export type FriendSummary = Pick<
  PublicUser,
  "id" | "username" | "profile_image_url" | "is_online" | "last_login"
>;

export interface FriendResponse {
  user: FriendSummary;
}

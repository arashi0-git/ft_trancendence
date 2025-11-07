import { PublicUser } from "../models/user";
import type { TwoFactorPurpose } from "../models/twoFactorChallenge";

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

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
  delivery: "email";
  destination?: string;
  expiresIn: number;
  message: string;
  purpose: TwoFactorPurpose;
  user?: PublicUser;
  token?: string;
}

export interface TwoFactorVerifyRequest {
  token: string;
  code: string;
}

export interface TwoFactorVerificationResponse extends AuthResponse {
  operation: TwoFactorPurpose;
  twoFactorEnabled?: boolean;
}

export interface TwoFactorResendRequest {
  token: string;
}

export interface EnableTwoFactorRequest {
  currentPassword: string;
}

export interface DisableTwoFactorRequest {
  currentPassword: string;
}

export interface UpdateUserProfileRequest {
  username?: string;
  email?: string;
  profile_image_url?: string | null;
  language?: string;
}

export interface UpdateUserSettingsRequest extends UpdateUserProfileRequest {
  currentPassword?: string;
  newPassword?: string;
}

export interface FriendUserRequest {
  username: string;
}

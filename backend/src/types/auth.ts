import type { TwoFactorPurpose } from "../models/twoFactorChallenge";
import type { PublicUser } from "./user";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
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

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  TwoFactorChallengeModel,
  TwoFactorChallengeRecord,
  TwoFactorPurpose,
} from "../models/twoFactorChallenge";
import { EmailService } from "./emailService";
import { UserWithoutPassword } from "../types/user";
import { UserService } from "./userService";
import { TwoFactorVerificationResponse } from "../types/auth";
import { AuthUtils } from "../utils/auth";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_TTL_SECONDS = Math.floor(CODE_TTL_MS / 1000);
const CODE_DIGITS = 6;

function generateNumericCode(): string {
  const max = 10 ** CODE_DIGITS;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(CODE_DIGITS, "0");
}

const PURPOSE_MESSAGES: Record<TwoFactorPurpose, string> = {
  login: "A verification code has been sent to your email address.",
  enable_2fa:
    "Enter the verification code we emailed you to turn on two-factor authentication.",
  disable_2fa:
    "Enter the verification code we emailed you to disable two-factor authentication.",
  email_change:
    "Enter the verification code we emailed you to confirm your email change.",
};

export interface TwoFactorChallengeDetails {
  requiresTwoFactor: boolean;
  twoFactorToken: string;
  destination?: string;
  expiresIn: number;
  message: string;
  purpose: TwoFactorPurpose;
  user?: UserWithoutPassword;
  token?: string;
}

function serializePayload(payload?: unknown): string | null {
  if (payload === undefined || payload === null) {
    return null;
  }

  try {
    return JSON.stringify(payload);
  } catch (error) {
    throw new Error(
      `Failed to serialize two-factor challenge payload: ${String(error)}`,
    );
  }
}

function parsePayload<T>(payload: string | null): T | null {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new Error(
      `Invalid two-factor challenge payload data: ${String(error)}`,
    );
  }
}

export class TwoFactorService {
  private static buildDetails(
    token: string,
    purpose: TwoFactorPurpose,
    overrides?: { message?: string; destination?: string },
  ): TwoFactorChallengeDetails {
    return {
      requiresTwoFactor: true,
      twoFactorToken: token,
      purpose,
      expiresIn: CODE_TTL_SECONDS,
      message: overrides?.message ?? PURPOSE_MESSAGES[purpose],
      destination: overrides?.destination,
    };
  }

  static async startChallenge(
    user: UserWithoutPassword,
    purpose: TwoFactorPurpose,
    options?: {
      payload?: unknown;
      deliveryEmail?: string;
      messageOverride?: string;
    },
  ): Promise<TwoFactorChallengeDetails> {
    const code = generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);
    const deliveryEmail =
      typeof options?.deliveryEmail === "string"
        ? options.deliveryEmail
        : user.email;

    const challengeId = await TwoFactorChallengeModel.create({
      userId: user.id,
      token,
      codeHash,
      purpose,
      expiresAt,
      payload: serializePayload(options?.payload),
    });

    try {
      await EmailService.sendTwoFactorCode(deliveryEmail, code);
    } catch (error) {
      await TwoFactorChallengeModel.deleteById(challengeId);
      throw error;
    }

    await TwoFactorChallengeModel.deleteByUserExcept(
      user.id,
      challengeId,
      purpose,
    );

    return this.buildDetails(token, purpose, {
      message: options?.messageOverride,
      destination: deliveryEmail,
    });
  }

  static async startLoginChallenge(
    user: UserWithoutPassword,
  ): Promise<TwoFactorChallengeDetails> {
    return this.startChallenge(user, "login");
  }

  static async resendChallenge(
    token: string,
  ): Promise<TwoFactorChallengeDetails> {
    await TwoFactorChallengeModel.deleteExpired();

    const existing = await TwoFactorChallengeModel.findByToken(token);
    if (!existing) {
      throw new Error("Invalid or expired verification token");
    }

    const user = await UserService.getUserById(existing.user_id);
    if (!user) {
      throw new Error("User not found for verification");
    }

    const payload = parsePayload<{ email?: string }>(existing.payload);
    const deliveryEmail =
      existing.purpose === "email_change" && payload?.email
        ? payload.email
        : user.email;
    const messageOverride =
      existing.purpose === "email_change" && payload?.email
        ? this.buildEmailChangeMessage(payload.email)
        : undefined;

    return this.startChallenge(user, existing.purpose, {
      payload: payload ?? undefined,
      deliveryEmail,
      messageOverride,
    });
  }

  static async verifyChallenge(
    token: string,
    code: string,
  ): Promise<{
    challenge: TwoFactorChallengeRecord;
    user: UserWithoutPassword;
  }> {
    await TwoFactorChallengeModel.deleteExpired();

    const challenge = await TwoFactorChallengeModel.findByToken(token);

    if (!challenge) {
      throw new Error("Invalid or expired verification token");
    }

    const expiresAt = new Date(challenge.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      await TwoFactorChallengeModel.deleteById(challenge.id);
      throw new Error("Verification code expired");
    }

    const isValidCode = await bcrypt.compare(code, challenge.code_hash);
    if (!isValidCode) {
      throw new Error("Invalid verification code");
    }

    await TwoFactorChallengeModel.deleteById(challenge.id);

    const user = await UserService.getUserById(challenge.user_id);
    if (!user) {
      throw new Error("User not found for verification");
    }

    return { challenge, user };
  }

  static parsePayload<T>(payload: string | null): T | null {
    return parsePayload<T>(payload);
  }

  static buildEmailChangeMessage(newEmail: string): string {
    return `We emailed a verification code to ${newEmail}. Enter it to confirm your new email address.`;
  }

  static async setup(userId: number): Promise<TwoFactorChallengeDetails> {
    const user = await UserService.getUserById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.name = "AUTH_USER_NOT_FOUND";
      throw error;
    }

    if (user.two_factor_enabled) {
      const error = new Error("Two-factor authentication is already enabled");
      error.name = "AUTH_2FA_ALREADY_ENABLED";
      throw error;
    }

    return this.startChallenge(user, "enable_2fa");
  }

  static async disable(userId: number): Promise<TwoFactorChallengeDetails> {
    const user = await UserService.getUserById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.name = "AUTH_USER_NOT_FOUND";
      throw error;
    }

    if (!user.two_factor_enabled) {
      const error = new Error("Two-factor authentication is not enabled");
      error.name = "AUTH_2FA_NOT_ENABLED";
      throw error;
    }

    return this.startChallenge(user, "disable_2fa");
  }

  static async verifyAndProcessChallenge(
    token: string,
    code: string,
  ): Promise<TwoFactorVerificationResponse> {
    const { challenge, user } = await this.verifyChallenge(token, code);

    let updatedUser = user;
    let issuedToken: string;

    switch (challenge.purpose) {
      case "login": {
        const loggedInUser =
          (await UserService.markUserLoggedIn(user.id)) ?? user;
        updatedUser = loggedInUser;
        issuedToken = AuthUtils.generateToken(updatedUser);
        break;
      }
      case "enable_2fa": {
        updatedUser = await UserService.setTwoFactorEnabledStatus(
          user.id,
          true,
        );
        issuedToken = AuthUtils.generateToken(updatedUser);
        break;
      }
      case "disable_2fa": {
        updatedUser = await UserService.setTwoFactorEnabledStatus(
          user.id,
          false,
        );
        issuedToken = AuthUtils.generateToken(updatedUser);
        break;
      }
      case "email_change": {
        const payload = this.parsePayload<{ email: string }>(challenge.payload);
        if (!payload?.email) {
          throw new Error("Pending email update data missing");
        }

        updatedUser = await UserService.applyEmailChange(
          user.id,
          payload.email,
        );
        issuedToken = AuthUtils.generateToken(updatedUser);
        break;
      }
      default: {
        throw new Error("Unsupported verification purpose");
      }
    }

    const response: TwoFactorVerificationResponse = {
      user: UserService.toPublicUser(updatedUser),
      token: issuedToken,
      operation: challenge.purpose,
    };

    if (challenge.purpose !== "login") {
      response.twoFactorEnabled = updatedUser.two_factor_enabled;
    }

    return response;
  }
}

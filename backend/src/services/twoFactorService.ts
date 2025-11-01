import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { TwoFactorChallengeModel } from "../models/twoFactorChallenge";
import { EmailService } from "./emailService";
import { UserWithoutPassword } from "../models/user";
import { UserService } from "./userService";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_TTL_SECONDS = Math.floor(CODE_TTL_MS / 1000);
const CODE_DIGITS = 6;

function generateNumericCode(): string {
  const max = 10 ** CODE_DIGITS;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(CODE_DIGITS, "0");
}

const DELIVERY_METHOD = "email" as const;

const LOGIN_CHALLENGE_MESSAGE =
  "A verification code has been sent to your email address.";

export interface TwoFactorChallengeDetails {
  token: string;
  delivery: typeof DELIVERY_METHOD;
  expiresIn: number;
  message: string;
}

export class TwoFactorService {
  static async startChallenge(
    user: UserWithoutPassword,
  ): Promise<TwoFactorChallengeDetails> {
    const code = generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    const challengeId = await TwoFactorChallengeModel.create({
      userId: user.id,
      token,
      codeHash,
      expiresAt,
    });

    try {
      await EmailService.sendTwoFactorCode(user.email, code);
    } catch (error) {
      await TwoFactorChallengeModel.deleteById(challengeId);
      throw error;
    }

    await TwoFactorChallengeModel.deleteByUserExcept(user.id, challengeId);

    return {
      token,
      delivery: DELIVERY_METHOD,
      expiresIn: CODE_TTL_SECONDS,
      message: LOGIN_CHALLENGE_MESSAGE,
    };
  }

  static async resendChallenge(
    token: string,
  ): Promise<TwoFactorChallengeDetails> {
    await TwoFactorChallengeModel.deleteExpired();

    const existing = await TwoFactorChallengeModel.findByToken(token);
    if (!existing) {
      throw new Error("Invalid or expired verification token");
    }

    if (existing.purpose !== "login") {
      throw new Error("Only login challenges can be resent");
    }

    const user = await UserService.getUserById(existing.user_id);
    if (!user) {
      throw new Error("User not found for verification");
    }

    return this.startChallenge(user);
  }

  static async verifyChallenge(
    token: string,
    code: string,
  ): Promise<UserWithoutPassword> {
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

    const loggedInUser =
      (await UserService.markUserLoggedIn(challenge.user_id)) ?? null;

    if (!loggedInUser) {
      throw new Error("User not found for verification");
    }

    return loggedInUser;
  }
}

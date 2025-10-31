import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  TwoFactorChallengeModel,
  TwoFactorPurpose,
} from "../models/twoFactorChallenge";
import { EmailService } from "./emailService";
import { UserModel, UserWithoutPassword } from "../models/user";
import { UserService } from "./userService";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_DIGITS = 6;

function generateNumericCode(): string {
  const max = 10 ** CODE_DIGITS;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(CODE_DIGITS, "0");
}

export class TwoFactorService {
  static async startChallenge(
    user: UserWithoutPassword,
    purpose: TwoFactorPurpose,
  ): Promise<{ token: string }> {
    const code = generateNumericCode();
    const codeHash = await bcrypt.hash(code, 10);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await TwoFactorChallengeModel.deleteByUserAndPurpose(user.id, purpose);
    await TwoFactorChallengeModel.create({
      userId: user.id,
      token,
      codeHash,
      purpose,
      expiresAt,
    });

    await EmailService.sendTwoFactorCode(user.email, code);

    return { token };
  }

  static async verifyChallenge(
    token: string,
    code: string,
  ): Promise<
    | { purpose: "login"; user: UserWithoutPassword }
    | { purpose: "enable" | "disable"; user: UserWithoutPassword }
  > {
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

    const userRecord = await UserModel.findById(challenge.user_id);
    if (!userRecord) {
      throw new Error("User not found for verification");
    }

    switch (challenge.purpose as TwoFactorPurpose) {
      case "login": {
        const refreshed = await UserService.markUserLoggedIn(userRecord.id);
        if (!refreshed) {
          throw new Error("Failed to refresh user after verification");
        }
        return { purpose: "login", user: refreshed };
      }
      case "enable": {
        await UserModel.setTwoFactorEnabled(userRecord.id, true);
        const refreshed = await UserService.getUserById(userRecord.id);
        if (!refreshed) {
          throw new Error("Failed to refresh user after enabling 2FA");
        }
        return { purpose: "enable", user: refreshed };
      }
      case "disable": {
        await UserModel.setTwoFactorEnabled(userRecord.id, false);
        const refreshed = await UserService.getUserById(userRecord.id);
        if (!refreshed) {
          throw new Error("Failed to refresh user after disabling 2FA");
        }
        return { purpose: "disable", user: refreshed };
      }
      default: {
        throw new Error("Unsupported verification purpose");
      }
    }
  }

  static async cancelChallenges(
    userId: number,
    purpose?: TwoFactorPurpose,
  ): Promise<void> {
    if (purpose) {
      await TwoFactorChallengeModel.deleteByUserAndPurpose(userId, purpose);
      return;
    }

    await Promise.all(
      ["login", "enable", "disable"].map((value) =>
        TwoFactorChallengeModel.deleteByUserAndPurpose(
          userId,
          value as TwoFactorPurpose,
        ),
      ),
    );
  }
}

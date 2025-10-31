import { db } from "../database/connection";

export type TwoFactorPurpose = "login" | "enable" | "disable";

export interface TwoFactorChallengeRecord {
  id: number;
  user_id: number;
  token: string;
  code_hash: string;
  purpose: string;
  expires_at: string;
  created_at: string;
}

export class TwoFactorChallengeModel {
  static async create(params: {
    userId: number;
    token: string;
    codeHash: string;
    purpose: TwoFactorPurpose;
    expiresAt: Date;
  }): Promise<void> {
    await db.run(
      `INSERT INTO two_factor_challenges (user_id, token, code_hash, purpose, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.token,
        params.codeHash,
        params.purpose,
        params.expiresAt.toISOString(),
      ],
    );
  }

  static async findByToken(
    token: string,
  ): Promise<TwoFactorChallengeRecord | null> {
    const record = await db.get<TwoFactorChallengeRecord>(
      `SELECT * FROM two_factor_challenges WHERE token = ?`,
      [token],
    );
    return record ?? null;
  }

  static async deleteById(id: number): Promise<void> {
    await db.run(`DELETE FROM two_factor_challenges WHERE id = ?`, [id]);
  }

  static async deleteByUserAndPurpose(
    userId: number,
    purpose: TwoFactorPurpose,
  ): Promise<void> {
    await db.run(
      `DELETE FROM two_factor_challenges WHERE user_id = ? AND purpose = ?`,
      [userId, purpose],
    );
  }

  static async deleteExpired(now: Date = new Date()): Promise<void> {
    await db.run(`DELETE FROM two_factor_challenges WHERE expires_at < ?`, [
      now.toISOString(),
    ]);
  }
}

import { db } from "../database/connection";

export interface TwoFactorChallengeRecord {
  id: number;
  user_id: number;
  token: string;
  code_hash: string;
  purpose: "login";
  expires_at: string;
  created_at: string;
}

export class TwoFactorChallengeModel {
  static async create(params: {
    userId: number;
    token: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<number> {
    const result = await db.run(
      `INSERT INTO two_factor_challenges (user_id, token, code_hash, purpose, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.token,
        params.codeHash,
        "login",
        params.expiresAt.toISOString(),
      ],
    );

    return typeof result.lastInsertRowid === "bigint"
      ? Number(result.lastInsertRowid)
      : result.lastInsertRowid;
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

  static async deleteByUser(userId: number): Promise<void> {
    await db.run(`DELETE FROM two_factor_challenges WHERE user_id = ?`, [
      userId,
    ]);
  }

  static async deleteByUserExcept(
    userId: number,
    excludeId: number,
  ): Promise<void> {
    await db.run(
      `DELETE FROM two_factor_challenges WHERE user_id = ? AND id != ?`,
      [userId, excludeId],
    );
  }

  static async deleteExpired(now: Date = new Date()): Promise<void> {
    await db.run(`DELETE FROM two_factor_challenges WHERE expires_at < ?`, [
      now.toISOString(),
    ]);
  }
}

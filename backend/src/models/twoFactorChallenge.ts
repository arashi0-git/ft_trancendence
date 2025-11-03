import { db } from "../database/connection";

export type TwoFactorPurpose =
  | "login"
  | "enable_2fa"
  | "disable_2fa"
  | "email_change";

export interface TwoFactorChallengeRecord {
  id: number;
  user_id: number;
  token: string;
  code_hash: string;
  purpose: TwoFactorPurpose;
  payload: string | null;
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
    payload?: string | null;
  }): Promise<number> {
    const result = await db.run(
      `INSERT INTO two_factor_challenges (user_id, token, code_hash, purpose, payload, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.token,
        params.codeHash,
        params.purpose,
        params.payload ?? null,
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

  static async deleteByUser(
    userId: number,
    purpose?: TwoFactorPurpose,
  ): Promise<void> {
    const params: Array<number | TwoFactorPurpose> = [userId];
    let query = `DELETE FROM two_factor_challenges WHERE user_id = ?`;

    if (purpose) {
      query += ` AND purpose = ?`;
      params.push(purpose);
    }

    await db.run(query, params);
  }

  static async deleteByUserExcept(
    userId: number,
    excludeId: number,
    purpose?: TwoFactorPurpose,
  ): Promise<void> {
    const params: Array<number | TwoFactorPurpose> = [userId, excludeId];
    let query = `DELETE FROM two_factor_challenges WHERE user_id = ? AND id != ?`;

    if (purpose) {
      query += ` AND purpose = ?`;
      params.push(purpose);
    }

    await db.run(query, params);
  }

  static async deleteExpired(now: Date = new Date()): Promise<void> {
    await db.run(`DELETE FROM two_factor_challenges WHERE expires_at < ?`, [
      now.toISOString(),
    ]);
  }
}

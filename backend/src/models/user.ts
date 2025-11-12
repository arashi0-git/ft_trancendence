import { db } from "../database/connection";
import { UserWithoutPassword, PublicUser } from "../types/user";

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  profile_image_url: string | null;
  password_hash: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
  token_version: number;
  two_factor_enabled: number;
  language: string;
}

export interface CreateUserParams {
  username: string;
  email: string;
  passwordHash: string;
}

export function stripPassword(user: UserRecord): UserWithoutPassword {
  const { password_hash: _password_hash, two_factor_enabled, ...rest } = user;
  return {
    ...rest,
    two_factor_enabled: Boolean(two_factor_enabled),
  };
}

export function toPublicUser(user: UserWithoutPassword): PublicUser {
  const { token_version: _token_version, ...publicUser } = user;
  return publicUser;
}

export class UserModel {
  static async create(params: CreateUserParams): Promise<UserRecord> {
    await db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [params.username, params.email, params.passwordHash],
    );

    const user =
      (await db.get<UserRecord>(
        `SELECT * FROM users WHERE id = last_insert_rowid()`,
      )) || null;

    if (!user) {
      throw new Error("Failed to retrieve user after creation.");
    }

    return user;
  }

  static async findByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return (await db.get("SELECT * FROM users WHERE LOWER(email) = ?", [
      normalizedEmail,
    ])) as UserRecord | null;
  }

  static async findByUsername(username: string): Promise<UserRecord | null> {
    const normalizedUsername = username.trim().toLowerCase();
    return (await db.get("SELECT * FROM users WHERE LOWER(username) = ?", [
      normalizedUsername,
    ])) as UserRecord | null;
  }

  static async findById(id: number): Promise<UserRecord | null> {
    return (await db.get("SELECT * FROM users WHERE id = ?", [
      id,
    ])) as UserRecord | null;
  }

  static async updateLoginMetadata(id: number): Promise<void> {
    await db.run(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP, is_online = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
    );
  }

  static async setOnlineStatus(id: number, isOnline: boolean): Promise<void> {
    if (isOnline) {
      await db.run(
        "UPDATE users SET is_online = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id],
      );
      return;
    }

    await db.run(
      "UPDATE users SET is_online = 0, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id],
    );
  }

  static async updateProfile(
    id: number,
    updates: Partial<
      Record<
        "username" | "email" | "profile_image_url" | "language",
        string | null
      >
    >,
  ): Promise<void> {
    const allowedKeys: Array<keyof typeof updates> = [
      "username",
      "email",
      "profile_image_url",
      "language",
    ];

    const filteredEntries = Object.entries(updates).filter(
      ([key, value]) =>
        allowedKeys.includes(key as keyof typeof updates) &&
        value !== undefined,
    );

    if (filteredEntries.length === 0) {
      return;
    }

    const setClause = filteredEntries.map(([key]) => `${key} = ?`).join(", ");
    const values = filteredEntries.map(([, value]) => {
      if (value === null) {
        return null;
      }
      if (typeof value === "string") {
        return value.trim();
      }
      return value;
    });

    await db.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id],
    );
  }

  static async updatePasswordHash(
    id: number,
    passwordHash: string,
  ): Promise<void> {
    await db.run(
      "UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, id],
    );
  }

  static async setTwoFactorEnabled(
    id: number,
    enabled: boolean,
  ): Promise<void> {
    await db.run(
      "UPDATE users SET two_factor_enabled = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [enabled ? 1 : 0, id],
    );
  }
}

import { db } from "../database/connection";

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  last_login: string | null;
  token_version: number;
}

export interface CreateUserParams {
  username: string;
  email: string;
  passwordHash: string;
}

export type UserWithoutPassword = Omit<UserRecord, "password_hash">;
export type PublicUser = Omit<UserWithoutPassword, "token_version">;

export function stripPassword(user: UserRecord): UserWithoutPassword {
  const { password_hash, ...rest } = user;
  return rest;
}

export function toPublicUser(user: UserWithoutPassword): PublicUser {
  const { token_version, ...publicUser } = user;
  return publicUser;
}

export class UserModel {
  static async create(params: CreateUserParams): Promise<UserRecord> {
    db.run(
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
    return (await db.get("SELECT * FROM users WHERE email = ?", [
      email,
    ])) as UserRecord | null;
  }

  static async findByUsername(username: string): Promise<UserRecord | null> {
    return (await db.get("SELECT * FROM users WHERE username = ?", [
      username,
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
    updates: Partial<Pick<UserRecord, "username" | "email">>,
  ): Promise<void> {
    const allowedKeys: Array<keyof typeof updates> = ["username", "email"];
    const filteredEntries = Object.entries(updates).filter(
      ([key, value]) =>
        allowedKeys.includes(key as keyof typeof updates) &&
        typeof value === "string" &&
        value.trim().length > 0,
    );

    if (filteredEntries.length === 0) {
      return;
    }

    const setClause = filteredEntries.map(([key]) => `${key} = ?`).join(", ");
    const values = filteredEntries.map(([, value]) => (value as string).trim());

    await db.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id],
    );
  }
}

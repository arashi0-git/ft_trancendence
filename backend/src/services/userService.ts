import { db } from "../database/connection";
import { User, CreateUserRequest, UserProfile } from "../types/user";
import { AuthUtils } from "../utils/auth";

export class UserService {
  static async createUser(userData: CreateUserRequest): Promise<UserProfile> {
    const { username, email, password } = userData;

    const passwordHash = await AuthUtils.hashPassword(password);

    try {
      await db.run(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [username, email, passwordHash],
      );
    } catch (error: any) {
      // Handle UNIQUE constraint violations
      if (
        error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
        error.message?.includes("UNIQUE constraint failed")
      ) {
        if (error.message?.includes("users.email")) {
          throw new Error("User with this email already exists");
        } else if (error.message?.includes("users.username")) {
          throw new Error("User with this username already exists");
        } else {
          throw new Error("User with this email or username already exists");
        }
      }
      throw error;
    }

    const user = (await db.get(
      "SELECT id, username, email, created_at, is_online, last_login, token_version FROM users WHERE email = ?",
      [email],
    )) as UserProfile & { token_version: number };

    return user;
  }

  static async authenticateUser(
    email: string,
    password: string,
  ): Promise<UserProfile | null> {
    const user = (await db.get("SELECT * FROM users WHERE email = ?", [
      email,
    ])) as User;

    if (!user) {
      return null;
    }

    const isValidPassword = await AuthUtils.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isValidPassword) {
      return null;
    }

    await db.run(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP, is_online = TRUE WHERE id = ?",
      [user.id],
    );

    const updatedUser = (await db.get(
      "SELECT id, username, email, created_at, is_online, last_login, token_version FROM users WHERE id = ?",
      [user.id],
    )) as UserProfile & { token_version: number };

    return updatedUser;
  }

  static async getUserById(id: number): Promise<UserProfile | null> {
    const user = (await db.get(
      "SELECT id, username, email, created_at, is_online, last_login, token_version FROM users WHERE id = ?",
      [id],
    )) as UserProfile & { token_version?: number };

    return user || null;
  }

  static async updateUserOnlineStatus(
    id: number,
    isOnline: boolean,
  ): Promise<void> {
    // If logging out, increment token version to invalidate existing tokens
    if (!isOnline) {
      await db.run(
        "UPDATE users SET is_online = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [isOnline ? 1 : 0, id],
      );
    } else {
      await db.run(
        "UPDATE users SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [isOnline ? 1 : 0, id],
      );
    }
  }

  static async updateUserProfile(
    id: number,
    updates: Partial<Pick<User, "username" | "email">>,
  ): Promise<UserProfile> {
    const allowed = ["username", "email"] as const;
    const entries = Object.entries(updates)
      .filter(
        ([k, v]) =>
          allowed.includes(k as any) &&
          typeof v === "string" &&
          v.trim().length > 0,
      )
      .map<[string, string]>(([k, v]) => [k, (v as string).trim()]);

    if (entries.length === 0) {
      const current = await this.getUserById(id);
      if (!current) throw new Error("User not found");
      return current;
    }

    const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
    const values = entries.map(([, v]) => v);

    await db.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id],
    );

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error("User not found after update");
    }

    return updatedUser;
  }
}

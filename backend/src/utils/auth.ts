import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserWithoutPassword } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}
const SALT_ROUNDS = 12;

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(user: UserWithoutPassword): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        tokenVersion: user.token_version ?? 0,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  static extractTokenFromHeader(authorization?: string): string | null {
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return null;
    }
    return authorization.substring(7);
  }
}

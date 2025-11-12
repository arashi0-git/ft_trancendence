import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserWithoutPassword } from "../types/user";

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
}
const SALT_ROUNDS = 12;

export interface AuthTokenPayload extends jwt.JwtPayload {
  id: number;
  username: string;
  email: string;
  tokenVersion: number;
}

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

  static verifyToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }

    const payload = decoded as AuthTokenPayload;

    if (
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.tokenVersion !== "number"
    ) {
      throw new Error("Invalid token payload");
    }

    return payload;
  }

  static extractTokenFromHeader(authorization?: string): string | null {
    // if request isn't from a login user
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return null;
    }
    return authorization.substring(7);
  }
}

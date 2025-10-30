import {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  UserProfile,
} from "../types/user";
import { UserService } from "./userService";
import { AuthUtils } from "../utils/auth";

export class AuthService {
  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      const userRecord = await UserService.createUser(userData);
      const token = AuthUtils.generateToken(userRecord);
      const user = UserService.toPublicUser(userRecord);

      // Log successful registration for security audit
      console.info(`User registered successfully: ${user.id}`);

      return { user, token };
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse | null> {
    const userRecord = await UserService.authenticateUser(
      credentials.email,
      credentials.password,
    );

    if (!userRecord) {
      console.warn(`Failed login attempt for email: ${credentials.email}`);
      return null;
    }

    const token = AuthUtils.generateToken(userRecord);
    const user = UserService.toPublicUser(userRecord);
    await UserService.updateUserOnlineStatus(userRecord.id, true);
    console.info(`User logged in successfully: ${userRecord.id}`);
    return { user, token };
  }

  static async getProfile(userId: number): Promise<UserProfile | null> {
    return UserService.getPublicProfileById(userId);
  }

  static async logout(userId: number, token?: string | null): Promise<void> {
    try {
      // If a token is provided, ensure it belongs to the user calling logout.
      // This prevents invalidation requests for other users.
      if (token) {
        const decoded = AuthUtils.verifyToken(token);
        if (!decoded || decoded.id !== userId) {
          throw new Error("Token does not belong to the given user");
        }
      }

      // Existing behavior: set user offline and increment token_version to invalidate existing tokens.
      await UserService.updateUserOnlineStatus(userId, false);
    } catch (error) {
      // Propagate error so the route can log and return an appropriate response.
      throw error;
    }
  }
}

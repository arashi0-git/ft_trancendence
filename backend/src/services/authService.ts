import {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  UserProfile,
  TwoFactorChallengeResponse,
} from "../types/user";
import { UserService } from "./userService";
import { AuthUtils } from "../utils/auth";
import { TwoFactorService } from "./twoFactorService";

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

  static async login(
    credentials: LoginRequest,
  ): Promise<AuthResponse | TwoFactorChallengeResponse | null> {
    const userRecord = await UserService.authenticateUser(
      credentials.email,
      credentials.password,
    );

    if (!userRecord) {
      console.warn(`Failed login attempt for email: ${credentials.email}`);
      return null;
    }

    if (userRecord.two_factor_enabled) {
      const challenge = await TwoFactorService.startChallenge(userRecord);
      console.info(`2FA challenge issued for user: ${userRecord.id}`);
      return {
        requiresTwoFactor: true,
        twoFactorToken: challenge.token,
        delivery: challenge.delivery,
        expiresIn: challenge.expiresIn,
        message: challenge.message,
      };
    }

    const loggedIn =
      (await UserService.markUserLoggedIn(userRecord.id)) ?? userRecord;

    const token = AuthUtils.generateToken(loggedIn);
    const user = UserService.toPublicUser(loggedIn);
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

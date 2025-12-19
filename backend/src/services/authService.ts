import { CreateUserRequest, PublicUser } from "../types/user";
import { LoginRequest, AuthResponse } from "../types/auth";
import { UserService } from "./userService";
import { AuthUtils } from "../utils/auth";
import {
  TwoFactorService,
  TwoFactorChallengeDetails,
} from "./twoFactorService";

export class AuthService {
  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      const createdUser = await UserService.createUser(userData);
      await UserService.updateUserOnlineStatus(createdUser.id, true);
      const updatedUser = await UserService.getUserById(createdUser.id);
      const token = AuthUtils.generateToken(updatedUser ?? createdUser);
      const user = UserService.toPublicUser(updatedUser ?? createdUser);

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
  ): Promise<AuthResponse | TwoFactorChallengeDetails | null> {
    const authenticatedUser = await UserService.authenticateUser(
      credentials.email,
      credentials.password,
    );

    if (!authenticatedUser) {
      console.warn(`Failed login attempt for email: ${credentials.email}`);
      return null;
    }

    if (authenticatedUser.two_factor_enabled) {
      const challenge =
        await TwoFactorService.startLoginChallenge(authenticatedUser);
      console.info(`2FA challenge issued for user: ${authenticatedUser.id}`);
      return challenge;
    }

    const loggedIn =
      (await UserService.markUserLoggedIn(authenticatedUser.id)) ??
      authenticatedUser;

    const token = AuthUtils.generateToken(loggedIn);
    const user = UserService.toPublicUser(loggedIn);
    console.info(`User logged in successfully: ${authenticatedUser.id}`);
    return { user, token };
  }

  static async getProfile(userId: number): Promise<PublicUser | null> {
    return UserService.getPublicProfileById(userId);
  }

  static async logout(userId: number, token?: string | null): Promise<void> {
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
  }
}

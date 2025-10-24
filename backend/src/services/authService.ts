import { CreateUserRequest, LoginRequest, AuthResponse, UserProfile } from "../types/user";
import { UserService } from "./userService";
import { AuthUtils } from "../utils/auth";

export class AuthService {
  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const userRecord = await UserService.createUser(userData);
    const token = AuthUtils.generateToken(userRecord);
    const user = UserService.toPublicUser(userRecord);

    return { user, token };
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse | null> {
    const userRecord = await UserService.authenticateUser(
      credentials.email,
      credentials.password,
    );

    if (!userRecord) {
      return null;
    }

    const token = AuthUtils.generateToken(userRecord);
    const user = UserService.toPublicUser(userRecord);
    return { user, token };
  }

  static async getProfile(userId: number): Promise<UserProfile | null> {
    return UserService.getPublicProfileById(userId);
  }

  static async logout(userId: number): Promise<void> {
    await UserService.updateUserOnlineStatus(userId, false);
  }
}

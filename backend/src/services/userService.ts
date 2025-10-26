import {
  UserModel,
  UserWithoutPassword,
  stripPassword,
  toPublicUser,
} from "../models/User";
import { CreateUserRequest, UserProfile } from "../types/user";
import { AuthUtils } from "../utils/auth";

export class UserService {
  static toPublicUser(user: UserWithoutPassword): UserProfile {
    return toPublicUser(user);
  }

  static async createUser(
    userData: CreateUserRequest,
  ): Promise<UserWithoutPassword> {
    try {
      if (await UserModel.findByEmail(userData.email)) {
        throw new Error("User with this email already exists");
      }
      if (await UserModel.findByUsername(userData.username)) {
        throw new Error("User with this username already exists");
      }

      const passwordHash = await AuthUtils.hashPassword(userData.password);
      const newUser = await UserModel.create({
        username: userData.username,
        email: userData.email,
        passwordHash,
      });

      return stripPassword(newUser);
    } catch (error: any) {
      if (
        error.message?.includes("UNIQUE constraint failed") // Fallback for race conditions
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
  }

  static async authenticateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return null; // User not found
    }

    const isValidPassword = await AuthUtils.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return null; // Invalid password
    }

    await UserModel.updateLoginMetadata(user.id);

    const updatedUser = await UserModel.findById(user.id);
    if (!updatedUser) return null; // Should not happen

    return stripPassword(updatedUser);
  }

  static async getUserById(id: number): Promise<UserWithoutPassword | null> {
    const user = await UserModel.findById(id);
    if (!user) {
      return null;
    }

    return stripPassword(user);
  }

  static async updateUserOnlineStatus(
    id: number,
    isOnline: boolean,
  ): Promise<void> {
    await UserModel.setOnlineStatus(id, isOnline);
  }

  static async updateUserProfile(
    id: number,
    updates: Partial<Pick<UserWithoutPassword, "username" | "email">>,
  ): Promise<UserWithoutPassword> {
    await UserModel.updateProfile(id, updates);

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error("User not found after update");
    }

    return updatedUser;
  }

  static async getPublicProfileById(
    id: number,
  ): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    return user ? this.toPublicUser(user) : null;
  }
}

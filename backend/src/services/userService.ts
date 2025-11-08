import {
  UserModel,
  UserWithoutPassword,
  stripPassword,
  toPublicUser,
} from "../models/user";
import {
  CreateUserRequest,
  UserProfile,
  UpdateUserProfileRequest,
  UpdateUserSettingsRequest,
} from "../types/user";
import { AuthUtils } from "../utils/auth";

export class UserService {
  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static validateEmailFormat(email: string): void {
    if (email.length === 0) {
      throw new Error("Email cannot be empty");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }
  }

  static async validateEmailChange(
    currentUser: UserWithoutPassword,
    candidateEmail: string,
  ): Promise<string> {
    const normalized = this.normalizeEmail(candidateEmail);
    this.validateEmailFormat(normalized);

    if (normalized === currentUser.email.toLowerCase()) {
      return normalized;
    }

    const userWithSameEmail = await UserModel.findByEmail(normalized);
    if (userWithSameEmail && userWithSameEmail.id !== currentUser.id) {
      throw new Error("Email is already in use");
    }

    return normalized;
  }

  static async applyEmailChange(
    userId: number,
    newEmail: string,
  ): Promise<UserWithoutPassword> {
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const currentUser = stripPassword(existingUser);
    const normalizedEmail = await this.validateEmailChange(
      currentUser,
      newEmail,
    );

    if (normalizedEmail !== currentUser.email.toLowerCase()) {
      await UserModel.updateProfile(userId, { email: normalizedEmail });
    }

    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error("User not found after email update");
    }

    return updatedUser;
  }

  static async setTwoFactorEnabledStatus(
    userId: number,
    enabled: boolean,
  ): Promise<UserWithoutPassword> {
    await UserModel.setTwoFactorEnabled(userId, enabled);
    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error("User not found after updating two-factor status");
    }
    return updatedUser;
  }

  static toPublicUser(user: UserWithoutPassword): UserProfile {
    return toPublicUser(user);
  }

  static async createUser(
    userData: CreateUserRequest,
  ): Promise<UserWithoutPassword> {
    try {
      const normalizedUsername = userData.username.trim();
      const normalizedEmail = this.normalizeEmail(userData.email);

      if (await UserModel.findByEmail(normalizedEmail)) {
        throw new Error("User with this email already exists");
      }
      if (await UserModel.findByUsername(normalizedUsername)) {
        throw new Error("User with this username already exists");
      }

      const passwordHash = await AuthUtils.hashPassword(userData.password);
      const newUser = await UserModel.create({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      });

      return stripPassword(newUser);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed") // Fallback for race conditions
      ) {
        if (error.message.includes("users.email")) {
          throw new Error("User with this email already exists");
        } else if (error.message.includes("users.username")) {
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

    const isValidPassword = await AuthUtils.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isValidPassword) {
      return null; // Invalid password
    }

    return stripPassword(user);
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

  static async markUserLoggedIn(
    id: number,
  ): Promise<UserWithoutPassword | null> {
    await UserModel.updateLoginMetadata(id);
    const refreshedUser = await UserModel.findById(id);
    return refreshedUser ? stripPassword(refreshedUser) : null;
  }

  static async verifyUserPassword(
    id: number,
    password: string,
  ): Promise<boolean> {
    const user = await UserModel.findById(id);
    if (!user) {
      return false;
    }

    return AuthUtils.verifyPassword(password, user.password_hash);
  }

  static async updateUserProfile(
    id: number,
    updates: UpdateUserProfileRequest,
  ): Promise<UserWithoutPassword> {
    const existingUser = await UserModel.findById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const existingUserWithoutPassword = stripPassword(existingUser);

    const profileUpdates: Partial<
      Record<
        "username" | "email" | "profile_image_url" | "language",
        string | null
      >
    > = {};

    if (typeof updates.username === "string") {
      const trimmedUsername = updates.username.trim();

      if (trimmedUsername.length === 0) {
        throw new Error("Username cannot be empty");
      }

      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        throw new Error("Username must be between 3 and 20 characters");
      }

      if (trimmedUsername !== existingUser.username) {
        const userWithSameUsername =
          await UserModel.findByUsername(trimmedUsername);
        if (userWithSameUsername && userWithSameUsername.id !== id) {
          throw new Error("Username is already taken");
        }
      }

      profileUpdates.username = trimmedUsername;
    }

    if (typeof updates.email === "string") {
      const normalizedEmail = await this.validateEmailChange(
        existingUserWithoutPassword,
        updates.email,
      );
      profileUpdates.email = normalizedEmail;
    }

    if (updates.profile_image_url !== undefined) {
      const value = updates.profile_image_url;

      if (value === null || value.trim().length === 0) {
        profileUpdates.profile_image_url = null;
      } else {
        const trimmedValue = value.trim();

        if (trimmedValue.length > 2048) {
          throw new Error("Profile image URL must be 2048 characters or fewer");
        }

        if (!trimmedValue.startsWith("/uploads/avatars/")) {
          throw new Error(
            "Profile image URL must reference an uploaded avatar path",
          );
        }

        profileUpdates.profile_image_url = trimmedValue;
      }
    }

    if (typeof updates.language === "string") {
      const trimmedLanguage = updates.language.trim();
      const validLanguages = ["en", "cs", "jp"];

      if (!validLanguages.includes(trimmedLanguage)) {
        throw new Error("Invalid language. Must be one of: en, cs, jp");
      }

      profileUpdates.language = trimmedLanguage;
    }

    if (Object.keys(profileUpdates).length === 0) {
      return existingUserWithoutPassword;
    }

    try {
      await UserModel.updateProfile(id, profileUpdates);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        if (error.message.includes("users.username")) {
          throw new Error("Username is already taken");
        }
        if (error.message.includes("users.email")) {
          throw new Error("Email is already in use");
        }
      }
      throw error;
    }

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) {
      throw new Error("User not found after update");
    }

    return updatedUser;
  }

  static async updateUserPassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await AuthUtils.verifyPassword(
      currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const newPasswordHash = await AuthUtils.hashPassword(newPassword);
    await UserModel.updatePasswordHash(id, newPasswordHash);
  }

  static async updateUserSettings(
    id: number,
    updates: UpdateUserSettingsRequest,
  ): Promise<{ user: UserWithoutPassword; token?: string }> {
    const profileUpdates: UpdateUserProfileRequest = {};
    let profileUpdated = false;

    if (Object.prototype.hasOwnProperty.call(updates, "username")) {
      profileUpdates.username = updates.username;
      profileUpdated = true;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      profileUpdates.email = updates.email;
      profileUpdated = true;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "profile_image_url")) {
      profileUpdates.profile_image_url = updates.profile_image_url ?? null;
      profileUpdated = true;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "language")) {
      profileUpdates.language = updates.language;
      profileUpdated = true;
    }

    let updatedUser: UserWithoutPassword | null = null;
    if (profileUpdated) {
      updatedUser = await this.updateUserProfile(id, profileUpdates);
    }

    const passwordProvided =
      updates.currentPassword !== undefined ||
      updates.newPassword !== undefined;

    if (passwordProvided) {
      if (!updates.currentPassword || !updates.newPassword) {
        throw new Error(
          "Current password and new password are required to change password",
        );
      }

      await this.updateUserPassword(
        id,
        updates.currentPassword,
        updates.newPassword,
      );

      // fetch updated user to ensure token_version is fresh
      updatedUser = await this.getUserById(id);
    }

    if (!updatedUser) {
      updatedUser = await this.getUserById(id);
    }

    if (!updatedUser) {
      throw new Error("User not found after update");
    }

    const shouldIssueNewToken = profileUpdated || passwordProvided;
    const token = shouldIssueNewToken
      ? AuthUtils.generateToken(updatedUser)
      : undefined;

    return { user: updatedUser, token };
  }

  static async getPublicProfileById(id: number): Promise<UserProfile | null> {
    const user = await this.getUserById(id);
    return user ? this.toPublicUser(user) : null;
  }
}

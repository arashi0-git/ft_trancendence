import { promises as fsPromises } from "fs";
import path from "path";
import { FriendModel } from "../models/friend";
import { UserModel, stripPassword } from "../models/user";
import { UserWithoutPassword } from "../types/user";

function isSqliteConstraintViolation(
  error: unknown,
): error is { code?: string; errno?: number } {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as Record<string, unknown>;
  return maybeError.code === "SQLITE_CONSTRAINT" || maybeError.errno === 19;
}

export class FriendService {
  static async listFriends(userId: number): Promise<UserWithoutPassword[]> {
    const users = await FriendModel.getFriends(userId);
    return Promise.all(
      users.map((user) => this.sanitizeProfileImage(stripPassword(user))),
    );
  }

  static async addFriendByUsername(
    userId: number,
    username: string,
  ): Promise<UserWithoutPassword> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      throw new Error("Username is required");
    }

    const targetUser = await UserModel.findByUsername(normalizedUsername);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.id === userId) {
      throw new Error("You cannot add yourself as a friend");
    }

    const alreadyFriend = await FriendModel.isFriend(userId, targetUser.id);

    if (alreadyFriend) {
      throw new Error("You are already friends with this user");
    }

    try {
      await FriendModel.addFriend(userId, targetUser.id);
    } catch (error) {
      if (isSqliteConstraintViolation(error)) {
        throw new Error("You are already friends with this user");
      }
      throw error;
    }

    return await this.sanitizeProfileImage(stripPassword(targetUser));
  }

  static async removeFriend(userId: number, friendId: number): Promise<void> {
    const targetUser = await UserModel.findById(friendId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await FriendModel.removeFriend(userId, friendId);
  }

  static toFriendSummaries(users: UserWithoutPassword[]) {
    return users.map((user) => this.toFriendSummary(user));
  }

  static toFriendSummary(user: UserWithoutPassword) {
    return {
      id: user.id,
      username: user.username,
      profile_image_url: user.profile_image_url,
      is_online: user.is_online,
      last_login: user.last_login,
    };
  }

  private static async sanitizeProfileImage(
    user: UserWithoutPassword,
  ): Promise<UserWithoutPassword> {
    if (user.profile_image_url) {
      const normalizedPath = user.profile_image_url.replace(/^\/+/, "");
      const uploadsDir = path.resolve(process.cwd(), "uploads", "avatars");
      const filePath = path.resolve(process.cwd(), normalizedPath);
      const isWithinUploadsDir =
        filePath === uploadsDir || filePath.startsWith(uploadsDir + path.sep);

      if (!isWithinUploadsDir) {
        console.warn(
          `sanitizeProfileImage: attempted access outside uploads directory (${filePath})`,
        );
        return {
          ...user,
          profile_image_url: null,
        };
      }

      try {
        await fsPromises.access(filePath);
      } catch {
        return {
          ...user,
          profile_image_url: null,
        };
      }
    }
    return user;
  }
}

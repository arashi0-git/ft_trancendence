import { promises as fsPromises } from "fs";
import path from "path";
import { FollowModel } from "../models/follow";
import { UserModel, UserWithoutPassword, stripPassword } from "../models/user";

export class FollowService {
  static async listFollowing(userId: number): Promise<UserWithoutPassword[]> {
    const users = await FollowModel.getFollowingUsers(userId);
    return Promise.all(
      users.map((user) => this.sanitizeProfileImage(stripPassword(user))),
    );
  }

  static async followByUsername(
    followerId: number,
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

    if (targetUser.id === followerId) {
      throw new Error("You cannot follow yourself");
    }

    const alreadyFollowing = await FollowModel.isFollowing(
      followerId,
      targetUser.id,
    );

    if (alreadyFollowing) {
      throw new Error("You already follow this user");
    }

    try {
      await FollowModel.followUser(followerId, targetUser.id);
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT" || error.errno === 19) {
        throw new Error("You already follow this user");
      }
      throw error;
    }

    return await this.sanitizeProfileImage(stripPassword(targetUser));
  }

  static async unfollow(
    followerId: number,
    followingId: number,
  ): Promise<void> {
    const targetUser = await UserModel.findById(followingId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await FollowModel.unfollowUser(followerId, followingId);
  }

  static toFollowSummaries(users: UserWithoutPassword[]) {
    return users.map((user) => this.toFollowSummary(user));
  }

  static toFollowSummary(user: UserWithoutPassword) {
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

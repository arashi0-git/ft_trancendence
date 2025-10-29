import fs from "fs";
import path from "path";
import { FollowModel } from "../models/Follow";
import {
  UserModel,
  UserWithoutPassword,
  stripPassword,
  toPublicUser,
} from "../models/User";

export class FollowService {
  static async listFollowing(userId: number): Promise<UserWithoutPassword[]> {
    const users = await FollowModel.getFollowingUsers(userId);
    return users.map((user) => this.sanitizeProfileImage(stripPassword(user)));
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
      if (
        typeof error.message === "string" &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error("You already follow this user");
      }
      throw error;
    }

    return this.sanitizeProfileImage(stripPassword(targetUser));
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

  static toPublicUsers(users: UserWithoutPassword[]) {
    return users.map(toPublicUser);
  }

  static toPublicUser(user: UserWithoutPassword) {
    return toPublicUser(user);
  }

  private static sanitizeProfileImage(
    user: UserWithoutPassword,
  ): UserWithoutPassword {
    if (user.profile_image_url) {
      const normalizedPath = user.profile_image_url.replace(/^\/+/, "");
      const filePath = path.join(process.cwd(), normalizedPath);
      if (!fs.existsSync(filePath)) {
        return {
          ...user,
          profile_image_url: null,
        };
      }
    }
    return user;
  }
}

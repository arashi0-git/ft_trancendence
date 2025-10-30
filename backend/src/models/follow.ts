import { db } from "../database/connection";
import type { UserRecord } from "./user";

export class FollowModel {
  static async followUser(
    followerId: number,
    followingId: number,
  ): Promise<void> {
    db.run(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES (?, ?)`,
      [followerId, followingId],
    );
  }

  static async unfollowUser(
    followerId: number,
    followingId: number,
  ): Promise<void> {
    await db.run(
      `DELETE FROM user_follows
       WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId],
    );
  }

  static async isFollowing(
    followerId: number,
    followingId: number,
  ): Promise<boolean> {
    const record = await db.get(
      `SELECT 1 FROM user_follows
       WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId],
    );
    return Boolean(record);
  }

  static async getFollowingUsers(followerId: number): Promise<UserRecord[]> {
    return db.all<UserRecord>(
      `SELECT users.*
       FROM user_follows
       JOIN users ON users.id = user_follows.following_id
       WHERE user_follows.follower_id = ?
       ORDER BY users.username ASC`,
      [followerId],
    );
  }
}

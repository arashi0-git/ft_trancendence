import { db } from "../database/connection";
import type { UserRecord } from "./user";

export class FriendModel {
  static async addFriend(userId: number, friendId: number): Promise<void> {
    db.run(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES (?, ?)`,
      [userId, friendId],
    );
  }

  static async removeFriend(userId: number, friendId: number): Promise<void> {
    await db.run(
      `DELETE FROM user_follows
       WHERE follower_id = ? AND following_id = ?`,
      [userId, friendId],
    );
  }

  static async isFriend(userId: number, friendId: number): Promise<boolean> {
    const record = await db.get(
      `SELECT 1 FROM user_follows
       WHERE follower_id = ? AND following_id = ?`,
      [userId, friendId],
    );
    return Boolean(record);
  }

  static async getFriends(userId: number): Promise<UserRecord[]> {
    return db.all<UserRecord>(
      `SELECT users.*
       FROM user_follows
       JOIN users ON users.id = user_follows.following_id
       WHERE user_follows.follower_id = ?
       ORDER BY users.username ASC`,
      [userId],
    );
  }
}

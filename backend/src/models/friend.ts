import { db } from "../database/connection";
import type { UserRecord } from "./user";

export class FriendModel {
  static async addFriend(userId: number, friendId: number): Promise<void> {
    db.run(
      `INSERT INTO user_friends (user_id, friend_id)
       VALUES (?, ?)`,
      [userId, friendId],
    );
  }

  static async removeFriend(userId: number, friendId: number): Promise<void> {
    await db.run(
      `DELETE FROM user_friends
       WHERE user_id = ? AND friend_id = ?`,
      [userId, friendId],
    );
  }

  static async isFriend(userId: number, friendId: number): Promise<boolean> {
    const record = await db.get(
      `SELECT 1 FROM user_friends
       WHERE user_id = ? AND friend_id = ?`,
      [userId, friendId],
    );
    return Boolean(record);
  }

  static async getFriends(userId: number): Promise<UserRecord[]> {
    return db.all<UserRecord>(
      `SELECT users.*
       FROM user_friends
       JOIN users ON users.id = user_friends.friend_id
       WHERE user_friends.user_id = ?
       ORDER BY users.username ASC`,
      [userId],
    );
  }
}

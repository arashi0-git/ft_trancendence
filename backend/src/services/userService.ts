import { db } from '../database/connection';
import { User, CreateUserRequest, UserProfile } from '../types/user';
import { AuthUtils } from '../utils/auth';

export class UserService {
    static async createUser(userData: CreateUserRequest): Promise<UserProfile> {
        const { username, email, password } = userData;

        const existingUser = await db.get(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser) {
            throw new Error('User with this email or username already exists');
        }

        const passwordHash = await AuthUtils.hashPassword(password);

        await db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]
        );

        const user = await db.get(
            'SELECT id, username, email, created_at, is_online, last_login FROM users WHERE email = ?',
            [email]
        ) as UserProfile;

        return user;
    }

    static async authenticateUser(email: string, password: string): Promise<UserProfile | null> {
        const user = await db.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        ) as User;

        if (!user) {
            return null;
        }

        const isValidPassword = await AuthUtils.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return null;
        }

        await db.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP, is_online = TRUE WHERE id = ?',
            [user.id]
        );

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            is_online: true,
            last_login: new Date().toISOString()
        };
    }

    static async getUserById(id: number): Promise<UserProfile | null> {
        const user =  await db.get(
            'SELECT id, username, email, created_at, is_online, last_login FROM users WHERE id = ?',
            [id]
        ) as UserProfile;

        return user || null;
    }

    static async updateUserOnlineStatus(id: number, isOnline: boolean): Promise<void> {
        await db.run(
            'UPDATE users SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [isOnline, id]
        );
    }

    static async updateUserProfile(id: number, updates: Partial<Pick<User, 'username' | 'email'>>): Promise<UserProfile> {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        await db.run(
            `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...values, id]
        );

        const updatedUser = await this.getUserById(id);
        if (!updatedUser) {
            throw new Error('User not found after update');
        }

        return updatedUser;
    }
}
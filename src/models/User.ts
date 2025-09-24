import { db } from '../database/connection';
import bcrypt from 'bcrypt';

export interface User {
    id?: number;
    username: string;
    email: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
    is_online?: boolean;
    last_login?: string;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
}

export class UserModel {
    static async create(userData: CreateUserInput): Promise<User> {
        const passwordHash = await bcrypt.hash(userData.password, 12);

        const result = await db.run(
            `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
            [userData.username, userData.email, passwordHash]
        );

        const user = await db.get(
            'SELECT id, username, email, created_at FROM users WHERE id = last_insert_rowid()'
        );
        return user;
    }
    static async findByEmail(email: string): Promise<User | undefined> {
        return await db.get(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
    }
    static async findByUsername(username: string): Promise<User | undefined> {
        return await db.get(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
    }

    static async findById(id: number): Promise<User | undefined> {
        return await db.get(
            'SELECT id, username, email, created_at, is_online, last_login FROM users WHERE id = ?',
            [id]
        );
    }
}
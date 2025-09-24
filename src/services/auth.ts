import { UserModel, CreateUserInput, User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: Omit<User, 'password_hash'>;
    token?: string;
}

export class AuthService {
    static async register(userData: CreateUserInput): Promise<AuthResponse> {
        try {
            const existingUsername = await UserModel.findByUsername(userData.username);
            if (existingUsername) {
                return {
                    success: false,
                    message: 'ユーザー名がすでに使用されています。'
                };
            }
            const existingEmail = await UserModel.findByEmail(userData.email);
            if (existingEmail) {
                return {
                    success: false,
                    message: 'メールアドレスがすでに使用されています。'
                };
            }
            const user = await UserModel.create(userData);
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );
            return {
                success: true,
                message: 'ユーザー登録が完了しました。',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at
                },
                token
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: 'ユーザー登録に失敗しました。'
            };
        }
    }

    static async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return {
                    success: false,
                    message: 'メールアドレスが見つかりません。'
                };
            }
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'パスワードが違います。'
                };
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            return {
                success: true,
                message: 'ログインしました。',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at
                },
                token
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'ログインに失敗しました。'
            };
        }
    }
}
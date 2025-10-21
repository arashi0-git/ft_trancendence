import {
  User,
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
} from "../types/user";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export class AuthService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async register(userData: CreateUserRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      return data as AuthResponse;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      return data as AuthResponse;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
        }
        throw new Error(data.error || "Failed to get user info");
      }

      return data.user as User;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Logout failed with status ${response.status}`,
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
      // ローカルトークンは削除するが、エラーは再スロー
      localStorage.removeItem("auth_token");
      throw error;
    }

    // 成功時のみここに到達
    localStorage.removeItem("auth_token");
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem("auth_token");
  }

  static getToken(): string | null {
    return localStorage.getItem("auth_token");
  }
}

import type {
  PublicUser,
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  UpdateUserSettingsPayload,
  UpdateUserSettingsResponse,
  FollowingListResponse,
  FollowUserResponse,
} from "../types/user";

declare const __API_BASE_URL__: string | undefined;

const API_BASE_URL =
  (typeof __API_BASE_URL__ !== "undefined" && __API_BASE_URL__) ||
  process.env.API_BASE_URL ||
  "http://localhost:3000/api";

export class AuthService {
  private static getApiOrigin(): string | null {
    const trimmed = API_BASE_URL.trim();
    if (trimmed.length === 0) return null;

    try {
      const parsed = new URL(trimmed);
      return parsed.origin;
    } catch (error) {
      if (typeof window !== "undefined") {
        try {
          const parsedRelative = new URL(trimmed, window.location.origin);
          return parsedRelative.origin;
        } catch {
          return window.location.origin;
        }
      }
      return null;
    }
  }

  static resolveAssetUrl(path: string): string {
    if (!path) return path;
    if (/^(https?:)?\/\//i.test(path) || path.startsWith("blob:")) {
      return path;
    }

    const origin = this.getApiOrigin();
    if (!origin) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${origin}${normalizedPath}`;
  }

  private static getAuthHeaders(options?: {
    includeJson?: boolean;
  }): HeadersInit {
    const includeJson = options?.includeJson ?? true;
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {};
    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
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

  static async getCurrentUser(): Promise<PublicUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: this.getAuthHeaders({ includeJson: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
        }
        throw new Error(data.error || "Failed to get user info");
      }

      return data.user as PublicUser;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: this.getAuthHeaders({ includeJson: false }),
      });
      // We don't need to check the response. The token will be cleared regardless.
    } catch (error) {
      console.error("Logout error:", error);
      // We can log the error, but we don't need to re-throw it.
      // The primary goal of logout on the client is to clear the token.
    } finally {
      // This block will always execute, ensuring the token is removed.
      localStorage.removeItem("auth_token");
    }
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem("auth_token");
  }

  static getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  static async uploadAvatar(file: File): Promise<UpdateUserSettingsResponse> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      return data as UpdateUserSettingsResponse;
    } catch (error) {
      console.error("Upload avatar error:", error);
      throw error;
    }
  }

  static async getFollowing(): Promise<PublicUser[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/following`,
        {
          method: "GET",
          headers: this.getAuthHeaders({ includeJson: false }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load friends");
      }

      return (data as FollowingListResponse).following;
    } catch (error) {
      console.error("Get following error:", error);
      throw error;
    }
  }

  static async followUser(username: string): Promise<PublicUser> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/following`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ username }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to follow user");
      }

      return (data as FollowUserResponse).user;
    } catch (error) {
      console.error("Follow user error:", error);
      throw error;
    }
  }

  static async unfollowUser(userId: number): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/following/${userId}`,
        {
          method: "DELETE",
          headers: this.getAuthHeaders({ includeJson: false }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "Failed to remove friend",
        );
      }
    } catch (error) {
      console.error("Unfollow user error:", error);
      throw error;
    }
  }

  static async updateSettings(
    payload: UpdateUserSettingsPayload,
  ): Promise<UpdateUserSettingsResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me`,
        {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      return data as UpdateUserSettingsResponse;
    } catch (error) {
      console.error("Update settings error:", error);
      throw error;
    }
  }
}

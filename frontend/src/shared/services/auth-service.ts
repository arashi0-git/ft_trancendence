import type {
  PublicUser,
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  UpdateUserSettingsPayload,
  UpdateUserSettingsResponse,
  FriendResponse,
  FriendSummary,
  TwoFactorChallengeDetails,
  AuthResult,
  TwoFactorVerifyPayload,
  TwoFactorStatusResponse,
  TwoFactorVerificationResponse,
} from "../types/user";
import { setLanguage, type SupportedLanguage } from "../../i18n";
import { expectJson } from "../utils/http";
import { ApiError } from "../utils/api-error";
import { gameCustomizationService } from "./game-customization.service";

declare const __API_BASE_URL__: string | undefined;

const API_BASE_URL =
  (typeof __API_BASE_URL__ !== "undefined" && __API_BASE_URL__) ||
  process.env.API_BASE_URL ||
  "/api";

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

  private static async applyUserLanguage(user: PublicUser): Promise<void> {
    if (user.language) {
      const validLanguages: SupportedLanguage[] = ["en", "cs", "jp"];
      if (validLanguages.includes(user.language as SupportedLanguage)) {
        try {
          await setLanguage(user.language as SupportedLanguage);
        } catch (error) {
          console.error("Failed to set user language:", error);
        }
      }
    }
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

      const data = await expectJson<AuthResponse>(response);

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      // Apply user's language preference after registration
      if (data.user) {
        await this.applyUserLanguage(data.user);
        gameCustomizationService.resetToDefaults();
      }

      return data as AuthResponse;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  static async login(credentials: LoginRequest): Promise<AuthResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await expectJson<AuthResult>(response);

      if (isTwoFactorChallengeDetails(data)) {
        return data;
      }

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (data.user) {
        await this.applyUserLanguage(data.user);
        gameCustomizationService.resetToDefaults();
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  static async verifyTwoFactorCode(
    payload: TwoFactorVerifyPayload,
  ): Promise<TwoFactorVerificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders({ includeJson: false }),
        },
        body: JSON.stringify(payload),
      });

      const data = await expectJson<
        TwoFactorVerificationResponse | TwoFactorChallengeDetails
      >(response);

      if ("token" in data && data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      // Apply user's language preference after 2FA verification
      if ("user" in data && data.user) {
        await this.applyUserLanguage(data.user);
        gameCustomizationService.resetToDefaults();
      }

      return data as TwoFactorVerificationResponse;
    } catch (error) {
      console.error("Two-factor verification error:", error);
      throw error;
    }
  }

  static async resendTwoFactorCode(
    token: string,
  ): Promise<TwoFactorChallengeDetails> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/2fa/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await expectJson<TwoFactorChallengeDetails>(response);
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      return data;
    } catch (error) {
      console.error("Two-factor resend error:", error);
      throw error;
    }
  }

  static async enableTwoFactor(): Promise<
    TwoFactorStatusResponse | TwoFactorChallengeDetails
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      const data = await expectJson<
        TwoFactorStatusResponse | TwoFactorChallengeDetails
      >(response);

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (isTwoFactorChallengeDetails(data)) {
        return data;
      }

      if (!data.user) {
        throw new Error("Failed to enable two-factor");
      }

      return data;
    } catch (error) {
      console.error("Two-factor enable error:", error);
      throw error;
    }
  }

  static async disableTwoFactor(): Promise<
    TwoFactorStatusResponse | TwoFactorChallengeDetails
  > {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      const data = await expectJson<
        TwoFactorStatusResponse | TwoFactorChallengeDetails
      >(response);

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (isTwoFactorChallengeDetails(data)) {
        return data;
      }

      if (!data.user) {
        throw new Error("Failed to disable two-factor");
      }

      return data;
    } catch (error) {
      console.error("Two-factor disable error:", error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<PublicUser> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: this.getAuthHeaders({ includeJson: false }),
      });

      const data = await expectJson<{ user: PublicUser }>(response);

      const user = data.user as PublicUser;

      // Apply user's language preference
      await this.applyUserLanguage(user);

      return user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("auth_token");
      }
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
      gameCustomizationService.resetToDefaults();
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

      const data = await expectJson<UpdateUserSettingsResponse>(response);

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      return data;
    } catch (error) {
      console.error("Upload avatar error:", error);
      throw error;
    }
  }

  static async getFriends(): Promise<FriendSummary[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/friends`,
        {
          method: "GET",
          headers: this.getAuthHeaders({ includeJson: false }),
        },
      );

      const { friends } = await expectJson<{ friends: FriendSummary[] }>(
        response,
      );
      return friends;
    } catch (error) {
      console.error("Get friends error:", error);
      throw error;
    }
  }

  static async addFriend(username: string): Promise<FriendSummary> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/friends`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ username }),
        },
      );

      const data = await expectJson<FriendResponse>(response);

      return data.user;
    } catch (error) {
      console.error("Add friend error:", error);
      throw error;
    }
  }

  static async removeFriend(userId: number): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me/friends/${userId}`,
        {
          method: "DELETE",
          headers: this.getAuthHeaders({ includeJson: false }),
        },
      );

      await expectJson<{ success: boolean }>(response);
    } catch (error) {
      console.error("Remove friend error:", error);
      throw error;
    }
  }

  static async updateSettings(
    payload: UpdateUserSettingsPayload,
  ): Promise<UpdateUserSettingsResponse | TwoFactorChallengeDetails> {
    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/users/me`,
        {
          method: "PATCH",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        },
      );

      const data = await expectJson<
        UpdateUserSettingsResponse | TwoFactorChallengeDetails
      >(response);

      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }

      if (isTwoFactorChallengeDetails(data)) {
        return data;
      }

      if (!("user" in data) || !data.user) {
        throw new Error("Failed to update settings");
      }

      await this.applyUserLanguage(data.user);

      return data;
    } catch (error) {
      console.error("Update settings error:", error);
      throw error;
    }
  }
}
function isTwoFactorChallengeDetails(
  data: unknown,
): data is TwoFactorChallengeDetails {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Partial<TwoFactorChallengeDetails>).requiresTwoFactor === true
  );
}

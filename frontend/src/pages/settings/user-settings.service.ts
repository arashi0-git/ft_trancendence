import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
  FollowedUserSummary,
  TwoFactorStatusResponse,
} from "../../shared/types/user";
import { router } from "../../routes/router";

export class UserSettingsService {
  private currentUser: PublicUser | null = null;
  private following: FollowedUserSummary[] = [];

  getUser(): PublicUser | null {
    return this.currentUser;
  }

  getFollowing(): FollowedUserSummary[] {
    return this.following;
  }

  async loadCurrentUser(): Promise<PublicUser> {
    try {
      this.currentUser = await AuthService.getCurrentUser();
      return this.currentUser;
    } catch (error) {
      console.error("Failed to load current user:", error);
      NotificationService.getInstance().warning(
        "Your session has expired. Please log in again.",
      );
      router.navigate("/login");
      throw error;
    }
  }

  async saveSettings(payload: UpdateUserSettingsPayload): Promise<PublicUser> {
    try {
      const response = await AuthService.updateSettings(payload);
      this.currentUser = response.user;
      return this.currentUser;
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  }

  async uploadAvatar(file: File): Promise<PublicUser> {
    try {
      const response = await AuthService.uploadAvatar(file);
      this.currentUser = response.user;
      return this.currentUser;
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      throw error;
    }
  }

  async loadFollowing(): Promise<FollowedUserSummary[]> {
    try {
      const list = await AuthService.getFollowing();
      this.following = [...list].sort((a, b) =>
        a.username.localeCompare(b.username, undefined, {
          sensitivity: "base",
        }),
      );
      return this.following;
    } catch (error) {
      console.error("Failed to load following list:", error);
      throw error;
    }
  }

  async addFollowing(username: string): Promise<FollowedUserSummary> {
    try {
      const user = await AuthService.followUser(username);
      const existingIndex = this.following.findIndex((f) => f.id === user.id);
      if (existingIndex === -1) {
        this.following = [...this.following, user].sort((a, b) =>
          a.username.localeCompare(b.username, undefined, {
            sensitivity: "base",
          }),
        );
      } else {
        const updated = [...this.following];
        updated[existingIndex] = user;
        this.following = updated.sort((a, b) =>
          a.username.localeCompare(b.username, undefined, {
            sensitivity: "base",
          }),
        );
      }
      return user;
    } catch (error) {
      console.error("Failed to follow user:", error);
      throw error;
    }
  }

  async removeFollowing(userId: number): Promise<void> {
    try {
      await AuthService.unfollowUser(userId);
      this.following = this.following.filter((user) => user.id !== userId);
    } catch (error) {
      console.error("Failed to remove following:", error);
      throw error;
    }
  }

  async enableTwoFactor(
    currentPassword: string,
  ): Promise<TwoFactorStatusResponse> {
    try {
      const result = await AuthService.enableTwoFactor(currentPassword);
      if (!result.user) {
        throw new Error("User data missing from enable 2FA response");
      }
      this.currentUser = result.user;
      return result;
    } catch (error) {
      console.error("Failed to enable two-factor:", error);
      throw error;
    }
  }

  async disableTwoFactor(
    currentPassword: string,
  ): Promise<TwoFactorStatusResponse> {
    try {
      const result = await AuthService.disableTwoFactor(currentPassword);
      if (!result.user) {
        throw new Error("User data missing from disable 2FA response");
      }
      this.currentUser = result.user;
      return result;
    } catch (error) {
      console.error("Failed to disable two-factor:", error);
      throw error;
    }
  }
}

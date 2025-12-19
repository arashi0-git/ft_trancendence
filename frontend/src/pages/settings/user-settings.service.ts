import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
  UpdateUserSettingsResponse,
  FriendSummary,
  TwoFactorStatusResponse,
  TwoFactorChallengeDetails,
} from "../../shared/types/user";
import { router } from "../../routes/router";
import { i18next } from "../../i18n";

export class UserSettingsService {
  private currentUser: PublicUser | null = null;
  private friends: FriendSummary[] = [];

  setCurrentUser(user: PublicUser): void {
    this.currentUser = user;
  }

  getUser(): PublicUser | null {
    return this.currentUser;
  }

  getFriends(): FriendSummary[] {
    return this.friends;
  }

  async loadCurrentUser(): Promise<PublicUser> {
    try {
      this.currentUser = await AuthService.getCurrentUser();
      return this.currentUser;
    } catch (error) {
      console.error("Failed to load current user:", error);
      NotificationService.getInstance().warning(
        i18next.t("notifications.sessionExpired"),
      );
      router.navigate("/login");
      throw error;
    }
  }

  async saveSettings(
    payload: UpdateUserSettingsPayload,
  ): Promise<UpdateUserSettingsResponse | TwoFactorChallengeDetails> {
    try {
      const response = await AuthService.updateSettings(payload);
      if (response.user) {
        this.currentUser = response.user;
      }
      return response;
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

  async loadFriends(): Promise<FriendSummary[]> {
    try {
      const list = await AuthService.getFriends();
      this.friends = [...list].sort((a, b) =>
        a.username.localeCompare(b.username, undefined, {
          sensitivity: "base",
        }),
      );
      return this.friends;
    } catch (error) {
      console.error("Failed to load friends list:", error);
      throw error;
    }
  }

  async addFriend(username: string): Promise<FriendSummary> {
    try {
      const user = await AuthService.addFriend(username);
      const existingIndex = this.friends.findIndex((f) => f.id === user.id);
      if (existingIndex === -1) {
        this.friends = [...this.friends, user].sort((a, b) =>
          a.username.localeCompare(b.username, undefined, {
            sensitivity: "base",
          }),
        );
      } else {
        const updated = [...this.friends];
        updated[existingIndex] = user;
        this.friends = updated.sort((a, b) =>
          a.username.localeCompare(b.username, undefined, {
            sensitivity: "base",
          }),
        );
      }
      return user;
    } catch (error) {
      console.error("Failed to add friend:", error);
      throw error;
    }
  }

  async removeFriend(userId: number): Promise<void> {
    try {
      await AuthService.removeFriend(userId);
      this.friends = this.friends.filter((user) => user.id !== userId);
    } catch (error) {
      console.error("Failed to remove friend:", error);
      throw error;
    }
  }

  async enableTwoFactor(): Promise<
    TwoFactorStatusResponse | TwoFactorChallengeDetails
  > {
    try {
      const result = await AuthService.enableTwoFactor();
      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        if (result.user) {
          this.currentUser = result.user;
        }
        return result;
      }

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

  async disableTwoFactor(): Promise<
    TwoFactorStatusResponse | TwoFactorChallengeDetails
  > {
    try {
      const result = await AuthService.disableTwoFactor();
      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        if (result.user) {
          this.currentUser = result.user;
        }
        return result;
      }

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

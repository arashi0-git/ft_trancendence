import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
} from "../../shared/types/user";
import { router } from "../../routes/router";

export class UserSettingsService {
  private currentUser: PublicUser | null = null;

  getUser(): PublicUser | null {
    return this.currentUser;
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
}

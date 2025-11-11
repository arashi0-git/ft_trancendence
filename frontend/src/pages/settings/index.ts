import { SpacePageBase } from "../../shared/components/space-page-base";
import { UserSettingsService } from "./user-settings.service";
import { NotificationService } from "../../shared/services/notification.service";
import { AuthService } from "../../shared/services/auth-service";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { FriendsSection } from "./friends-section";
import { HistorySection } from "./history-section";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
} from "../../shared/types/user";
import { router } from "../../routes/router";
import { i18next, onLanguageChange } from "../../i18n";

export class UserSettingsPage extends SpacePageBase {
  private service: UserSettingsService;
  private profileSection: ProfileSection | null = null;
  private securitySection: SecuritySection | null = null;
  private friendsSection: FriendsSection | null = null;
  private historySection: HistorySection | null = null;
  private initialEmail: string = "";
  private unsubscribeLanguage?: () => void;

  constructor(container: HTMLElement) {
    super(container);
    this.service = new UserSettingsService();
    this.unsubscribeLanguage = onLanguageChange(() => {
      this.updateStaticText();
    });
  }

  render(): void {
    if (!AuthService.isAuthenticated()) {
      console.log("Please log in to manage your profile.");
      // Use setTimeout to navigate after current render cycle completes
      setTimeout(() => {
        router.navigate("/login");
      }, 0);
      return;
    }

    this.container.innerHTML = this.getTemplate();
    this.initializeAppHeader();
    this.initializeSpaceBackground();

    // Initialize sections
    const profileContainer = document.getElementById("profile-section");
    const securityContainer = document.getElementById("security-section");
    const friendsContainer = document.getElementById("friends-section");
    const historyContainer = document.getElementById("history-section");

    if (profileContainer) {
      this.profileSection = new ProfileSection(profileContainer);
    }

    if (securityContainer) {
      this.securitySection = new SecuritySection(
        securityContainer,
        (user) => this.handleUserUpdate(user),
        () => this.handleEmailRestore(),
      );
    }

    if (friendsContainer) {
      this.friendsSection = new FriendsSection(friendsContainer);
      this.friendsSection.render();
    }

    if (historyContainer) {
      this.historySection = new HistorySection(historyContainer);
      this.historySection.render().catch((error) => {
        console.error("Failed to render history section:", error);
      });
    }

    // Bind form submit
    const form = document.getElementById(
      "user-settings-form",
    ) as HTMLFormElement;
    form?.addEventListener("submit", (e) => this.handleFormSubmit(e));

    // Bind back button
    document
      .getElementById("back-to-home-btn")
      ?.addEventListener("click", () => this.handleBackClick());

    void this.loadUserData();
    void this.friendsSection?.loadFriends();
  }

  destroy(): void {
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
    this.profileSection?.destroy();
    this.securitySection?.destroy();
    this.friendsSection?.destroy();
    this.historySection?.destroy();
    this.initialEmail = "";
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = undefined;
  }

  private getTemplate(): string {
    return this.getSpaceTemplate(`
      <div class="max-w-2xl mx-auto p-4">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-cyan-500/30">
          <h2
            id="user-settings-title"
            class="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
          >
            ${i18next.t("settings.pageTitle", "User Settings")}
          </h2>

          <form id="user-settings-form" class="space-y-6">
            <div id="profile-section"></div>
          </form>

          <div class="space-y-6 mt-6">
            <div id="security-section"></div>
            <div id="friends-section"></div>
            <div id="history-section"></div>
          </div>

          <div class="flex gap-3 pt-4 border-t border-gray-700 mt-6">
            <button
              type="button"
              id="back-to-home-btn"
              class="w-full bg-yellow-600 bg-opacity-30 hover:bg-opacity-50 text-white py-3 px-6 rounded-lg font-semibold border border-yellow-500 shadow-lg transition-all duration-200"
            >
              ${i18next.t("settings.backButton", "Back to Home")}
            </button>
          </div>
        </div>
      </div>
    `);
  }

  private async loadUserData(): Promise<void> {
    try {
      const user = await this.service.loadCurrentUser();
      this.initialEmail = user.email;
      this.profileSection?.render(user);
      this.securitySection?.render(user);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  }

  private async handleFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    let currentUser = this.service.getUser();
    if (!currentUser) {
      try {
        currentUser = await this.service.loadCurrentUser();
        this.initialEmail = currentUser.email;
        this.profileSection?.render(currentUser);
        this.securitySection?.render(currentUser);
      } catch (error) {
        console.error("Failed to reload user before saving settings:", error);
        return;
      }
    }

    const saveButton = document.getElementById(
      "save-profile-btn",
    ) as HTMLButtonElement | null;

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = i18next.t(
          "settings.buttons.saving",
          "Saving...",
        );
      }

      const profileData = this.profileSection?.getFormData();
      const passwordData = this.profileSection?.getPasswordData();
      const hasAvatarChange = this.profileSection?.hasAvatarChange() ?? false;
      let updatedAvatarUser: PublicUser | null = null;

      const trimmedUsername = profileData?.username?.trim() ?? "";
      const trimmedEmail = profileData?.email?.trim() ?? "";

      const payload: UpdateUserSettingsPayload = {};

      if (trimmedUsername && trimmedUsername !== currentUser.username) {
        payload.username = trimmedUsername;
      }

      const normalizedEmail = trimmedEmail.toLowerCase();
      const normalizedCurrentEmail = (currentUser.email || "").toLowerCase();
      if (trimmedEmail && normalizedEmail !== normalizedCurrentEmail) {
        payload.email = trimmedEmail;
      }

      if (
        profileData?.language &&
        profileData.language !== currentUser.language
      ) {
        payload.language = profileData.language;
      }

      const passwordChangeAttempted = Boolean(
        passwordData?.currentPassword ||
          passwordData?.newPassword ||
          passwordData?.confirmPassword,
      );
      const allPasswordFieldsFilled = Boolean(
        passwordData?.currentPassword &&
          passwordData?.newPassword &&
          passwordData?.confirmPassword,
      );

      if (passwordChangeAttempted && !allPasswordFieldsFilled) {
        NotificationService.getInstance().error(
          i18next.t(
            "notifications.passwordAllFieldsRequired",
            "All password fields (current, new, confirm) must be filled to change password",
          ),
        );
        return;
      }

      const emailChangeRequested = Boolean(payload.email);
      const otherProfileFieldChanges =
        Object.prototype.hasOwnProperty.call(payload, "username") ||
        Object.prototype.hasOwnProperty.call(payload, "language");
      const hasProfileFieldChanges =
        emailChangeRequested || otherProfileFieldChanges;
      const hasAdditionalUpdates =
        otherProfileFieldChanges || passwordChangeAttempted || hasAvatarChange;

      if (
        !hasProfileFieldChanges &&
        !passwordChangeAttempted &&
        !hasAvatarChange
      ) {
        return;
      }

      if (
        currentUser.two_factor_enabled &&
        emailChangeRequested &&
        hasAdditionalUpdates
      ) {
        NotificationService.getInstance().warning(
          i18next.t("notifications.emailChangeTwoFactor"),
        );
        return;
      }

      // Validate password confirmation if attempting to change password
      if (passwordData?.newPassword || passwordData?.confirmPassword) {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          NotificationService.getInstance().error(
            i18next.t("notifications.passwordMismatch"),
          );
          return;
        }
      }

      if (hasAvatarChange && this.profileSection) {
        const avatarResponse = await this.profileSection.uploadAvatar();
        if (avatarResponse) {
          updatedAvatarUser = avatarResponse;
          currentUser = avatarResponse;
          this.service.setCurrentUser(avatarResponse);
          this.profileSection.render(avatarResponse);
          this.securitySection?.render(avatarResponse);
        }
      }

      if (passwordData?.currentPassword) {
        payload.currentPassword = passwordData.currentPassword;
      }
      if (passwordData?.newPassword) {
        payload.newPassword = passwordData.newPassword;
      }

      const requiresSettingsUpdate = Object.keys(payload).length > 0;

      if (!requiresSettingsUpdate) {
        NotificationService.getInstance().success(
          i18next.t("notifications.profileUpdateSuccess"),
        );
        return;
      }

      // Save settings
      const response = await this.service.saveSettings(payload);

      // Handle 2FA challenge for email change
      if ("requiresTwoFactor" in response && response.requiresTwoFactor) {
        this.securitySection?.showTwoFactorDialogForEmailChange(
          response,
          () => {
            NotificationService.getInstance().success(
              i18next.t("notifications.profileUpdateSuccess"),
            );
          },
        );
        return;
      }

      // Update UI with new user data
      let nextUser = response.user ?? updatedAvatarUser;
      if (response.user && updatedAvatarUser) {
        nextUser = {
          ...response.user,
          profile_image_url:
            response.user.profile_image_url ??
            updatedAvatarUser.profile_image_url,
        };
      }

      if (nextUser) {
        this.handleUserUpdate(nextUser);
      }

      NotificationService.getInstance().success(
        i18next.t("notifications.profileUpdateSuccess"),
      );
    } catch (error) {
      NotificationService.getInstance().handleUnexpectedError(
        error,
        i18next.t("settings.errors.updateFailed", "Failed to update settings"),
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = i18next.t(
          "settings.buttons.save",
          "Save Changes",
        );
      }
    }
  }

  private updateStaticText(): void {
    const heading = document.getElementById("user-settings-title");
    if (heading) {
      heading.textContent = i18next.t("settings.pageTitle", "User Settings");
    }

    const backButton = document.getElementById("back-to-home-btn");
    if (backButton) {
      backButton.textContent = i18next.t("settings.backButton", "Back to Home");
    }
  }

  private handleUserUpdate(user: PublicUser): void {
    this.service.setCurrentUser(user);
    this.initialEmail = user.email;
    this.profileSection?.render(user);
    this.securitySection?.render(user);
  }

  private handleEmailRestore(): void {
    if (this.initialEmail) {
      const emailInput = document.getElementById("email") as HTMLInputElement;
      if (emailInput) {
        emailInput.value = this.initialEmail;
      }
    }
  }

  private handleBackClick(): void {
    void this.playTransitionAndNavigate(
      () => router.navigate("/"),
      "shootingStar",
      500,
    );
  }
}

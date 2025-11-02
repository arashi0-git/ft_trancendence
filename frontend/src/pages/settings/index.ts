import { SpacePageBase } from "../../shared/components/space-page-base";
import { UserSettingsService } from "./user-settings.service";
import { NotificationService } from "../../shared/services/notification.service";
import { AuthService } from "../../shared/services/auth-service";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { FriendsSection } from "./friends-section";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
} from "../../shared/types/user";
import { router } from "../../routes/router";

export class UserSettingsPage extends SpacePageBase {
  private service: UserSettingsService;
  private profileSection: ProfileSection | null = null;
  private securitySection: SecuritySection | null = null;
  private friendsSection: FriendsSection | null = null;
  private initialEmail: string = "";

  constructor(container: HTMLElement) {
    super(container);
    this.service = new UserSettingsService();
  }

  render(): void {
    if (!AuthService.isAuthenticated()) {
      NotificationService.getInstance().info(
        "Please log in to manage your profile.",
      );
      router.navigate("/login");
      return;
    }

    this.container.innerHTML = this.getTemplate();
    this.initializeAppHeader();
    this.initializeSpaceBackground();

    // Initialize sections
    const profileContainer = document.getElementById("profile-section");
    const securityContainer = document.getElementById("security-section");
    const friendsContainer = document.getElementById("friends-section");

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
    this.initialEmail = "";
  }

  private getTemplate(): string {
    return this.getSpaceTemplate(`
      <div class="max-w-2xl mx-auto p-4">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-cyan-500/30">
          <h2 class="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            User Settings
          </h2>

          <form id="user-settings-form" class="space-y-6">
            <div id="profile-section"></div>
            <div id="security-section"></div>
            <div id="friends-section"></div>

            <div class="flex gap-3 pt-4 border-t border-gray-700">
              <button
                type="submit"
                id="save-settings-btn"
                class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-6 rounded-lg font-semibold transition"
              >
                Save Changes
              </button>
              <button
                type="button"
                id="back-to-home-btn"
                class="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition"
              >
                Back to Home
              </button>
            </div>
          </form>
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
    const saveButton = document.getElementById(
      "save-settings-btn",
    ) as HTMLButtonElement | null;

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
      }

      // Upload avatar if changed
      if (this.profileSection?.hasAvatarChange()) {
        await this.profileSection.uploadAvatar();
      }

      // Build payload from form data
      const payload: UpdateUserSettingsPayload = {};
      const profileData = this.profileSection?.getFormData();
      const passwordData = this.securitySection?.getPasswordData();

      if (profileData?.username) payload.username = profileData.username;
      if (profileData?.email) payload.email = profileData.email;
      if (passwordData?.currentPassword)
        payload.currentPassword = passwordData.currentPassword;
      if (passwordData?.newPassword)
        payload.newPassword = passwordData.newPassword;

      // Save settings
      const response = await this.service.saveSettings(payload);

      // Handle 2FA challenge for email change
      if ("requiresTwoFactor" in response && response.requiresTwoFactor) {
        NotificationService.getInstance().info(
          "Enter the verification code we emailed you.",
        );
        this.securitySection?.showTwoFactorDialogForEmailChange(
          response,
          () => {
            NotificationService.getInstance().success(
              "Profile updated successfully!",
            );
          },
        );
        return;
      }

      // Update UI with new user data
      if (response.user) {
        this.handleUserUpdate(response.user);
      }

      NotificationService.getInstance().success(
        "Profile updated successfully!",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update settings.";
      NotificationService.getInstance().error(message);
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
      }
    }
  }

  private handleUserUpdate(user: PublicUser): void {
    this.service.setCurrentUser(user);
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

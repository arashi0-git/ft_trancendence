import { SpacePageBase } from "../../shared/components/space-page-base";
import { UserSettingsService } from "./user-settings.service";
import { NotificationService } from "../../shared/services/notification.service";
import { AuthService } from "../../shared/services/auth-service";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
} from "../../shared/types/user";
import { router } from "../../routes/router";

export class UserSettingsPage extends SpacePageBase {
  private service: UserSettingsService;
  private form: HTMLFormElement | null = null;
  private initialFormState: {
    username: string;
    email: string;
    profile_image_url: string;
  } | null = null;
  private selectedFile: File | null = null;
  private avatarPreviewUrl: string | null = null;
  private boundHandleSubmit = this.handleFormSubmit.bind(this);
  private boundHandleAvatarChange = this.handleAvatarFileChange.bind(this);
  private boundHandleBackClick = this.handleBackClick.bind(this);

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
    this.initializeSpaceBackground();

    this.form = this.container.querySelector(
      "#user-settings-form",
    ) as HTMLFormElement | null;

    this.bindEventListeners();
    void this.loadUserData();
  }

  destroy(): void {
    this.form?.removeEventListener("submit", this.boundHandleSubmit);
    document
      .getElementById("profile-image-input")
      ?.removeEventListener("change", this.boundHandleAvatarChange);
    document
      .getElementById("back-to-home-btn")
      ?.removeEventListener("click", this.boundHandleBackClick);

    this.revokePreviewUrl();
    this.selectedFile = null;
    this.avatarPreviewUrl = null;
    this.initialFormState = null;
    this.cleanupSpaceBackground();
  }

  private getTemplate(): string {
    const formMarkup = `
      <div class="space-y-6 max-w-2xl">
        <div class="text-center space-y-2">
          <h2 class="text-2xl font-bold text-white">Account Settings</h2>
          <p class="text-sm text-gray-300">Customize your ft_transcendence profile and account security.</p>
        </div>

        <form id="user-settings-form" class="space-y-8">
          <section class="space-y-4">
            <h3 class="text-lg font-semibold text-cyan-200">Profile</h3>
            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
              <div class="w-20 h-20 rounded-full bg-gray-800 border border-cyan-500/70 flex items-center justify-center overflow-hidden relative">
                <img id="profile-image-preview" class="w-full h-full object-cover hidden" alt="Profile preview" />
                <span id="profile-image-placeholder" class="text-2xl text-cyan-200">👤</span>
              </div>
              <div class="flex-1 w-full space-y-2">
                <div>
                  <label class="block text-sm text-gray-300 mb-1" for="profile-image-input">Upload avatar</label>
                  <input
                    id="profile-image-input"
                    name="profileImage"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/80 file:text-white hover:file:bg-cyan-500 focus:outline-none"
                  />
                  <p class="text-xs text-gray-400 mt-1">
                    JPG, PNG, or WebP. Max size 2MB.
                  </p>
                </div>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm text-gray-300 mb-1" for="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autocomplete="username"
                  required
                />
                <p class="text-xs text-gray-400 mt-1">3-20 characters. This is visible to other players.</p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm text-gray-300 mb-1" for="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autocomplete="email"
                  required
                />
              </div>
            </div>
          </section>

          <section class="space-y-4 border-t border-gray-700 pt-4">
            <h3 class="text-lg font-semibold text-cyan-200">Security</h3>
            <p class="text-xs text-gray-400">
              Leave the password fields blank to keep your current password. When changing your password, provide your current password for verification.
            </p>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-sm text-gray-300 mb-1" for="current-password">Current password</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autocomplete="current-password"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-300 mb-1" for="new-password">New password</label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autocomplete="new-password"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-1" for="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                autocomplete="new-password"
              />
            </div>
          </section>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <button
              type="button"
              id="back-to-home-btn"
              class="w-full sm:w-auto px-4 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-700 transition"
            >
              ← Back to Home
            </button>
            <button
              type="submit"
              id="save-settings-btn"
              class="w-full sm:w-auto px-6 py-2 rounded bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    `;

    return this.getSpaceTemplate(formMarkup);
  }

  private async loadUserData(): Promise<void> {
    try {
      const user = await this.service.loadCurrentUser();
      this.populateForm(user);
    } catch {
      // Redirection handled in service; nothing more to do.
    }
  }

  private bindEventListeners(): void {
    this.form?.addEventListener("submit", this.boundHandleSubmit);
    document
      .getElementById("profile-image-input")
      ?.addEventListener("change", this.boundHandleAvatarChange);
    document
      .getElementById("back-to-home-btn")
      ?.addEventListener("click", this.boundHandleBackClick);
  }

  private populateForm(user: PublicUser): void {
    const sanitizedProfileUrl = (user.profile_image_url ?? "").trim();

    const setInputValue = (id: string, value: string | null) => {
      const element = document.getElementById(id) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!element) return;
      element.value = value ?? "";
    };

    setInputValue("username", user.username);
    setInputValue("email", user.email);
    setInputValue("current-password", "");
    setInputValue("new-password", "");
    setInputValue("confirm-password", "");

    this.clearFileInput();
    this.revokePreviewUrl();
    this.selectedFile = null;
    this.avatarPreviewUrl = null;

    this.initialFormState = {
      username: user.username,
      email: user.email,
      profile_image_url: sanitizedProfileUrl,
    };

    this.updateAvatarPreview(sanitizedProfileUrl || null, user);
  }

  private updateAvatarPreview(url: string | null, user?: PublicUser): void {
    const img = document.getElementById(
      "profile-image-preview",
    ) as HTMLImageElement | null;
    const placeholder = document.getElementById(
      "profile-image-placeholder",
    ) as HTMLElement | null;

    if (!img || !placeholder) {
      return;
    }

    const effectiveUser = user ?? this.service.getUser() ?? undefined;
    const placeholderText = this.derivePlaceholderInitial(effectiveUser);
    placeholder.textContent = placeholderText;

    if (url && url.trim().length > 0) {
      const normalized = url.trim();
      const resolvedSrc = /^blob:/i.test(normalized)
        ? normalized
        : AuthService.resolveAssetUrl(normalized);
      img.src = resolvedSrc;
      img.classList.remove("hidden");
      placeholder.classList.add("hidden");
      img.onerror = () => {
        img.classList.add("hidden");
        placeholder.classList.remove("hidden");
      };
    } else {
      img.classList.add("hidden");
      img.removeAttribute("src");
      placeholder.classList.remove("hidden");
    }
  }

  private derivePlaceholderInitial(user?: PublicUser): string {
    const source = user?.username || user?.email || user?.id?.toString() || "";
    const initial = source.trim().charAt(0);
    return initial ? initial.toUpperCase() : "👤";
  }

  private clearFileInput(): void {
    const input = document.getElementById(
      "profile-image-input",
    ) as HTMLInputElement | null;
    if (input) {
      input.value = "";
    }
  }

  private revokePreviewUrl(): void {
    if (this.avatarPreviewUrl) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
    }
  }

  private async handleFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const currentUser = this.service.getUser();
    if (!currentUser) {
      NotificationService.getInstance().error(
        "Unable to load your profile data.",
      );
      return;
    }

    const payload: UpdateUserSettingsPayload = {};
    const initialState = this.initialFormState ?? {
      username: currentUser.username,
      email: currentUser.email,
      profile_image_url: currentUser.profile_image_url ?? "",
    };
    let hasChanges = false;

    const username = this.getInputValue("username");
    if (username && username !== initialState.username) {
      payload.username = username;
      hasChanges = true;
    }

    const email = this.getInputValue("email");
    if (email && email !== initialState.email) {
      payload.email = email;
      hasChanges = true;
    }

    if (this.selectedFile) {
      hasChanges = true;
    }

    const currentPassword = this.getInputValue("current-password");
    const newPassword = this.getInputValue("new-password");
    const confirmPassword = this.getInputValue("confirm-password");

    if (
      currentPassword.length > 0 ||
      newPassword.length > 0 ||
      confirmPassword.length > 0
    ) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        NotificationService.getInstance().error(
          "Please fill out all password fields to change your password.",
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        NotificationService.getInstance().error(
          "New password and confirmation do not match.",
        );
        return;
      }

      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
      hasChanges = true;
    }

    if (!hasChanges) {
      NotificationService.getInstance().info("No changes detected.");
      return;
    }

    const saveButton = document.getElementById(
      "save-settings-btn",
    ) as HTMLButtonElement | null;

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
      }

      let latestUser = currentUser;

      if (this.selectedFile) {
        latestUser = await this.service.uploadAvatar(this.selectedFile);
        this.selectedFile = null;
      }

      if (Object.keys(payload).length > 0) {
        latestUser = await this.service.saveSettings(payload);
      }

      this.populateForm(latestUser);
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

  private handleAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const user = this.service.getUser();

    if (!input) {
      return;
    }

    const file = input.files && input.files[0] ? input.files[0] : null;

    this.revokePreviewUrl();
    this.selectedFile = null;

    if (file) {
      this.selectedFile = file;
      this.avatarPreviewUrl = URL.createObjectURL(file);
      this.updateAvatarPreview(this.avatarPreviewUrl, user ?? undefined);
    } else {
      const fallbackUrl =
        this.initialFormState?.profile_image_url ||
        user?.profile_image_url ||
        null;
      this.updateAvatarPreview(fallbackUrl, user ?? undefined);
    }
  }

  private handleBackClick(): void {
    void this.playTransitionAndNavigate(
      () => router.navigate("/"),
      "shootingStar",
      500,
    );
  }

  private getInputValue(id: string): string {
    const element = document.getElementById(id) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    return element ? element.value.trim() : "";
  }
}

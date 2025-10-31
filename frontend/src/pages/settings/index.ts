import { SpacePageBase } from "../../shared/components/space-page-base";
import { UserSettingsService } from "./user-settings.service";
import { NotificationService } from "../../shared/services/notification.service";
import { AuthService } from "../../shared/services/auth-service";
import type {
  PublicUser,
  UpdateUserSettingsPayload,
  FollowedUserSummary,
  TwoFactorChallengeResponse,
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
  private followingLoaded = false;
  private boundHandleSubmit = this.handleFormSubmit.bind(this);
  private boundHandleAvatarChange = this.handleAvatarFileChange.bind(this);
  private boundHandleBackClick = this.handleBackClick.bind(this);
  private followControls: HTMLElement | null = null;
  private followInput: HTMLInputElement | null = null;
  private followingListContainer: HTMLElement | null = null;
  private boundHandleFollowClick = this.handleFollowClick.bind(this);
  private boundHandleFollowKeydown = this.handleFollowKeydown.bind(this);
  private boundHandleFollowingClick = this.handleFollowingClick.bind(this);
  private twoFactorStatusText: HTMLElement | null = null;
  private enableTwoFactorButton: HTMLButtonElement | null = null;
  private disableTwoFactorButton: HTMLButtonElement | null = null;
  private twoFactorCodeContainer: HTMLElement | null = null;
  private twoFactorCodeInput: HTMLInputElement | null = null;
  private twoFactorVerifyButton: HTMLButtonElement | null = null;
  private twoFactorCancelButton: HTMLButtonElement | null = null;
  private twoFactorError: HTMLElement | null = null;
  private twoFactorHelper: HTMLElement | null = null;
  private pendingTwoFactorChallenge: TwoFactorChallengeResponse | null = null;
  private pendingTwoFactorPurpose: "enable" | "disable" | null = null;
  private boundHandleTwoFactorEnable = this.handleTwoFactorEnable.bind(this);
  private boundHandleTwoFactorDisable = this.handleTwoFactorDisable.bind(this);
  private boundHandleTwoFactorVerify = this.handleTwoFactorVerify.bind(this);
  private boundHandleTwoFactorCancel = this.handleTwoFactorCancel.bind(this);

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

    this.form = this.container.querySelector(
      "#user-settings-form",
    ) as HTMLFormElement | null;
    this.followControls = this.container.querySelector(
      "#follow-form",
    ) as HTMLElement | null;
    this.followInput = this.container.querySelector(
      "#follow-username",
    ) as HTMLInputElement | null;
    this.followingListContainer = this.container.querySelector(
      "#following-list-container",
    ) as HTMLElement | null;
    this.twoFactorStatusText = this.container.querySelector(
      "#twofactor-status-text",
    ) as HTMLElement | null;
    this.enableTwoFactorButton = this.container.querySelector(
      "#enable-2fa-btn",
    ) as HTMLButtonElement | null;
    this.disableTwoFactorButton = this.container.querySelector(
      "#disable-2fa-btn",
    ) as HTMLButtonElement | null;
    this.twoFactorCodeContainer = this.container.querySelector(
      "#twofactor-code-container",
    ) as HTMLElement | null;
    this.twoFactorCodeInput = this.container.querySelector(
      "#twofactor-code-input",
    ) as HTMLInputElement | null;
    this.twoFactorVerifyButton = this.container.querySelector(
      "#twofactor-verify-btn",
    ) as HTMLButtonElement | null;
    this.twoFactorCancelButton = this.container.querySelector(
      "#twofactor-cancel-btn",
    ) as HTMLButtonElement | null;
    this.twoFactorError = this.container.querySelector(
      "#twofactor-error",
    ) as HTMLElement | null;
    this.twoFactorHelper = this.container.querySelector(
      "#twofactor-helper",
    ) as HTMLElement | null;

    this.followingLoaded = false;
    this.renderFollowingLoading();

    this.bindEventListeners();
    void this.loadUserData();
    void this.loadFollowing();
  }

  destroy(): void {
    this.form?.removeEventListener("submit", this.boundHandleSubmit);
    document
      .getElementById("profile-image-input")
      ?.removeEventListener("change", this.boundHandleAvatarChange);
    document
      .getElementById("back-to-home-btn")
      ?.removeEventListener("click", this.boundHandleBackClick);

    this.followControls?.removeEventListener(
      "click",
      this.boundHandleFollowClick,
    );
    this.followInput?.removeEventListener(
      "keydown",
      this.boundHandleFollowKeydown,
    );
    this.followingListContainer?.removeEventListener(
      "click",
      this.boundHandleFollowingClick,
    );
    this.enableTwoFactorButton?.removeEventListener(
      "click",
      this.boundHandleTwoFactorEnable,
    );
    this.disableTwoFactorButton?.removeEventListener(
      "click",
      this.boundHandleTwoFactorDisable,
    );
    this.twoFactorVerifyButton?.removeEventListener(
      "click",
      this.boundHandleTwoFactorVerify,
    );
    this.twoFactorCancelButton?.removeEventListener(
      "click",
      this.boundHandleTwoFactorCancel,
    );

    this.revokePreviewUrl();
    this.selectedFile = null;
    this.avatarPreviewUrl = null;
    this.initialFormState = null;
    this.followingLoaded = false;
    this.followControls = null;
    this.followInput = null;
    this.followingListContainer = null;
    this.twoFactorStatusText = null;
    this.enableTwoFactorButton = null;
    this.disableTwoFactorButton = null;
    this.twoFactorCodeContainer = null;
    this.twoFactorCodeInput = null;
    this.twoFactorVerifyButton = null;
    this.twoFactorCancelButton = null;
    this.twoFactorError = null;
    this.twoFactorHelper = null;
    this.pendingTwoFactorChallenge = null;
    this.pendingTwoFactorPurpose = null;
    this.cleanupSpaceBackground();
    this.cleanupAppHeader();
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
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 class="text-lg font-semibold text-cyan-200">Friends</h3>
                <p class="text-xs text-gray-400">Follow players by username to keep them handy.</p>
              </div>
            </div>

            <div id="follow-form" class="flex flex-col sm:flex-row gap-3">
              <input
                id="follow-username"
                name="followUsername"
                type="text"
                placeholder="Enter a username to follow"
                autocomplete="off"
                class="flex-1 bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                type="button"
                data-follow-action="submit"
                class="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Add Friend
              </button>
            </div>

            <div
              id="following-list-container"
              class="space-y-2 bg-gray-900/40 border border-cyan-500/20 rounded-lg p-4"
            ></div>
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

            <div class="border border-cyan-500/30 rounded-lg p-4 bg-gray-900/40 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 class="text-md font-semibold text-cyan-200">Two-Factor Authentication (2FA)</h4>
                  <p id="twofactor-status-text" class="text-xs text-gray-400">
                    Checking your 2FA status...
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    id="enable-2fa-btn"
                    class="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition"
                  >
                    Enable 2FA
                  </button>
                  <button
                    type="button"
                    id="disable-2fa-btn"
                    class="hidden px-4 py-2 rounded bg-red-500/80 hover:bg-red-500 text-white font-semibold transition"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>

              <div
                id="twofactor-code-container"
                class="hidden mt-2 space-y-3 border border-cyan-500/20 rounded-lg p-3 bg-gray-900/60"
              >
                <p id="twofactor-helper" class="text-xs text-gray-400"></p>
                <div class="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div class="flex-1">
                    <label class="block text-sm text-gray-300 mb-1" for="twofactor-code-input">
                      Verification code
                    </label>
                    <input
                      id="twofactor-code-input"
                      type="text"
                      inputmode="numeric"
                      pattern="\\d{6}"
                      maxlength="6"
                      class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="123456"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      id="twofactor-verify-btn"
                      class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold transition"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      id="twofactor-cancel-btn"
                      class="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700 text-white font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div id="twofactor-error" class="hidden text-sm text-red-300"></div>
              </div>
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

  private async loadFollowing(): Promise<void> {
    if (!AuthService.isAuthenticated()) {
      return;
    }

    this.renderFollowingLoading();

    try {
      await this.service.loadFollowing();
      this.followingLoaded = true;
      this.renderFollowingList();
    } catch (error) {
      this.followingLoaded = false;
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load your friends list.";
      this.renderFollowingError(message);
      NotificationService.getInstance().warning(message);
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
    this.followControls?.addEventListener("click", this.boundHandleFollowClick);
    this.followInput?.addEventListener(
      "keydown",
      this.boundHandleFollowKeydown,
    );
    this.followingListContainer?.addEventListener(
      "click",
      this.boundHandleFollowingClick,
    );
    this.enableTwoFactorButton?.addEventListener(
      "click",
      this.boundHandleTwoFactorEnable,
    );
    this.disableTwoFactorButton?.addEventListener(
      "click",
      this.boundHandleTwoFactorDisable,
    );
    this.twoFactorVerifyButton?.addEventListener(
      "click",
      this.boundHandleTwoFactorVerify,
    );
    this.twoFactorCancelButton?.addEventListener(
      "click",
      this.boundHandleTwoFactorCancel,
    );
  }

  private renderFollowingLoading(): void {
    const container = this.followingListContainer;
    if (!container) {
      return;
    }

    container.innerHTML = "";
    const loading = document.createElement("p");
    loading.className = "text-sm text-gray-400";
    loading.textContent = "Loading friends...";
    container.appendChild(loading);
  }

  private renderFollowingError(message: string): void {
    const container = this.followingListContainer;
    if (!container) {
      return;
    }

    container.innerHTML = "";
    const errorMessage = document.createElement("p");
    errorMessage.className = "text-sm text-red-300";
    errorMessage.textContent = message;
    container.appendChild(errorMessage);
  }

  private renderFollowingList(): void {
    const container = this.followingListContainer;
    if (!container) {
      return;
    }

    const following = this.service.getFollowing();
    container.innerHTML = "";

    if (!following || following.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-gray-400";
      empty.textContent = this.followingLoaded
        ? "You are not following anyone yet. Try adding a username above."
        : "Add players to see them here.";
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const user of following) {
      fragment.appendChild(this.createFollowingListItem(user));
    }

    container.appendChild(fragment);
  }

  private createFollowingListItem(user: FollowedUserSummary): HTMLElement {
    const item = document.createElement("div");
    item.className =
      "flex items-center justify-between gap-4 bg-gray-900/60 border border-cyan-500/20 rounded-lg px-4 py-3";

    const left = document.createElement("div");
    left.className = "flex items-center gap-3 min-w-0";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className =
      "w-10 h-10 rounded-full bg-gray-800 border border-cyan-500/40 flex items-center justify-center overflow-hidden";

    if (user.profile_image_url) {
      const fallback = document.createElement("span");
      fallback.className = "text-sm font-semibold text-cyan-200";
      fallback.textContent = this.derivePlaceholderInitial(user);

      const img = document.createElement("img");
      img.src = AuthService.resolveAssetUrl(user.profile_image_url);
      img.alt = `${user.username}'s avatar`;
      img.className = "w-full h-full object-cover";
      img.decoding = "async";
      img.onerror = () => {
        avatarWrapper.innerHTML = "";
        avatarWrapper.appendChild(fallback);
      };
      avatarWrapper.appendChild(img);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "text-sm font-semibold text-cyan-200";
      placeholder.textContent = this.derivePlaceholderInitial(user);
      avatarWrapper.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "min-w-0";

    const usernameLine = document.createElement("p");
    usernameLine.className = "text-sm font-semibold text-white truncate";
    usernameLine.textContent = user.username;

    const statusLine = document.createElement("div");
    statusLine.className = "flex items-center gap-2 mt-1 text-xs text-gray-400";

    const statusIndicator = document.createElement("span");
    statusIndicator.className =
      "h-2 w-2 rounded-full " +
      (user.is_online ? "bg-emerald-400" : "bg-gray-500");

    const statusText = document.createElement("span");
    statusText.textContent = user.is_online ? "Online" : "Offline";

    statusLine.appendChild(statusIndicator);
    statusLine.appendChild(statusText);

    info.append(usernameLine, statusLine);

    left.append(avatarWrapper, info);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className =
      "text-xs font-semibold text-red-300 hover:text-red-200 border border-red-400/40 px-3 py-1.5 rounded transition disabled:opacity-60 disabled:cursor-not-allowed";
    removeButton.dataset.followingAction = "remove";
    removeButton.dataset.userId = String(user.id);
    removeButton.textContent = "Remove";
    removeButton.setAttribute(
      "aria-label",
      `Remove ${user.username} from friends list`,
    );

    item.append(left, removeButton);
    return item;
  }

  private populateForm(user: PublicUser): void {
    const sanitizedProfileUrl = (user.profile_image_url ?? "").trim();

    const setInputValue = (id: string, value: string | null) => {
      const element = this.form?.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >(`#${id}`);
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
    this.updateTwoFactorUi(user);
    this.hideTwoFactorCodeEntry(true);
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

  private updateTwoFactorUi(user: PublicUser): void {
    if (this.twoFactorStatusText) {
      this.twoFactorStatusText.textContent = user.two_factor_enabled
        ? "Two-factor authentication is enabled on your account."
        : "Two-factor authentication is currently disabled.";
    }

    const isEnabled = user.two_factor_enabled;
    this.enableTwoFactorButton?.classList.toggle("hidden", isEnabled);
    this.disableTwoFactorButton?.classList.toggle("hidden", !isEnabled);

    if (!isEnabled) {
      this.hideTwoFactorCodeEntry();
    }
  }

  private showTwoFactorCodeEntry(
    message: string,
    expiresInSeconds: number,
  ): void {
    if (!this.twoFactorCodeContainer) {
      return;
    }

    const minutes = Math.max(1, Math.round(expiresInSeconds / 60));
    if (this.twoFactorHelper) {
      this.twoFactorHelper.textContent = `${message} (Expires in approximately ${minutes} minute${minutes === 1 ? "" : "s"}.)`;
    }

    if (this.twoFactorError) {
      this.twoFactorError.classList.add("hidden");
      this.twoFactorError.textContent = "";
    }

    if (this.twoFactorCodeInput) {
      this.twoFactorCodeInput.value = "";
      this.twoFactorCodeInput.focus();
    }

    this.twoFactorCodeContainer.classList.remove("hidden");
  }

  private hideTwoFactorCodeEntry(resetChallenge = false): void {
    if (this.twoFactorCodeContainer) {
      this.twoFactorCodeContainer.classList.add("hidden");
    }
    if (this.twoFactorCodeInput) {
      this.twoFactorCodeInput.value = "";
    }
    if (this.twoFactorError) {
      this.twoFactorError.classList.add("hidden");
      this.twoFactorError.textContent = "";
    }
    if (this.twoFactorHelper && !resetChallenge) {
      this.twoFactorHelper.textContent = "";
    }
    if (resetChallenge) {
      this.twoFactorHelper && (this.twoFactorHelper.textContent = "");
      this.pendingTwoFactorChallenge = null;
      this.pendingTwoFactorPurpose = null;
    }
  }

  private setTwoFactorButtonsDisabled(disabled: boolean): void {
    if (this.enableTwoFactorButton) {
      this.enableTwoFactorButton.disabled = disabled;
    }
    if (this.disableTwoFactorButton) {
      this.disableTwoFactorButton.disabled = disabled;
    }
  }

  private async handleTwoFactorEnable(): Promise<void> {
    const user = this.service.getUser();
    if (!user || user.two_factor_enabled) {
      return;
    }

    this.setTwoFactorButtonsDisabled(true);
    this.hideTwoFactorCodeEntry(true);

    try {
      const challenge = await this.service.startTwoFactorSetup();
      this.pendingTwoFactorChallenge = challenge;
      this.pendingTwoFactorPurpose = "enable";
      this.showTwoFactorCodeEntry(
        challenge.message ||
          "We sent a verification code to your email address.",
        challenge.expiresIn,
      );
      NotificationService.getInstance().info(
        "Check your email and enter the 6-digit code to finish enabling 2FA.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start two-factor setup.";
      NotificationService.getInstance().error(message);
    } finally {
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private async handleTwoFactorDisable(): Promise<void> {
    const user = this.service.getUser();
    if (!user || !user.two_factor_enabled) {
      return;
    }

    const currentPasswordInput =
      this.form?.querySelector<HTMLInputElement>("#current-password");

    const currentPassword = currentPasswordInput?.value ?? "";
    if (!currentPassword) {
      NotificationService.getInstance().warning(
        "Enter your current password before disabling 2FA.",
      );
      currentPasswordInput?.focus();
      return;
    }

    this.setTwoFactorButtonsDisabled(true);
    this.hideTwoFactorCodeEntry(true);

    try {
      const challenge =
        await this.service.startTwoFactorDisable(currentPassword);
      this.pendingTwoFactorChallenge = challenge;
      this.pendingTwoFactorPurpose = "disable";
      this.showTwoFactorCodeEntry(
        challenge.message ||
          "We sent a verification code to your email address.",
        challenge.expiresIn,
      );
      NotificationService.getInstance().info(
        "Enter the 6-digit code from your email to disable 2FA.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start 2FA disable process.";
      NotificationService.getInstance().error(message);
    } finally {
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private async handleTwoFactorVerify(): Promise<void> {
    if (
      !this.pendingTwoFactorChallenge ||
      !this.pendingTwoFactorChallenge.twoFactorToken ||
      !this.pendingTwoFactorPurpose
    ) {
      return;
    }

    const code = this.twoFactorCodeInput?.value.trim() ?? "";
    if (!/^\d{6}$/.test(code)) {
      if (this.twoFactorError) {
        this.twoFactorError.textContent =
          "Enter the 6-digit code that was emailed to you.";
        this.twoFactorError.classList.remove("hidden");
      }
      this.twoFactorCodeInput?.focus();
      return;
    }

    if (this.twoFactorError) {
      this.twoFactorError.classList.add("hidden");
      this.twoFactorError.textContent = "";
    }

    this.setTwoFactorButtonsDisabled(true);
    this.twoFactorVerifyButton && (this.twoFactorVerifyButton.disabled = true);

    try {
      const result = await this.service.verifyTwoFactorCode({
        token: this.pendingTwoFactorChallenge.twoFactorToken,
        code,
      });

      this.pendingTwoFactorChallenge = null;
      const purpose = this.pendingTwoFactorPurpose;
      this.pendingTwoFactorPurpose = null;
      this.hideTwoFactorCodeEntry(true);

      NotificationService.getInstance().success(
        purpose === "enable"
          ? "Two-factor authentication is now enabled."
          : "Two-factor authentication has been disabled.",
      );

      this.updateTwoFactorUi(result.user);
      if (purpose === "disable") {
        const currentPasswordInput =
          this.form?.querySelector<HTMLInputElement>("#current-password");
        if (currentPasswordInput) {
          currentPasswordInput.value = "";
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verification failed.";
      if (this.twoFactorError) {
        this.twoFactorError.textContent = message;
        this.twoFactorError.classList.remove("hidden");
      }
    } finally {
      this.setTwoFactorButtonsDisabled(false);
      if (this.twoFactorVerifyButton) {
        this.twoFactorVerifyButton.disabled = false;
      }
    }
  }

  private handleTwoFactorCancel(): void {
    this.hideTwoFactorCodeEntry(true);
  }

  private derivePlaceholderInitial(user?: {
    username?: string | null;
    email?: string | null;
    id?: number | null;
  }): string {
    const source =
      typeof user?.username === "string" && user.username.trim().length > 0
        ? user.username
        : user?.email || user?.id?.toString() || "";
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

  private handleFollowClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const submitButton = target.closest<HTMLButtonElement>(
      '[data-follow-action="submit"]',
    );

    if (!submitButton) {
      return;
    }

    event.preventDefault();
    void this.submitFollowRequest(submitButton);
  }

  private handleFollowKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.isComposing) {
      return;
    }

    if (!this.followInput) {
      return;
    }

    event.preventDefault();
    const submitButton = this.followControls?.querySelector(
      '[data-follow-action="submit"]',
    ) as HTMLButtonElement | null;

    void this.submitFollowRequest(submitButton);
  }

  private async submitFollowRequest(
    submitButton?: HTMLButtonElement | null,
  ): Promise<void> {
    if (!AuthService.isAuthenticated()) {
      NotificationService.getInstance().info(
        "Please log in to manage your friends list.",
      );
      router.navigate("/login");
      return;
    }

    if (!this.followInput) {
      return;
    }

    const username = this.followInput.value.trim();
    if (username.length === 0) {
      NotificationService.getInstance().info(
        "Please enter a username to follow.",
      );
      return;
    }

    const originalLabel = submitButton?.textContent ?? null;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Adding...";
      }

      const user = await this.service.addFollowing(username);
      this.followInput.value = "";
      this.followInput?.focus();
      this.followingLoaded = true;
      this.renderFollowingList();
      NotificationService.getInstance().success(
        `You are now following ${user.username}!`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to follow that user.";
      NotificationService.getInstance().error(message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        if (originalLabel !== null) {
          submitButton.textContent = originalLabel;
        }
      }
    }
  }

  private async handleFollowingClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const button = target.closest<HTMLButtonElement>(
      '[data-following-action="remove"]',
    );
    if (!button) {
      return;
    }

    event.preventDefault();

    const dataUserId = button.dataset.userId;
    if (!dataUserId) {
      return;
    }

    const userId = Number(dataUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    const followedUser = this.service
      .getFollowing()
      .find((user) => user.id === userId);

    const originalText = button.textContent ?? "";
    button.disabled = true;
    button.textContent = "Removing...";

    try {
      await this.service.removeFollowing(userId);
      this.renderFollowingList();
      const displayName = followedUser?.username ?? "that user";
      NotificationService.getInstance().info(
        `Removed ${displayName} from your friends list.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove that user.";
      NotificationService.getInstance().error(message);
      button.disabled = false;
      button.textContent = originalText;
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
    const element = this.form?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(`#${id}`);
    return element ? element.value.trim() : "";
  }
}

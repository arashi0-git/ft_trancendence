import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import type { FriendSummary } from "../../shared/types/user";
import { escapeHtml } from "../../shared/utils/html-utils";
import { i18next, onLanguageChange } from "../../i18n";

export class FriendsSection {
  private container: HTMLElement;
  private friends: FriendSummary[] = [];
  private friendsLoaded = false;
  private friendForm: HTMLElement | null = null;
  private friendInput: HTMLInputElement | null = null;
  private friendsListContainer: HTMLElement | null = null;
  private boundFriendClickHandler: ((e: Event) => void) | null = null;
  private boundFriendKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundFriendsListClickHandler: ((e: Event) => Promise<void>) | null =
    null;
  private unsubscribeLanguage?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.unsubscribeLanguage = onLanguageChange(() => {
      if (this.friendsLoaded || this.friendForm) {
        this.render();
      }
    });
  }

  render(): void {
    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">
          ${i18next.t("settings.friends.title", "Friends")}
        </h3>
        <div id="friend-form" class="flex gap-2">
          <input
            type="text"
            id="friend-username"
            placeholder="${i18next.t(
              "settings.friends.placeholder",
              "Friend username",
            )}"
            maxlength="20"
            class="flex-1 bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            autocomplete="off"
          />
          <button
            type="button"
            data-friend-action="submit"
            class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition disabled:opacity-60"
          >
            ${i18next.t("settings.friends.addButton", "Add Friend")}
          </button>
        </div>
        <div id="friends-list-container" class="space-y-2">
          ${this.friendsLoaded ? this.renderFriendsList() : this.renderFriendsLoading()}
        </div>
      </section>
    `;

    this.friendForm = this.container.querySelector("#friend-form");
    this.friendInput = this.container.querySelector(
      "#friend-username",
    ) as HTMLInputElement | null;
    this.friendsListContainer = this.container.querySelector(
      "#friends-list-container",
    );

    this.attachListeners();
  }

  private attachListeners(): void {
    if (!this.friendForm || !this.friendInput) {
      console.error("Friends section failed to initialize form elements.");
      return;
    }

    this.boundFriendClickHandler = (e) => this.handleFriendClick(e);
    this.boundFriendKeydownHandler = (e) => this.handleFriendKeydown(e);
    this.boundFriendsListClickHandler = (e) => this.handleFriendsClick(e);

    this.friendForm.addEventListener("click", this.boundFriendClickHandler);
    this.friendInput.addEventListener(
      "keydown",
      this.boundFriendKeydownHandler,
    );

    if (this.friendsListContainer && this.boundFriendsListClickHandler) {
      this.friendsListContainer.addEventListener(
        "click",
        this.boundFriendsListClickHandler,
      );
    }
  }

  private renderFriendsLoading(): string {
    return `<p class="text-xs text-gray-400">${i18next.t(
      "settings.friends.loading",
      "Loading friends list...",
    )}</p>`;
  }

  private renderFriendsList(): string {
    if (this.friends.length === 0) {
      return `<p class="text-xs text-gray-400">${i18next.t(
        "settings.friends.empty",
        "You have not added any friends yet.",
      )}</p>`;
    }

    return this.friends
      .map(
        (user) => `
      <div class="flex items-center justify-between p-3 bg-gray-900/40 rounded border border-cyan-500/20">
        <div class="flex items-center space-x-3">
          ${this.renderFriendAvatar(user)}
          <div>
            <p class="text-sm font-semibold text-white">${escapeHtml(user.username)}</p>
            <p class="text-xs text-gray-400">
              ${
                user.is_online
                  ? i18next.t("settings.friends.online", "Online")
                  : i18next.t("settings.friends.offline", "Offline")
              }
            </p>
          </div>
        </div>
        <button
          type="button"
          class="text-xs font-semibold text-red-300 hover:text-red-200 border border-red-400/40 px-3 py-1.5 rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          data-friend-action="remove"
          data-user-id="${user.id}"
          aria-label="${i18next.t("settings.friends.ariaRemove", {
            username: escapeHtml(user.username),
          })}"
        >
          ${i18next.t("settings.friends.removeButton", "Remove")}
        </button>
      </div>
    `,
      )
      .join("");
  }

  private renderFriendAvatar(user: FriendSummary): string {
    const profileImage = (user.profile_image_url ?? "").trim();
    const safeUsername = escapeHtml(user.username);
    const altText = i18next.t("settings.friends.avatarAlt", {
      username: safeUsername,
    });

    if (profileImage.length > 0) {
      const resolvedUrl = AuthService.resolveAssetUrl(profileImage);
      const safeImageSrc =
        resolvedUrl && resolvedUrl.length > 0 ? escapeHtml(resolvedUrl) : "";
      return `
        <div class="w-10 h-10 rounded-full overflow-hidden border border-cyan-500/20">
          <img
            src="${safeImageSrc}"
            alt="${altText}"
            class="w-full h-full object-cover"
          />
        </div>
      `;
    }

    return `
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-cyan-300 font-bold">
        ${escapeHtml(user.username.charAt(0).toUpperCase())}
      </div>
    `;
  }

  private handleFriendClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const submitButton = target.closest<HTMLButtonElement>(
      '[data-friend-action="submit"]',
    );

    if (!submitButton) return;

    event.preventDefault();
    void this.submitFriendRequest(submitButton);
  }

  private handleFriendKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") return;

    const submitButton = this.friendForm?.querySelector(
      '[data-friend-action="submit"]',
    ) as HTMLButtonElement | null;

    event.preventDefault();
    void this.submitFriendRequest(submitButton);
  }

  private async submitFriendRequest(
    submitButton?: HTMLButtonElement | null,
  ): Promise<void> {
    if (!AuthService.isAuthenticated()) {
      console.log("Please log in to manage your friends list.");
      // Use setTimeout to navigate after current operation completes
      setTimeout(() => {
        router.navigate("/login");
      }, 0);
      return;
    }

    const friendInput = this.friendInput;
    if (!friendInput) return;

    const username = friendInput.value.trim();
    if (username.length === 0) {
      return;
    }

    const originalLabel = submitButton?.textContent ?? null;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = i18next.t(
          "settings.friends.adding",
          "Adding...",
        );
      }

      await this.addFriend(username);
      friendInput.value = "";
      friendInput.focus();
      this.friendsLoaded = true;
      this.updateFriendsList();
    } catch (error) {
      NotificationService.getInstance().handleUnexpectedError(
        error,
        i18next.t("settings.friends.errors.addFailed", "Failed to add friend"),
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  }

  private async handleFriendsClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const button = target.closest<HTMLButtonElement>(
      '[data-friend-action="remove"]',
    );
    if (!button) return;

    event.preventDefault();

    const dataUserId = button.dataset.userId;
    if (!dataUserId) return;

    const userId = parseInt(dataUserId, 10);
    if (isNaN(userId)) return;

    const originalText =
      button.textContent ??
      i18next.t("settings.friends.removeButton", "Remove");

    button.disabled = true;
    button.textContent = i18next.t("settings.friends.removing", "Removing...");

    try {
      await this.removeFriend(userId);
      this.updateFriendsList();
    } catch (error) {
      NotificationService.getInstance().handleUnexpectedError(
        error,
        i18next.t(
          "settings.friends.errors.removeFailed",
          "Failed to remove friend",
        ),
      );
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  private updateFriendsList(): void {
    if (!this.friendsListContainer) {
      this.friendsListContainer = this.container.querySelector(
        "#friends-list-container",
      );
    }

    if (this.friendsListContainer) {
      this.friendsListContainer.innerHTML = this.renderFriendsList();
    }
  }

  async loadFriends(): Promise<void> {
    try {
      const list = await AuthService.getFriends();
      this.friends = [...list].sort((a, b) =>
        a.username.localeCompare(b.username, undefined, {
          sensitivity: "base",
        }),
      );
      this.friendsLoaded = true;

      if (!this.friendForm) {
        this.render();
        return;
      }

      this.updateFriendsList();
    } catch (error) {
      NotificationService.getInstance().handleUnexpectedError(
        error,
        i18next.t(
          "settings.friends.errors.loadFailed",
          "Failed to load friends list",
        ),
      );
      throw error;
    }
  }

  private async addFriend(username: string): Promise<FriendSummary> {
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
      console.error("Add friend error:", error);
      throw error;
    }
  }

  private async removeFriend(userId: number): Promise<void> {
    try {
      await AuthService.removeFriend(userId);
      this.friends = this.friends.filter((user) => user.id !== userId);
    } catch (error) {
      console.error("Remove friend error:", error);
      throw error;
    }
  }

  destroy(): void {
    if (this.friendForm && this.boundFriendClickHandler) {
      this.friendForm.removeEventListener(
        "click",
        this.boundFriendClickHandler,
      );
    }
    if (this.friendInput && this.boundFriendKeydownHandler) {
      this.friendInput.removeEventListener(
        "keydown",
        this.boundFriendKeydownHandler,
      );
    }
    if (this.friendsListContainer && this.boundFriendsListClickHandler) {
      this.friendsListContainer.removeEventListener(
        "click",
        this.boundFriendsListClickHandler,
      );
    }

    this.friends = [];
    this.friendsLoaded = false;
    this.friendForm = null;
    this.friendInput = null;
    this.friendsListContainer = null;
    this.boundFriendClickHandler = null;
    this.boundFriendKeydownHandler = null;
    this.boundFriendsListClickHandler = null;
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = undefined;
  }
}

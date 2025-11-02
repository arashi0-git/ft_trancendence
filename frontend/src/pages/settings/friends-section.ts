import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";
import type { FriendSummary } from "../../shared/types/user";

export class FriendsSection {
  private container: HTMLElement;
  private friends: FriendSummary[] = [];
  private friendsLoaded = false;
  private friendForm: HTMLElement | null = null;
  private friendInput: HTMLInputElement | null = null;
  private friendsListContainer: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(): void {
    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">Friends</h3>
        <div id="friend-form" class="flex gap-2">
          <input
            type="text"
            id="friend-username"
            placeholder="Friend username"
            class="flex-1 bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            autocomplete="off"
          />
          <button
            type="button"
            data-friend-action="submit"
            class="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition disabled:opacity-60"
          >
            Add Friend
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

    this.friendForm.addEventListener("click", (e) => this.handleFriendClick(e));
    this.friendInput.addEventListener("keydown", (e) =>
      this.handleFriendKeydown(e),
    );

    this.friendsListContainer?.addEventListener("click", (e) =>
      this.handleFriendsClick(e),
    );
  }

  private renderFriendsLoading(): string {
    return `<p class="text-xs text-gray-400">Loading friends list...</p>`;
  }

  private renderFriendsList(): string {
    if (this.friends.length === 0) {
      return `<p class="text-xs text-gray-400">You have not added any friends yet.</p>`;
    }

    return this.friends
      .map(
        (user) => `
      <div class="flex items-center justify-between p-3 bg-gray-900/40 rounded border border-cyan-500/20">
        <div class="flex items-center space-x-3">
          ${this.renderFriendAvatar(user)}
          <div>
            <p class="text-sm font-semibold text-white">${user.username}</p>
            <p class="text-xs text-gray-400">${user.is_online ? "Online" : "Offline"}</p>
          </div>
        </div>
        <button
          type="button"
          class="text-xs font-semibold text-red-300 hover:text-red-200 border border-red-400/40 px-3 py-1.5 rounded transition disabled:opacity-60 disabled:cursor-not-allowed"
          data-friend-action="remove"
          data-user-id="${user.id}"
          aria-label="Remove ${user.username} from friends list"
        >
          Remove
        </button>
      </div>
    `,
      )
      .join("");
  }

  private renderFriendAvatar(user: FriendSummary): string {
    const profileImage = (user.profile_image_url ?? "").trim();

    if (profileImage.length > 0) {
      const imageUrl = AuthService.resolveAssetUrl(profileImage);
      return `
        <div class="w-10 h-10 rounded-full overflow-hidden border border-cyan-500/20">
          <img
            src="${imageUrl}"
            alt="${user.username}'s avatar"
            class="w-full h-full object-cover"
          />
        </div>
      `;
    }

    return `
      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-cyan-300 font-bold">
        ${user.username.charAt(0).toUpperCase()}
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
      NotificationService.getInstance().info(
        "Please log in to manage your friends list.",
      );
      router.navigate("/login");
      return;
    }

    const friendInput = this.friendInput;
    if (!friendInput) return;

    const username = friendInput.value.trim();
    if (username.length === 0) {
      NotificationService.getInstance().info("Please enter a username to add.");
      return;
    }

    const originalLabel = submitButton?.textContent ?? null;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Adding...";
      }

      const user = await this.addFriend(username);
      friendInput.value = "";
      friendInput.focus();
      this.friendsLoaded = true;
      this.updateFriendsList();
      NotificationService.getInstance().success(
        `Added ${user.username} to your friends list!`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add that friend.";
      NotificationService.getInstance().error(message);
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

    const friend = this.friends.find((u) => u.id === userId);
    const originalText = button.textContent ?? "Remove";

    button.disabled = true;
    button.textContent = "Removing...";

    try {
      await this.removeFriend(userId);
      this.updateFriendsList();
      const displayName = friend?.username ?? "that user";
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
      console.error("Failed to load friends list:", error);
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
    this.friends = [];
    this.friendsLoaded = false;
    this.friendForm = null;
    this.friendInput = null;
    this.friendsListContainer = null;
  }
}

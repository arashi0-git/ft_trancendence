import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import type { PublicUser } from "../../shared/types/user";

export class ProfileSection {
  private container: HTMLElement;
  private user: PublicUser | null = null;
  private selectedFile: File | null = null;
  private avatarPreviewUrl: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(user: PublicUser): void {
    this.user = user;
    const sanitizedProfileUrl = (user.profile_image_url ?? "").trim();

    this.container.innerHTML = `
      <section class="space-y-4">
        <h3 class="text-lg font-semibold text-cyan-200">Profile</h3>
        <div class="flex items-center space-x-4">
          <div class="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <img
              id="profile-image-preview"
              src="${sanitizedProfileUrl ? AuthService.resolveAssetUrl(sanitizedProfileUrl) : ""}"
              alt="Profile"
              class="w-full h-full object-cover ${sanitizedProfileUrl ? "" : "hidden"}"
            />
            <div
              id="profile-image-placeholder"
              class="text-4xl font-bold text-cyan-300 ${sanitizedProfileUrl ? "hidden" : ""}"
            >
              ${this.derivePlaceholderInitial(user)}
            </div>
          </div>
          <div class="flex-1">
            <label
              for="profile-image-input"
              class="cursor-pointer inline-block bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded transition"
            >
              Choose Image
            </label>
            <input
              type="file"
              id="profile-image-input"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              class="hidden"
            />
            <p class="text-xs text-gray-400 mt-2">PNG, JPG, WEBP (max 5MB)</p>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm text-gray-300 mb-1" for="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value="${user.username}"
            class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            autocomplete="username"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm text-gray-300 mb-1" for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value="${user.email}"
            class="w-full bg-gray-900/70 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            autocomplete="email"
          />
        </div>
      </section>
    `;

    this.attachListeners();
  }

  private attachListeners(): void {
    const fileInput = document.getElementById(
      "profile-image-input",
    ) as HTMLInputElement;
    fileInput?.addEventListener("change", (e) => this.handleAvatarChange(e));
  }

  private async handleAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      NotificationService.getInstance().error(
        "Image size must be less than 5MB",
      );
      input.value = "";
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      NotificationService.getInstance().error(
        "Only PNG, JPG, and WEBP images are allowed",
      );
      input.value = "";
      return;
    }

    this.selectedFile = file;
    this.revokePreviewUrl();

    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreviewUrl = e.target?.result as string;
      this.updateAvatarPreview(this.avatarPreviewUrl);
    };
    reader.readAsDataURL(file);
  }

  private updateAvatarPreview(url: string | null): void {
    const img = document.getElementById(
      "profile-image-preview",
    ) as HTMLImageElement | null;
    const placeholder = document.getElementById(
      "profile-image-placeholder",
    ) as HTMLElement | null;

    if (!img || !placeholder) return;

    if (url) {
      img.src = url;
      img.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } else {
      img.classList.add("hidden");
      placeholder.classList.remove("hidden");
      placeholder.textContent = this.derivePlaceholderInitial(
        this.user ?? undefined,
      );
    }
  }

  private derivePlaceholderInitial(user?: PublicUser): string {
    const source = user?.username
      ? user.username
      : user?.email || user?.id?.toString() || "";
    const initial = source.trim().charAt(0);
    return initial ? initial.toUpperCase() : "👤";
  }

  private revokePreviewUrl(): void {
    if (this.avatarPreviewUrl) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
    }
  }

  async uploadAvatar(): Promise<PublicUser | null> {
    if (!this.selectedFile) return null;

    try {
      const response = await AuthService.uploadAvatar(this.selectedFile);
      this.selectedFile = null;
      this.revokePreviewUrl();

      const fileInput = document.getElementById(
        "profile-image-input",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      return response.user;
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      throw error;
    }
  }

  getFormData(): { username?: string; email?: string } {
    const username = (
      document.getElementById("username") as HTMLInputElement
    )?.value.trim();
    const email = (
      document.getElementById("email") as HTMLInputElement
    )?.value.trim();

    return { username, email };
  }

  hasAvatarChange(): boolean {
    return this.selectedFile !== null;
  }

  destroy(): void {
    this.revokePreviewUrl();
    this.selectedFile = null;
  }
}

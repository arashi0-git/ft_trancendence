import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { TwoFactorVerification } from "../../shared/components/two-factor-verification";
import type {
  PublicUser,
  TwoFactorChallengeResponse,
  TwoFactorVerificationResponse,
} from "../../shared/types/user";

export class SecuritySection {
  private container: HTMLElement;
  private user: PublicUser | null = null;
  private twoFactorDialog: HTMLElement | null = null;
  private twoFactorComponent: TwoFactorVerification | null = null;
  private activeTwoFactorChallenge: TwoFactorChallengeResponse | null = null;
  private pendingTwoFactorCallback:
    | ((result: TwoFactorVerificationResponse) => void)
    | null = null;
  private onUserUpdate: (user: PublicUser) => void;
  private onEmailRestore: () => void;

  constructor(
    container: HTMLElement,
    onUserUpdate: (user: PublicUser) => void,
    onEmailRestore: () => void,
  ) {
    this.container = container;
    this.onUserUpdate = onUserUpdate;
    this.onEmailRestore = onEmailRestore;
  }

  render(user: PublicUser): void {
    this.user = user;
    const twoFactorStatus = user.two_factor_enabled
      ? "Two-factor authentication is <strong>enabled</strong>. Your account is protected with an extra layer of security."
      : "Two-factor authentication is <strong>disabled</strong>. Enable it for additional account security.";

    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">Security</h3>
        <p class="text-xs text-gray-400">
          Leave the password fields blank to keep your current password. When changing your password, provide your current password for verification.
        </p>
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
        <div class="grid gap-4 sm:grid-cols-2">
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
        </div>

        <div class="border border-cyan-500/30 rounded-lg p-4 bg-gray-900/40 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 class="text-md font-semibold text-cyan-200">Two-Factor Authentication (2FA)</h4>
              <p id="twofactor-status-text" class="text-xs text-gray-400">
                ${twoFactorStatus}
              </p>
            </div>
            <div class="flex gap-2">
              ${!user.two_factor_enabled ? `<button type="button" id="enable-2fa-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition disabled:opacity-60">Enable 2FA</button>` : ""}
              ${user.two_factor_enabled ? `<button type="button" id="disable-2fa-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition disabled:opacity-60">Disable 2FA</button>` : ""}
            </div>
          </div>
        </div>
      </section>

      <!-- Two-Factor Dialog -->
      <div id="twofactor-dialog" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="w-full max-w-md" id="twofactor-dialog-content"></div>
      </div>
    `;

    this.twoFactorDialog = document.getElementById("twofactor-dialog");
    this.attachListeners();
  }

  private attachListeners(): void {
    document
      .getElementById("enable-2fa-btn")
      ?.addEventListener("click", () => this.handleTwoFactorEnable());
    document
      .getElementById("disable-2fa-btn")
      ?.addEventListener("click", () => this.handleTwoFactorDisable());
  }

  private async handleTwoFactorEnable(): Promise<void> {
    if (!this.user || this.user.two_factor_enabled) return;

    this.setTwoFactorButtonsDisabled(true);

    try {
      const response = await fetch(`${this.getApiUrl()}/auth/2fa/setup`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to enable two-factor");
      }

      if (result.token) {
        localStorage.setItem("auth_token", result.token);
      }

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        NotificationService.getInstance().info(
          "Enter the verification code we emailed you.",
        );
        this.showTwoFactorDialog(result, () => {
          NotificationService.getInstance().success(
            "Two-factor authentication is now enabled.",
          );
        });
      } else {
        NotificationService.getInstance().success(
          "Two-factor authentication is now enabled.",
        );
        if (result.user) {
          this.onUserUpdate(result.user);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to enable two-factor authentication.";
      NotificationService.getInstance().error(message);
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private async handleTwoFactorDisable(): Promise<void> {
    if (!this.user || !this.user.two_factor_enabled) return;

    this.setTwoFactorButtonsDisabled(true);

    try {
      const response = await fetch(`${this.getApiUrl()}/auth/2fa/disable`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to disable two-factor");
      }

      if (result.token) {
        localStorage.setItem("auth_token", result.token);
      }

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        NotificationService.getInstance().info(
          "Enter the verification code we emailed you.",
        );
        this.showTwoFactorDialog(result, () => {
          NotificationService.getInstance().success(
            "Two-factor authentication has been disabled.",
          );
        });
      } else {
        NotificationService.getInstance().success(
          "Two-factor authentication has been disabled.",
        );
        if (result.user) {
          this.onUserUpdate(result.user);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to disable two-factor authentication.";
      NotificationService.getInstance().error(message);
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private showTwoFactorDialog(
    challenge: TwoFactorChallengeResponse,
    onSuccess: (result: TwoFactorVerificationResponse) => void,
  ): void {
    this.activeTwoFactorChallenge = challenge;
    this.pendingTwoFactorCallback = onSuccess;

    if (challenge.user) {
      this.user = challenge.user;
      this.updateTwoFactorUi(challenge.user);
    }

    const dialogContent = document.getElementById("twofactor-dialog-content");
    if (!dialogContent) return;

    dialogContent.innerHTML = "";
    this.twoFactorComponent = new TwoFactorVerification(dialogContent, {
      mode: "modal",
      message: this.buildTwoFactorMessage(challenge),
      resendLabel: "Resend Code",
      cancelLabel: "Cancel",
      onSubmit: async (code) => {
        await this.handleTwoFactorVerificationSubmit(code);
      },
      onResend: async () => {
        await this.handleTwoFactorVerificationResend();
      },
      onCancel: () => {
        this.handleTwoFactorDialogCancel();
      },
    });

    this.twoFactorDialog?.classList.remove("hidden");
  }

  private hideTwoFactorDialog(): void {
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;

    if (this.twoFactorDialog) {
      this.twoFactorDialog.classList.add("hidden");
    }
    this.activeTwoFactorChallenge = null;
    this.pendingTwoFactorCallback = null;
    this.setTwoFactorButtonsDisabled(false);
  }

  private async handleTwoFactorVerificationSubmit(code: string): Promise<void> {
    if (!this.activeTwoFactorChallenge?.twoFactorToken) {
      throw new Error("Two-factor challenge missing.");
    }

    const result = await AuthService.verifyTwoFactorCode({
      token: this.activeTwoFactorChallenge.twoFactorToken,
      code,
    });

    this.hideTwoFactorDialog();

    if (result.user) {
      this.onUserUpdate(result.user);
    }

    if (this.pendingTwoFactorCallback) {
      this.pendingTwoFactorCallback(result);
    } else {
      NotificationService.getInstance().success(
        "Two-factor verification complete.",
      );
    }
  }

  private async handleTwoFactorVerificationResend(): Promise<void> {
    if (!this.activeTwoFactorChallenge?.twoFactorToken) {
      throw new Error("Cannot resend code without an active challenge.");
    }

    const refreshedChallenge = await AuthService.resendTwoFactorCode(
      this.activeTwoFactorChallenge.twoFactorToken,
    );

    this.activeTwoFactorChallenge = refreshedChallenge;

    if (refreshedChallenge.user) {
      this.user = refreshedChallenge.user;
      this.updateTwoFactorUi(refreshedChallenge.user);
    }

    if (this.twoFactorComponent) {
      this.twoFactorComponent.updateMessage(
        this.buildTwoFactorMessage(refreshedChallenge),
      );
      this.twoFactorComponent.resetCode();
      this.twoFactorComponent.focus();
      const feedbackMessage = refreshedChallenge.destination
        ? `Sent a new verification code to ${refreshedChallenge.destination}.`
        : "Sent a new verification code to your email.";
      this.twoFactorComponent.showFeedback(feedbackMessage, "success");
    }
  }

  private handleTwoFactorDialogCancel(): void {
    if (this.activeTwoFactorChallenge?.purpose === "email_change") {
      this.onEmailRestore();
    }

    this.hideTwoFactorDialog();
    NotificationService.getInstance().info(
      "Two-factor verification canceled. Your changes were not applied.",
    );
  }

  private buildTwoFactorMessage(challenge: TwoFactorChallengeResponse): string {
    const trimmed = challenge.message?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }

    if (challenge.destination) {
      return `We sent a verification code to ${challenge.destination}. Enter it to continue.`;
    }

    return "Enter the 6-digit code from your email.";
  }

  private updateTwoFactorUi(user: PublicUser): void {
    const statusText = document.getElementById("twofactor-status-text");
    if (statusText) {
      statusText.innerHTML = user.two_factor_enabled
        ? "Two-factor authentication is <strong>enabled</strong>. Your account is protected with an extra layer of security."
        : "Two-factor authentication is <strong>disabled</strong>. Enable it for additional account security.";
    }

    this.render(user);
  }

  private setTwoFactorButtonsDisabled(disabled: boolean): void {
    const enableBtn = document.getElementById(
      "enable-2fa-btn",
    ) as HTMLButtonElement;
    const disableBtn = document.getElementById(
      "disable-2fa-btn",
    ) as HTMLButtonElement;

    if (enableBtn) enableBtn.disabled = disabled;
    if (disableBtn) disableBtn.disabled = disabled;
  }

  getPasswordData(): {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  } {
    const currentPassword = (
      document.getElementById("current-password") as HTMLInputElement
    )?.value.trim();
    const newPassword = (
      document.getElementById("new-password") as HTMLInputElement
    )?.value.trim();
    const confirmPassword = (
      document.getElementById("confirm-password") as HTMLInputElement
    )?.value.trim();

    return { currentPassword, newPassword, confirmPassword };
  }

  showTwoFactorDialogForEmailChange(
    challenge: TwoFactorChallengeResponse,
    onSuccess: (result: TwoFactorVerificationResponse) => void,
  ): void {
    this.showTwoFactorDialog(challenge, onSuccess);
  }

  private getApiUrl(): string {
    return (
      (typeof (window as any).__API_BASE_URL__ !== "undefined" &&
        (window as any).__API_BASE_URL__) ||
      process.env.API_BASE_URL ||
      "/api"
    );
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  destroy(): void {
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;
    this.activeTwoFactorChallenge = null;
    this.pendingTwoFactorCallback = null;
  }
}

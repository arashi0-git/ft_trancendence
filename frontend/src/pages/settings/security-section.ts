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
  private listeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

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
    this.removeListeners();
    this.user = user;
    const twoFactorStatus = user.two_factor_enabled
      ? "Two-factor authentication is <strong>enabled</strong>. Your account is protected with an extra layer of security."
      : "Two-factor authentication is <strong>disabled</strong>. Enable it for additional account security.";

    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">Security - Two-Factor Authentication (2FA)</h3>
        <div class="border border-cyan-500/30 rounded-lg p-4 bg-gray-900/40 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p id="twofactor-status-text" class="text-sm text-gray-300">
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
      <div id="twofactor-dialog" class="hidden fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-96">
        <div class="w-full max-w-md" id="twofactor-dialog-content"></div>
      </div>
    `;

    this.twoFactorDialog = document.getElementById("twofactor-dialog");
    this.attachListeners();
  }

  private attachListeners(): void {
    const enableBtn = document.getElementById("enable-2fa-btn");
    const disableBtn = document.getElementById("disable-2fa-btn");

    if (enableBtn) {
      const handler: EventListener = () => this.handleTwoFactorEnable();
      enableBtn.addEventListener("click", handler);
      this.listeners.push({ element: enableBtn, event: "click", handler });
    }

    if (disableBtn) {
      const handler: EventListener = () => this.handleTwoFactorDisable();
      disableBtn.addEventListener("click", handler);
      this.listeners.push({ element: disableBtn, event: "click", handler });
    }
  }

  private removeListeners(): void {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
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
        this.setTwoFactorButtonsDisabled(false);
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
        this.setTwoFactorButtonsDisabled(false);
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

    try {
      const result = await AuthService.verifyTwoFactorCode({
        token: this.activeTwoFactorChallenge.twoFactorToken,
        code,
      });

      const pendingCallback = this.pendingTwoFactorCallback;
      this.hideTwoFactorDialog();

      if (result.user) {
        this.onUserUpdate(result.user);
      }

      if (pendingCallback) {
        pendingCallback(result);
      } else {
        NotificationService.getInstance().success(
          "Two-factor verification complete.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Verification failed. Please try again.";
      NotificationService.getInstance().error(message);
      this.twoFactorComponent?.showFeedback(message, "error");
      this.twoFactorComponent?.resetCode();
      this.twoFactorComponent?.focus();
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

    if (this.activeTwoFactorChallenge) {
      this.setTwoFactorButtonsDisabled(true);
    }
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

  showTwoFactorDialogForEmailChange(
    challenge: TwoFactorChallengeResponse,
    onSuccess: (result: TwoFactorVerificationResponse) => void,
  ): void {
    this.showTwoFactorDialog(challenge, onSuccess);
  }

  private getApiUrl(): string {
    if (typeof window !== "undefined") {
      const browserWindow = window as typeof window & {
        __API_BASE_URL__?: string;
      };
      const browserBase = browserWindow.__API_BASE_URL__;
      if (typeof browserBase !== "undefined" && browserBase) {
        return browserBase;
      }
    }

    const envBase = process.env.API_BASE_URL;
    if (envBase) {
      return envBase;
    }

    return "/api";
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
    this.removeListeners();
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;
    this.activeTwoFactorChallenge = null;
    this.pendingTwoFactorCallback = null;
  }
}

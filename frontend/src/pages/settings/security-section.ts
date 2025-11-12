import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { TwoFactorVerification } from "../../shared/components/two-factor-verification";
import type {
  PublicUser,
  TwoFactorChallengeDetails,
  TwoFactorVerificationResponse,
} from "../../shared/types/user";
import { i18next, onLanguageChange } from "../../i18n";

export class SecuritySection {
  private container: HTMLElement;
  private user: PublicUser | null = null;
  private twoFactorDialog: HTMLElement | null = null;
  private twoFactorComponent: TwoFactorVerification | null = null;
  private activeTwoFactorChallenge: TwoFactorChallengeDetails | null = null;
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
  private unsubscribeLanguage?: () => void;

  constructor(
    container: HTMLElement,
    onUserUpdate: (user: PublicUser) => void,
    onEmailRestore: () => void,
  ) {
    this.container = container;
    this.onUserUpdate = onUserUpdate;
    this.onEmailRestore = onEmailRestore;
    this.unsubscribeLanguage = onLanguageChange(() => {
      if (!this.user) {
        return;
      }

      const activeChallenge = this.activeTwoFactorChallenge;
      const pendingCallback = this.pendingTwoFactorCallback;

      this.render(this.user);

      if (activeChallenge) {
        const successHandler =
          pendingCallback ??
          ((result: TwoFactorVerificationResponse) => {
            if (result.user) {
              this.onUserUpdate(result.user);
            }
            NotificationService.getInstance().success(
              i18next.t("notifications.twoFactorVerified"),
            );
          });

        this.showTwoFactorDialog(activeChallenge, successHandler);
      }
    });
  }

  render(user: PublicUser): void {
    this.removeListeners();
    this.user = user;
    const twoFactorStatus = user.two_factor_enabled
      ? i18next.t("settings.security.statusEnabled")
      : i18next.t("settings.security.statusDisabled");

    this.container.innerHTML = `
      <section class="space-y-4 border-t border-gray-700 pt-4">
        <h3 class="text-lg font-semibold text-cyan-200">
          ${i18next.t(
            "settings.security.title",
            "Security - Two-Factor Authentication (2FA)",
          )}
        </h3>
        <div class="border border-cyan-500/30 rounded-lg p-4 bg-gray-900/40 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p id="twofactor-status-text" class="text-sm text-gray-300">
                ${twoFactorStatus}
              </p>
            </div>
            <div class="flex gap-2">
              ${!user.two_factor_enabled ? `<button type="button" id="enable-2fa-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition disabled:opacity-60">${i18next.t("settings.security.enableButton", "Enable 2FA")}</button>` : ""}
              ${user.two_factor_enabled ? `<button type="button" id="disable-2fa-btn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition disabled:opacity-60">${i18next.t("settings.security.disableButton", "Disable 2FA")}</button>` : ""}
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
      const result = await AuthService.enableTwoFactor();
      const successMessage = i18next.t("notifications.twoFactorEnabled");

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        this.showTwoFactorDialog(result, () => {
          NotificationService.getInstance().success(successMessage);
        });
        return;
      }

      if (result.user) {
        this.user = result.user;
        this.updateTwoFactorUi(result.user);
        this.onUserUpdate(result.user);
        NotificationService.getInstance().success(successMessage);
      } else {
        throw new Error("Failed to enable two-factor: missing user data");
      }
    } catch (error) {
      NotificationService.getInstance().apiError(error, {
        fallbackMessage: i18next.t(
          "settings.security.errors.enableFailed",
          "Failed to enable two-factor authentication.",
        ),
      });
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private async handleTwoFactorDisable(): Promise<void> {
    if (!this.user || !this.user.two_factor_enabled) return;

    this.setTwoFactorButtonsDisabled(true);

    try {
      const result = await AuthService.disableTwoFactor();
      const successMessage = i18next.t("notifications.twoFactorDisabled");

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        this.showTwoFactorDialog(result, () => {
          NotificationService.getInstance().success(successMessage);
        });
        return;
      }

      if (result.user) {
        this.user = result.user;
        this.updateTwoFactorUi(result.user);
        this.onUserUpdate(result.user);
        NotificationService.getInstance().success(successMessage);
      } else {
        throw new Error("Failed to disable two-factor: missing user data");
      }
    } catch (error) {
      NotificationService.getInstance().apiError(error, {
        fallbackMessage: i18next.t(
          "settings.security.errors.disableFailed",
          "Failed to disable two-factor authentication.",
        ),
      });
      this.setTwoFactorButtonsDisabled(false);
    }
  }

  private showTwoFactorDialog(
    challenge: TwoFactorChallengeDetails,
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
      resendLabel: i18next.t("settings.security.dialog.resend", "Resend Code"),
      cancelLabel: i18next.t("settings.security.dialog.cancel", "Cancel"),
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
          i18next.t("notifications.twoFactorVerified"),
        );
      }
    } catch (error) {
      console.error("Two-factor verification failed:", error);
      NotificationService.getInstance().apiError(error, {
        fallbackMessage: i18next.t(
          "settings.security.errors.invalidCode",
          "Invalid verification code. Please try again.",
        ),
      });
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
    }

    const feedbackMessage = refreshedChallenge.destination
      ? i18next.t("notifications.twoFactorResendDestination", {
          destination: refreshedChallenge.destination,
        })
      : i18next.t("notifications.twoFactorResendGeneric");
    NotificationService.getInstance().success(feedbackMessage);
  }

  private handleTwoFactorDialogCancel(): void {
    if (this.activeTwoFactorChallenge?.purpose === "email_change") {
      this.onEmailRestore();
    }
    this.hideTwoFactorDialog();
  }

  private buildTwoFactorMessage(challenge: TwoFactorChallengeDetails): string {
    const purposeKeyMap: Partial<
      Record<TwoFactorChallengeDetails["purpose"], string>
    > = {
      login: "settings.security.dialog.loginMessage",
      enable_2fa: "settings.security.dialog.enableMessage",
      disable_2fa: "settings.security.dialog.disableMessage",
      email_change: "settings.security.dialog.emailChangeMessage",
    };

    const translationKey = challenge.purpose
      ? purposeKeyMap[challenge.purpose]
      : undefined;
    if (translationKey) {
      const translated = i18next.t(translationKey, {
        destination: challenge.destination,
      });
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    const trimmed = challenge.message?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }

    if (challenge.destination) {
      return i18next.t("settings.security.dialog.emailDestination", {
        destination: challenge.destination,
      });
    }

    return i18next.t(
      "settings.security.dialog.emailFallback",
      i18next.t("notifications.twoFactorCodePrompt"),
    );
  }

  private updateTwoFactorUi(user: PublicUser): void {
    const statusText = document.getElementById("twofactor-status-text");
    if (statusText) {
      statusText.innerHTML = user.two_factor_enabled
        ? i18next.t("settings.security.statusEnabled")
        : i18next.t("settings.security.statusDisabled");
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
    challenge: TwoFactorChallengeDetails,
    onSuccess: (result: TwoFactorVerificationResponse) => void,
  ): void {
    this.showTwoFactorDialog(challenge, onSuccess);
  }

  destroy(): void {
    this.removeListeners();
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;
    this.activeTwoFactorChallenge = null;
    this.pendingTwoFactorCallback = null;
    this.unsubscribeLanguage?.();
    this.unsubscribeLanguage = undefined;
  }
}

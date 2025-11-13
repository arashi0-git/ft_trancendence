import { AuthService } from "../services/auth-service";
import { TwoFactorVerification } from "./two-factor-verification";
import { NotificationService } from "../services/notification.service";
import { i18next } from "../../i18n";
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  PublicUser,
  TwoFactorChallengeDetails,
} from "../types/user";
import { setupPasswordToggles } from "../utils/password-toggle-utils";

interface LoginErrorTranslations {
  required?: string;
  generic?: string;
  invalidCredentials?: string;
  twoFactorInvalid?: string;
  twoFactorUnexpected?: string;
  twoFactorGeneric?: string;
  twoFactorMissing?: string;
}

interface LoginStatusTranslations {
  loggingIn?: string;
  verifying?: string;
}

interface LoginTranslations {
  title?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  passwordPlaceholder?: string;
  submit?: string;
  register?: string;
  home?: string;
  errors?: LoginErrorTranslations;
  status?: LoginStatusTranslations;
}

export class LoginForm {
  private container: HTMLElement;
  private twoFactorChallenge: TwoFactorChallengeDetails | null = null;
  private twoFactorComponent: TwoFactorVerification | null = null;
  private notificationService = NotificationService.getInstance();
  private t: LoginTranslations = {};

  private onLoginSuccessCallback: (user: PublicUser) => void = () => {
    // Default: do nothing. Override via setOnLoginSuccess()
  };

  private onShowRegisterCallback: () => void = () => {
    console.log("Show register form");
  };

  private onShowHomeCallback: () => void = () => {
    console.log("Navigate home from login");
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.t =
      (i18next.t("login", {
        returnObjects: true,
      }) as LoginTranslations) || {};

    this.renderLoginView();
  }

  private renderLoginView(): void {
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;

    this.container.innerHTML = `
      <div class="border border-cyan-500/30 rounded-lg p-6 bg-gray-900/95 shadow-xl backdrop-blur-sm">
        <h2 class="text-2xl font-bold mb-4 text-center text-cyan-200">${this.t.title || "Login"}</h2>
        <form id="login-form" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-200">${this.t.emailLabel || "Email"}</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              maxlength="100"
              class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
              placeholder="${this.t.emailPlaceholder || "Enter your email"}"
            >
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-200">${this.t.passwordLabel || "Password"}</label>
            <div class="mt-1 relative">
              <input
                type="password"
                id="password"
                name="password"
                required
                maxlength="72"
                class="block w-full px-3 py-2 pr-10 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
                placeholder="${this.t.passwordPlaceholder || "Enter your password"}"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Show password"
                data-target="password"
                data-visible="false"
              ></button>
            </div>
          </div>
          <div class="space-y-2">
            <button
              type="submit"
              id="login-submit"
              class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              ${this.t.submit || "Login"}
            </button>
            <button
              type="button"
              id="show-register"
              class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            >
              ${this.t.register || "Don't have an account? Register"}
            </button>
            <button
              type="button"
              id="show-home"
              class="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              ${this.t.home || "Back to Home"}
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachLoginListeners();
    setupPasswordToggles(this.container);
  }

  private renderTwoFactorView(): void {
    if (!this.twoFactorChallenge) {
      this.renderLoginView();
      return;
    }

    this.container.innerHTML = `
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="w-full max-w-md" id="twofactor-login-dialog"></div>
      </div>
    `;

    const dialogContainer = this.container.querySelector(
      "#twofactor-login-dialog",
    ) as HTMLElement | null;

    if (!dialogContainer) {
      console.error("Two-factor dialog container missing for login flow.");
      this.resetTwoFactorFlow();
      return;
    }

    this.twoFactorComponent = new TwoFactorVerification(dialogContainer, {
      message: this.buildTwoFactorMessage(this.twoFactorChallenge),
      resendLabel: i18next.t("login.twoFactor.resend", {
        defaultValue: "Resend email code",
      }),
      cancelLabel: i18next.t("login.twoFactor.cancel", {
        defaultValue: "Back to Login",
      }),
      onSubmit: async (code) => {
        await this.verifyTwoFactorCode(code);
        if (this.twoFactorComponent) {
          this.twoFactorComponent.resetCode();
        }
      },
      onResend: async () => {
        await this.resendTwoFactorCode();
      },
      onCancel: () => {
        this.resetTwoFactorFlow();
      },
    });
    this.twoFactorComponent.focus();
  }

  private attachLoginListeners(): void {
    const form = this.container.querySelector(
      "#login-form",
    ) as HTMLFormElement | null;
    const showRegisterBtn = this.container.querySelector(
      "#show-register",
    ) as HTMLButtonElement | null;
    const showHomeBtn = this.container.querySelector(
      "#show-home",
    ) as HTMLButtonElement | null;

    if (!form || !showRegisterBtn || !showHomeBtn) {
      console.error("Required form elements not found");
      return;
    }

    form.addEventListener("submit", (e) => this.handleLoginSubmit(e));
    showRegisterBtn.addEventListener("click", () =>
      this.onShowRegisterCallback(),
    );
    showHomeBtn.addEventListener("click", () => this.onShowHomeCallback());
  }

  private async handleLoginSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitBtn = this.container.querySelector(
      "#login-submit",
    ) as HTMLButtonElement | null;
    if (!submitBtn) {
      console.error("Required form elements not found");
      return;
    }

    const loginData: LoginRequest = {
      email: (formData.get("email") as string) ?? "",
      password: (formData.get("password") as string) ?? "",
    };

    if (!loginData.email || !loginData.password) {
      this.notificationService.error(
        this.t.errors?.required || "Email and password are required",
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = this.t.status?.loggingIn || "Logging in...";

    try {
      const response = await AuthService.login(loginData);

      if (this.isTwoFactorChallenge(response)) {
        this.twoFactorChallenge = response;
        this.renderTwoFactorView();
        return;
      }

      this.handleLoginSuccess(response);
    } catch (error) {
      console.error("Login failed:", error);
      const fallbackMessage = this.t.errors?.generic || "Login failed";
      this.notificationService.apiError(error, {
        fallbackMessage,
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = this.t.submit || "Login";
    }
  }

  private async verifyTwoFactorCode(code: string): Promise<void> {
    if (!this.twoFactorChallenge?.twoFactorToken) {
      const message =
        this.t.errors?.twoFactorMissing ||
        "Two-factor verification data is missing.";
      this.notificationService.error(message);
      return;
    }

    try {
      const result = await AuthService.verifyTwoFactorCode({
        token: this.twoFactorChallenge.twoFactorToken,
        code,
      });
      this.handleLoginSuccess(result);
    } catch (error) {
      console.error("Login two-factor verification failed:", error);
      const fallbackMessage =
        this.t.errors?.twoFactorGeneric ||
        "Invalid verification code. Please try again.";
      this.notificationService.apiError(error, { fallbackMessage });
    }
  }

  private async resendTwoFactorCode(): Promise<void> {
    if (!this.twoFactorChallenge?.twoFactorToken) {
      throw new Error("Cannot resend code without an active challenge");
    }

    const challenge = await AuthService.resendTwoFactorCode(
      this.twoFactorChallenge.twoFactorToken,
    );
    this.twoFactorChallenge = challenge;

    if (this.twoFactorComponent) {
      this.twoFactorComponent.updateMessage(
        this.buildTwoFactorMessage(challenge),
      );
      this.twoFactorComponent.resetCode();
      this.twoFactorComponent.focus();
    }

    const feedbackMessage = challenge.destination
      ? i18next.t("notifications.twoFactorResendDestination", {
          destination: challenge.destination,
        })
      : i18next.t("notifications.twoFactorResendGeneric");
    this.notificationService.success(feedbackMessage);
  }

  private handleLoginSuccess(response: AuthResponse): void {
    this.resetTwoFactorFlow();
    this.onLoginSuccessCallback(response.user);
  }

  private resetTwoFactorFlow(): void {
    this.twoFactorChallenge = null;
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;
    this.renderLoginView();
  }

  private buildTwoFactorMessage(challenge: TwoFactorChallengeDetails): string {
    const loginMessageKey = "login.twoFactor.message";
    if (i18next.exists(loginMessageKey)) {
      const translated = i18next.t(loginMessageKey, {
        destination: challenge.destination,
      });
      if (translated && translated !== loginMessageKey) {
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
        defaultValue: `We sent a verification code to ${challenge.destination}. Enter it to continue.`,
      });
    }

    return i18next.t("notifications.twoFactorCodePrompt", {
      defaultValue: "Enter the 6-digit code we emailed you to continue.",
    });
  }

  private isTwoFactorChallenge(
    result: AuthResult,
  ): result is TwoFactorChallengeDetails {
    return "requiresTwoFactor" in result && result.requiresTwoFactor === true;
  }

  public setOnLoginSuccess(callback: (user: PublicUser) => void): void {
    this.onLoginSuccessCallback = callback;
  }

  public setOnShowRegister(callback: () => void): void {
    this.onShowRegisterCallback = callback;
  }

  public setOnShowHome(callback: () => void): void {
    this.onShowHomeCallback = callback;
  }
}

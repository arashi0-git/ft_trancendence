import { AuthService } from "../services/auth-service";
import { TwoFactorVerification } from "./two-factor-verification";
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  PublicUser,
  TwoFactorChallengeResponse,
} from "../types/user";
import { setupPasswordToggles } from "../utils/password-toggle-utils";

const eyeIconUrl = new URL("../../../images/icon/eye_icon.png", import.meta.url)
  .href;

export class LoginForm {
  private container: HTMLElement;
  private twoFactorChallenge: TwoFactorChallengeResponse | null = null;
  private twoFactorComponent: TwoFactorVerification | null = null;

  private onLoginSuccessCallback: (user: PublicUser) => void = (user) => {
    console.log("User logged in:", user);
    alert(`Welcome back, ${user?.username || "User"}!`);
  };

  private onShowRegisterCallback: () => void = () => {
    console.log("Show register form");
  };

  private onShowHomeCallback: () => void = () => {
    console.log("Navigate home from login");
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderLoginView();
  }

  private renderLoginView(): void {
    this.twoFactorComponent?.destroy();
    this.twoFactorComponent = null;

    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">Login</h2>
        <form id="login-form" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            >
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="mt-1 relative">
              <input
                type="password"
                id="password"
                name="password"
                required
                class="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Show password"
                data-target="password"
                data-visible="false"
              ></button>
            </div>
          </div>
          <div id="error-message" class="hidden text-red-600 text-sm"></div>
          <div class="space-y-2">
            <button 
              type="submit" 
              id="login-submit"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Login
            </button>
            <button 
              type="button" 
              id="show-register"
              class="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            >
              Don't have an account? Register
            </button>
            <button 
              type="button" 
              id="show-home"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Home
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachLoginListeners();
    setupPasswordToggles(this.container, eyeIconUrl);
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
      mode: "modal",
      message: this.buildTwoFactorMessage(this.twoFactorChallenge),
      resendLabel: "Resend email code",
      cancelLabel: "Back to Login",
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
    const errorDiv = this.container.querySelector(
      "#error-message",
    ) as HTMLDivElement | null;

    if (!submitBtn || !errorDiv) {
      console.error("Required form elements not found");
      return;
    }

    errorDiv.classList.add("hidden");

    const loginData: LoginRequest = {
      email: (formData.get("email") as string) ?? "",
      password: (formData.get("password") as string) ?? "",
    };

    if (!loginData.email || !loginData.password) {
      errorDiv.textContent = "Email and password are required";
      errorDiv.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

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
      errorDiv.textContent =
        error instanceof Error ? error.message : "Login failed";
      errorDiv.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
  }

  private async verifyTwoFactorCode(code: string): Promise<void> {
    if (!this.twoFactorChallenge?.twoFactorToken) {
      throw new Error("Two-factor challenge missing");
    }

    const result = await AuthService.verifyTwoFactorCode({
      token: this.twoFactorChallenge.twoFactorToken,
      code,
    });

    this.handleLoginSuccess(result);
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
      const feedbackMessage = challenge.destination
        ? `We sent another verification code to ${challenge.destination}.`
        : "We sent another verification code to your email.";
      this.twoFactorComponent.resetCode();
      this.twoFactorComponent.focus();
      this.twoFactorComponent.showFeedback(feedbackMessage, "success");
    }
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

  private buildTwoFactorMessage(challenge: TwoFactorChallengeResponse): string {
    const trimmed = challenge.message?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }

    if (challenge.destination) {
      return `We sent a verification code to ${challenge.destination}. Enter it to continue.`;
    }

    return "Enter the 6-digit code we emailed you to continue.";
  }

  private isTwoFactorChallenge(
    result: AuthResult,
  ): result is TwoFactorChallengeResponse {
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

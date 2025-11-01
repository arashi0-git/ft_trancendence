import { AuthService } from "../services/auth-service";
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  PublicUser,
  TwoFactorChallengeResponse,
} from "../types/user";

export class LoginForm {
  private container: HTMLElement;
  private twoFactorChallenge: TwoFactorChallengeResponse | null = null;
  private twoFactorMode: "email" | "app" = "email";

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
            <input
              type="password"
              id="password"
              name="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            >
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
  }

  private renderTwoFactorView(): void {
    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">Two-Factor Verification</h2>
        <p id="twofactor-hint" class="text-sm text-gray-500 mb-2"></p>
        <p
          id="twofactor-feedback"
          class="hidden text-sm text-green-600 mb-4"
          role="status"
        ></p>
        <form id="twofactor-form" class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label
                for="twofactor-code"
                class="text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <button
                type="button"
                id="twofactor-resend"
                class="text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white text-sm">
                Resend email code
              </button>
            </div>
            <input
              type="text"
              id="twofactor-code"
              name="code"
              pattern="\\d{6}"
              maxlength="6"
              required
              inputmode="numeric"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 tracking-widest text-center"
              placeholder="123456"
            >
          </div>
          <div id="twofactor-error" class="hidden text-red-600 text-sm"></div>
          <div class="space-y-2">
            <button
              type="submit"
              id="twofactor-submit"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Verify Code
            </button>
            <button
              type="button"
              id="twofactor-switch-mode"
              class="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            ></button>
            <button
              type="button"
              id="twofactor-cancel"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    `;

    const isAppMode = this.twoFactorMode === "app";
    const hintElement = this.container.querySelector(
      "#twofactor-hint",
    ) as HTMLParagraphElement | null;
    if (hintElement) {
      hintElement.textContent = isAppMode
        ? "If you set up an authenticator app, open it to generate a fresh 6-digit code."
        : "Check your inbox for the 6-digit code we just emailed you.";
    }

    const feedbackElement = this.container.querySelector(
      "#twofactor-feedback",
    ) as HTMLParagraphElement | null;
    if (feedbackElement) {
      feedbackElement.classList.add("hidden");
      feedbackElement.textContent = "";
    }

    const resendButton = this.container.querySelector(
      "#twofactor-resend",
    ) as HTMLButtonElement | null;
    if (resendButton) {
      resendButton.disabled = isAppMode;
      resendButton.textContent = "Resend email code";
    }

    const switchButton = this.container.querySelector(
      "#twofactor-switch-mode",
    ) as HTMLButtonElement | null;
    if (switchButton) {
      switchButton.textContent = isAppMode
        ? "Back to email verification"
        : "Can't get the email code? Try app authentication";
    }

    this.attachTwoFactorListeners();
  }

  private toggleTwoFactorMode(): void {
    this.twoFactorMode = this.twoFactorMode === "email" ? "app" : "email";
    this.renderTwoFactorView();
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

  private attachTwoFactorListeners(): void {
    const form = this.container.querySelector(
      "#twofactor-form",
    ) as HTMLFormElement | null;
    const cancelBtn = this.container.querySelector(
      "#twofactor-cancel",
    ) as HTMLButtonElement | null;
    const switchModeBtn = this.container.querySelector(
      "#twofactor-switch-mode",
    ) as HTMLButtonElement | null;
    const resendBtn = this.container.querySelector(
      "#twofactor-resend",
    ) as HTMLButtonElement | null;

    if (!form || !cancelBtn) {
      console.error("Two-factor form elements not found");
      return;
    }

    form.addEventListener("submit", (e) => this.handleTwoFactorSubmit(e));
    cancelBtn.addEventListener("click", () => this.resetTwoFactorFlow());
    switchModeBtn?.addEventListener("click", () => this.toggleTwoFactorMode());
    resendBtn?.addEventListener("click", () => this.handleTwoFactorResend());
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
        this.twoFactorMode = "email";
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

  private async handleTwoFactorResend(): Promise<void> {
    if (!this.twoFactorChallenge?.twoFactorToken) {
      console.error("Cannot resend code without an active challenge");
      return;
    }

    const resendBtn = this.container.querySelector(
      "#twofactor-resend",
    ) as HTMLButtonElement | null;
    const feedbackElement = this.container.querySelector(
      "#twofactor-feedback",
    ) as HTMLParagraphElement | null;
    const errorDiv = this.container.querySelector(
      "#twofactor-error",
    ) as HTMLDivElement | null;

    if (errorDiv) {
      errorDiv.classList.add("hidden");
      errorDiv.textContent = "";
    }

    if (feedbackElement) {
      feedbackElement.classList.add("hidden");
      feedbackElement.classList.remove("text-red-600");
      feedbackElement.classList.add("text-green-600");
      feedbackElement.textContent = "";
    }

    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.textContent = "Resending...";
    }

    try {
      const challenge = await AuthService.resendTwoFactorCode(
        this.twoFactorChallenge.twoFactorToken,
      );
      this.twoFactorChallenge = challenge;
      if (feedbackElement) {
        feedbackElement.textContent =
          "We sent another verification code to your email.";
        feedbackElement.classList.remove("hidden");
        feedbackElement.classList.remove("text-red-600");
        feedbackElement.classList.add("text-green-600");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resend verification code.";
      if (feedbackElement) {
        feedbackElement.textContent = message;
        feedbackElement.classList.remove("hidden");
        feedbackElement.classList.remove("text-green-600");
        feedbackElement.classList.add("text-red-600");
      }
    } finally {
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend email code";
      }
    }
  }

  private async handleTwoFactorSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.twoFactorChallenge?.twoFactorToken) {
      console.error("Two-factor challenge missing");
      return;
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitBtn = this.container.querySelector(
      "#twofactor-submit",
    ) as HTMLButtonElement | null;
    const errorDiv = this.container.querySelector(
      "#twofactor-error",
    ) as HTMLDivElement | null;

    if (!submitBtn || !errorDiv) {
      console.error("Two-factor form elements missing");
      return;
    }

    errorDiv.classList.add("hidden");

    const code = ((formData.get("code") as string) || "").trim();
    const invalidCodeMessage =
      this.twoFactorMode === "app"
        ? "Enter the 6-digit code from your authenticator app"
        : "Enter the 6-digit code from your email";
    if (!/^\d{6}$/.test(code)) {
      errorDiv.textContent = invalidCodeMessage;
      errorDiv.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      const result = await AuthService.verifyTwoFactorCode({
        token: this.twoFactorChallenge.twoFactorToken,
        code,
      });

      this.handleLoginSuccess(result);
    } catch (error) {
      console.error("Two-factor verification failed:", error);
      errorDiv.textContent =
        error instanceof Error ? error.message : "Verification failed";
      errorDiv.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify Code";
    }
  }

  private handleLoginSuccess(response: AuthResponse): void {
    this.resetTwoFactorFlow();
    this.onLoginSuccessCallback(response.user);
  }

  private resetTwoFactorFlow(): void {
    this.twoFactorChallenge = null;
    this.twoFactorMode = "email";
    this.renderLoginView();
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

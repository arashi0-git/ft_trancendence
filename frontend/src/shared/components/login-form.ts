import { AuthService } from "../services/auth-service";
import type {
  AuthResponse,
  AuthResult,
  LoginRequest,
  PublicUser,
  TwoFactorChallengeResponse,
  TwoFactorStatusResponse,
} from "../types/user";

export class LoginForm {
  private container: HTMLElement;
  private twoFactorChallenge: TwoFactorChallengeResponse | null = null;

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
        <p id="twofactor-message" class="text-sm text-gray-600 mb-4"></p>
        <form id="twofactor-form" class="space-y-4">
          <div>
            <label for="twofactor-code" class="block text-sm font-medium text-gray-700">Verification Code</label>
            <input
              type="text"
              id="twofactor-code"
              name="code"
              pattern="\\d{6}"
              maxlength="6"
              required
              inputmode="numeric"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 tracking-widest text-center"
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
              id="twofactor-cancel"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    `;

    const message =
      this.twoFactorChallenge?.message ||
      "Enter the verification code sent to your email.";
    const messageElement = this.container.querySelector(
      "#twofactor-message",
    ) as HTMLParagraphElement | null;
    if (messageElement) {
      messageElement.textContent = message;
    }

    this.attachTwoFactorListeners();
  }

  private attachLoginListeners(): void {
    const form = document.getElementById(
      "login-form",
    ) as HTMLFormElement | null;
    const showRegisterBtn = document.getElementById(
      "show-register",
    ) as HTMLButtonElement | null;
    const showHomeBtn = document.getElementById(
      "show-home",
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
    const form = document.getElementById(
      "twofactor-form",
    ) as HTMLFormElement | null;
    const cancelBtn = document.getElementById(
      "twofactor-cancel",
    ) as HTMLButtonElement | null;

    if (!form || !cancelBtn) {
      console.error("Two-factor form elements not found");
      return;
    }

    form.addEventListener("submit", (e) => this.handleTwoFactorSubmit(e));
    cancelBtn.addEventListener("click", () => this.resetTwoFactorFlow());
  }

  private async handleLoginSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitBtn = document.getElementById(
      "login-submit",
    ) as HTMLButtonElement | null;
    const errorDiv = document.getElementById(
      "error-message",
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

  private async handleTwoFactorSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.twoFactorChallenge?.twoFactorToken) {
      console.error("Two-factor challenge missing");
      return;
    }

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitBtn = document.getElementById(
      "twofactor-submit",
    ) as HTMLButtonElement | null;
    const errorDiv = document.getElementById(
      "twofactor-error",
    ) as HTMLDivElement | null;

    if (!submitBtn || !errorDiv) {
      console.error("Two-factor form elements missing");
      return;
    }

    errorDiv.classList.add("hidden");

    const code = ((formData.get("code") as string) || "").trim();
    if (!/^\d{6}$/.test(code)) {
      errorDiv.textContent = "Enter the 6-digit code from your email";
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

      if (this.isAuthResponse(result)) {
        this.handleLoginSuccess(result);
        return;
      }

      // Unexpected payload for login flow
      errorDiv.textContent = "Unexpected response while verifying code.";
      errorDiv.classList.remove("hidden");
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
    this.renderLoginView();
  }

  private isTwoFactorChallenge(
    result: AuthResult,
  ): result is TwoFactorChallengeResponse {
    return "requiresTwoFactor" in result && result.requiresTwoFactor === true;
  }

  private isAuthResponse(
    result: AuthResult | TwoFactorStatusResponse,
  ): result is AuthResponse {
    return "token" in result && "user" in result;
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

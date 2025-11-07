import { AuthService } from "../services/auth-service";
import type { CreateUserRequest, PublicUser } from "../types/user";
import type {
  PasswordToggleTranslations,
  RegisterFormTranslations,
  RegisterTranslations,
} from "../types/translations";
import { setupPasswordToggles } from "../utils/password-toggle-utils";
import { i18next } from "../../i18n";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegisterForm {
  private abortController: AbortController;
  private onRegisterSuccess: (user: PublicUser) => void = () => {};
  private onShowLogin: () => void = () => {};
  private onShowHome: () => void = () => {};
  private translations: RegisterFormTranslations = {};

  constructor(private container: HTMLElement) {
    this.abortController = new AbortController();
    const registerTranslations =
      (i18next.t("register", {
        returnObjects: true,
      }) as RegisterTranslations) || {};
    this.translations = registerTranslations.form || {};
    this.render();
  }

  private getPasswordToggleLabels(): PasswordToggleTranslations {
    const defaults: Required<PasswordToggleTranslations> = {
      show: "Show password",
      hide: "Hide password",
    };

    if (!this.translations.passwordToggle) {
      return defaults;
    }

    return {
      show: this.translations.passwordToggle.show || defaults.show,
      hide: this.translations.passwordToggle.hide || defaults.hide,
    };
  }

  private render(): void {
    const passwordToggleLabels = this.getPasswordToggleLabels();
    const heading = this.translations.title || "Create an Account";
    const usernameLabel = this.translations.usernameLabel || "Username";
    const usernamePlaceholder =
      this.translations.usernamePlaceholder || "Choose a username";
    const emailLabel = this.translations.emailLabel || "Email";
    const emailPlaceholder =
      this.translations.emailPlaceholder || "you@example.com";
    const passwordLabel = this.translations.passwordLabel || "Password";
    const passwordPlaceholder =
      this.translations.passwordPlaceholder || "Enter a secure password";
    const passwordHelp =
      this.translations.passwordHelp || "At least 6 characters.";
    const confirmLabel = this.translations.confirmLabel || "Confirm Password";
    const confirmPlaceholder =
      this.translations.confirmPlaceholder || "Re-enter your password";
    const submitLabel = this.translations.submit || "Create account";
    const loginLabel =
      this.translations.login || "Already have an account? Sign in";
    const homeLabel = this.translations.home || "Back to Home";

    this.container.innerHTML = `
      <div class="border border-cyan-500/30 rounded-lg p-6 bg-gray-900/95 shadow-xl backdrop-blur-sm">
        <h2 class="text-2xl font-bold mb-4 text-center text-cyan-200">Create an Account</h2>
        <form id="register-form" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-200">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              minlength="3"
              maxlength="20"
              class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
              placeholder="Choose a username"
            >
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-200">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
              placeholder="you@example.com"
            >
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-200">Password</label>
            <div class="mt-1 relative">
              <input
                type="password"
                id="password"
                name="password"
                required
                minlength="6"
                class="block w-full px-3 py-2 pr-10 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
                placeholder="Enter a secure password"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Show password"
                data-target="password"
                data-visible="false"
              ></button>
            </div>
            <p class="text-xs text-gray-400 mt-1">At least 6 characters.</p>
          </div>
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-200">Confirm Password</label>
            <div class="mt-1 relative">
              <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                required
                class="block w-full px-3 py-2 pr-10 bg-gray-950 border border-cyan-500/40 rounded-md shadow-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400"
                placeholder="Re-enter your password"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Show password"
                data-target="confirm-password"
                data-visible="false"
              ></button>
            </div>
          </div>
          <div id="register-error-message" class="hidden text-red-300 text-sm"></div>
          <div class="space-y-2">
            <button
              type="submit"
              id="register-submit"
              class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              ${submitLabel}
            </button>
            <button
              type="button"
              id="show-login"
              class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            >
              ${loginLabel}
            </button>
            <button
              type="button"
              id="register-show-home"
              class="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              ${homeLabel}
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachEventListeners();
    setupPasswordToggles(this.container);
  }

  private attachEventListeners(): void {
    const form =
      this.container.querySelector<HTMLFormElement>("#register-form");
    const showLoginBtn =
      this.container.querySelector<HTMLButtonElement>("#show-login");
    const showHomeBtn = this.container.querySelector<HTMLButtonElement>(
      "#register-show-home",
    );

    if (!form || !showLoginBtn || !showHomeBtn) {
      console.error("Register form elements not found");
      return;
    }

    form.addEventListener("submit", (event) => this.handleSubmit(event), {
      signal: this.abortController.signal,
    });

    showLoginBtn.addEventListener("click", () => this.onShowLogin(), {
      signal: this.abortController.signal,
    });

    showHomeBtn.addEventListener("click", () => this.onShowHome(), {
      signal: this.abortController.signal,
    });
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = (formData.get("username") as string | null)?.trim() || "";
    const email = (formData.get("email") as string | null)?.trim() || "";
    const password =
      (formData.get("password") as string | null)?.toString() || "";
    const confirmPassword =
      (formData.get("confirm-password") as string | null)?.toString() || "";

    const submitBtn =
      this.container.querySelector<HTMLButtonElement>("#register-submit");
    const errorDiv = this.container.querySelector<HTMLDivElement>(
      "#register-error-message",
    );

    if (!submitBtn || !errorDiv) {
      console.error("Register form controls not found");
      return;
    }

    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");

    const validationError = this.validateFormData(
      username,
      email,
      password,
      confirmPassword,
    );

    if (validationError) {
      errorDiv.textContent = validationError;
      errorDiv.classList.remove("hidden");
      return;
    }

    const submitLabel = this.translations.submit || "Create account";
    const submittingLabel =
      this.translations.status?.submitting || "Creating account...";

    submitBtn.disabled = true;
    submitBtn.textContent = submittingLabel;

    const payload: CreateUserRequest = {
      username,
      email,
      password,
    };

    try {
      const response = await AuthService.register(payload);
      this.onRegisterSuccess(response.user);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : this.translations.errors?.generic || "Registration failed";
      errorDiv.textContent = message;
      errorDiv.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  }

  private validateFormData(
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): string | null {
    const errors = this.translations.errors || {};

    if (!username || !email || !password || !confirmPassword) {
      return errors.required || "All fields are required.";
    }

    if (username.length < 3 || username.length > 20) {
      return (
        errors.usernameLength || "Username must be between 3 and 20 characters."
      );
    }

    if (!emailRegex.test(email)) {
      return errors.emailInvalid || "Please enter a valid email address.";
    }

    if (password.length < 6) {
      return (
        errors.passwordLength || "Password must be at least 6 characters long."
      );
    }

    if (password !== confirmPassword) {
      return errors.passwordMismatch || "Passwords do not match.";
    }

    return null;
  }

  destroy(): void {
    this.abortController.abort();
    this.container.innerHTML = "";
  }

  setOnRegisterSuccess(callback: (user: PublicUser) => void): void {
    this.onRegisterSuccess = callback;
  }

  setOnShowLogin(callback: () => void): void {
    this.onShowLogin = callback;
  }

  setOnShowHome(callback: () => void): void {
    this.onShowHome = callback;
  }
}

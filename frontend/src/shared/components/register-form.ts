import { AuthService } from "../services/auth-service";
import type { CreateUserRequest, PublicUser } from "../types/user";
import { onLanguageChange, translate } from "../../i18n";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const PASSWORD_MIN_LENGTH = 6;

export class RegisterForm {
  private abortController: AbortController;
  private onRegisterSuccess: (user: PublicUser) => void = () => {};
  private onShowLogin: () => void = () => {};
  private onShowHome: () => void = () => {};
  private unsubscribeLanguageChange?: () => void;

  constructor(private container: HTMLElement) {
    this.abortController = new AbortController();
    this.render();
    this.unsubscribeLanguageChange = onLanguageChange(() => {
      this.abortController.abort();
      this.abortController = new AbortController();
      this.render();
    });
  }

  private render(): void {
    const title = translate("register.form.title");
    const usernameLabel = translate("register.form.usernameLabel");
    const usernamePlaceholder = translate("register.form.usernamePlaceholder");
    const emailLabel = translate("register.form.emailLabel");
    const emailPlaceholder = translate("register.form.emailPlaceholder");
    const passwordLabel = translate("register.form.passwordLabel");
    const passwordPlaceholder = translate("register.form.passwordPlaceholder");
    const passwordHint = translate("register.form.passwordHint");
    const confirmPasswordLabel = translate(
      "register.form.confirmPasswordLabel",
    );
    const confirmPasswordPlaceholder = translate(
      "register.form.confirmPasswordPlaceholder",
    );
    const submitLabel = translate("register.form.submit");
    const showLoginLabel = translate("register.form.showLogin");
    const showHomeLabel = translate("register.form.showHome");

    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">${title}</h2>
        <form id="register-form" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">${usernameLabel}</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              minlength="${USERNAME_MIN_LENGTH}"
              maxlength="${USERNAME_MAX_LENGTH}"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="${usernamePlaceholder}"
            >
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">${emailLabel}</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="${emailPlaceholder}"
            >
          </div>
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">${passwordLabel}</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minlength="${PASSWORD_MIN_LENGTH}"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="${passwordPlaceholder}"
            >
            <p class="text-xs text-gray-500 mt-1">${passwordHint}</p>
          </div>
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">${confirmPasswordLabel}</label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="${confirmPasswordPlaceholder}"
            >
          </div>
          <div id="register-error-message" class="hidden text-red-600 text-sm"></div>
          <div class="space-y-2">
            <button
              type="submit"
              id="register-submit"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ${submitLabel}
            </button>
            <button
              type="button"
              id="show-login"
              class="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            >
              ${showLoginLabel}
            </button>
            <button
              type="button"
              id="register-show-home"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              ${showHomeLabel}
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachEventListeners();
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

    submitBtn.disabled = true;
    const submittingLabel = translate("register.form.status.submitting");
    const submitLabel = translate("register.form.submit");
    const genericError = translate("register.form.errors.generic");
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
        error instanceof Error && error.message ? error.message : genericError;
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
    if (!username || !email || !password || !confirmPassword) {
      return translate("register.form.errors.allRequired");
    }

    if (
      username.length < USERNAME_MIN_LENGTH ||
      username.length > USERNAME_MAX_LENGTH
    ) {
      return translate("register.form.errors.usernameLength", {
        min: USERNAME_MIN_LENGTH,
        max: USERNAME_MAX_LENGTH,
      });
    }

    if (!emailRegex.test(email)) {
      return translate("register.form.errors.emailInvalid");
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return translate("register.form.errors.passwordLength", {
        min: PASSWORD_MIN_LENGTH,
      });
    }

    if (password !== confirmPassword) {
      return translate("register.form.errors.passwordMismatch");
    }

    return null;
  }

  destroy(): void {
    this.abortController.abort();
    this.unsubscribeLanguageChange?.();
    this.unsubscribeLanguageChange = undefined;
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

import { AuthService } from "../services/auth-service";
import type { CreateUserRequest, PublicUser } from "../types/user";

const eyeIconUrl = new URL("../../../images/icon/eye_icon.png", import.meta.url)
  .href;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegisterForm {
  private abortController: AbortController;
  private onRegisterSuccess: (user: PublicUser) => void = () => {};
  private onShowLogin: () => void = () => {};
  private onShowHome: () => void = () => {};

  constructor(private container: HTMLElement) {
    this.abortController = new AbortController();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-bold mb-4 text-center">Create an Account</h2>
        <form id="register-form" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              minlength="3"
              maxlength="20"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Choose a username"
            >
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
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
                minlength="6"
                class="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a secure password"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Show password"
                data-target="password"
                data-visible="false"
              ></button>
            </div>
            <p class="text-xs text-gray-500 mt-1">At least 6 characters.</p>
          </div>
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div class="mt-1 relative">
              <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                required
                class="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Re-enter your password"
              >
              <button
                type="button"
                class="password-toggle absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Show password"
                data-target="confirm-password"
                data-visible="false"
              ></button>
            </div>
          </div>
          <div id="register-error-message" class="hidden text-red-600 text-sm"></div>
          <div class="space-y-2">
            <button
              type="submit"
              id="register-submit"
              class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create account
            </button>
            <button
              type="button"
              id="show-login"
              class="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            >
              Already have an account? Sign in
            </button>
            <button
              type="button"
              id="register-show-home"
              class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Home
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachEventListeners();
    this.setupPasswordToggles();
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

  private setupPasswordToggles(): void {
    const toggles =
      this.container.querySelectorAll<HTMLButtonElement>(".password-toggle");

    toggles.forEach((toggle) => {
      const targetId = toggle.dataset.target;
      const input = targetId
        ? this.container.querySelector<HTMLInputElement>(`#${targetId}`)
        : null;

      if (!input) {
        console.warn("Password toggle target not found for register form.");
        return;
      }

      const applyState = (visible: boolean) => {
        input.type = visible ? "text" : "password";
        toggle.dataset.visible = String(visible);
        toggle.setAttribute(
          "aria-label",
          visible ? "Hide password" : "Show password",
        );
        toggle.innerHTML = this.getPasswordToggleIcon(visible);
      };

      const initialVisible = toggle.dataset.visible === "true";
      applyState(initialVisible);

      toggle.addEventListener("click", () => {
        const isVisible = toggle.dataset.visible === "true";
        applyState(!isVisible);
      });
    });
  }

  private getPasswordToggleIcon(isVisible: boolean): string {
    const slashMarkup = isVisible
      ? ""
      : `<span class="absolute block" style="width: 1.35rem; height: 2px; background-color: currentColor; transform: rotate(45deg); border-radius: 9999px;"></span>`;

    return `
      <span class="relative inline-flex h-5 w-5 items-center justify-center">
        <img src="${eyeIconUrl}" alt="" class="pointer-events-none h-5 w-5 object-contain" />
        ${slashMarkup}
      </span>
    `;
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
    submitBtn.textContent = "Creating account...";

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
        error instanceof Error ? error.message : "Registration failed";
      errorDiv.textContent = message;
      errorDiv.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }

  private validateFormData(
    username: string,
    email: string,
    password: string,
    confirmPassword: string,
  ): string | null {
    if (!username || !email || !password || !confirmPassword) {
      return "All fields are required.";
    }

    if (username.length < 3 || username.length > 20) {
      return "Username must be between 3 and 20 characters.";
    }

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters long.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
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

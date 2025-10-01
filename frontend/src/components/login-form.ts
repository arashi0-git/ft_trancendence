import { AuthService } from "../services/auth-service";
import { LoginRequest, User } from "../types/user";

export class LoginForm {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
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
                            class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Don't have an account? Register
                        </button>
                    </div>
                </form>
            </div>
        `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const form = document.getElementById("login-form") as HTMLFormElement;
    const showRegisterBtn = document.getElementById(
      "show-register",
    ) as HTMLButtonElement;

    if (!form || !showRegisterBtn) {
      console.error("Required form elements not found");
      return;
    }

    form.addEventListener("submit", (e) => this.handleSubmit(e));
    showRegisterBtn.addEventListener("click", () => this.onShowRegister());
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const submitBtn = document.getElementById(
      "login-submit",
    ) as HTMLButtonElement;
    const errorDiv = document.getElementById("error-message") as HTMLDivElement;

    if (!submitBtn || !errorDiv) {
      console.error("Required form elements not found");
      return;
    }

    // ボタン無効化
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
    errorDiv.classList.add("hidden");

    try {
      const loginData: LoginRequest = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      };

      if (!loginData.email || !loginData.password) {
        errorDiv.textContent = "Email and password are required";
        errorDiv.classList.remove("hidden");
        return;
      }

      const response = await AuthService.login(loginData);

      console.log("Login successful:", response);

      this.onLoginSuccess(response.user);
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

  private onLoginSuccess(user: User): void {
    console.log("User logged in:", user);
    alert(`Welcome back, ${user?.username || "User"}!`);
  }

  private onShowRegister(): void {
    console.log("Show register form");
  }

  public setOnLoginSuccess(callback: (user: User) => void): void {
    this.onLoginSuccess = callback;
  }

  public setOnShowRegister(callback: () => void): void {
    this.onShowRegister = callback;
  }
}

import { AuthService } from "../../shared/services/auth-service";

export class HomeService {
  navigateToQuickPlay(): void {
    window.history.pushState(null, "", "/quick-play");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToTournament(): void {
    window.history.pushState(null, "", "/tournament");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToLogin(): void {
    window.history.pushState(null, "", "/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  navigateToRegister(): void {
    window.history.pushState(null, "", "/register");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async handleLogout(): Promise<void> {
    await AuthService.logout();
    window.history.pushState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  getAuthButtonsTemplate(): string {
    if (AuthService.isAuthenticated()) {
      return `
        <div class="space-y-2">
          <button id="logout-btn" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">
            Logout
          </button>
        </div>
      `;
    }

    return `
      <div class="space-y-2">
        <button id="login-btn" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
          Login to Account
        </button>
        <button id="register-btn" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded">
          Create Account
        </button>
      </div>
    `;
  }
}

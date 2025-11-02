import { AuthService } from "../services/auth-service";
import { NotificationService } from "../services/notification.service";
import { router } from "../../routes/router";

// グローバルwindowの型拡張
declare global {
  interface Window {
    headerNavigate: (path: string) => void;
    headerLogout: () => Promise<void>;
  }
}

export class AppHeader {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(): void {
    const template = this.getTemplate();
    this.container.innerHTML = template;
  }

  private getTemplate(): string {
    const authButtons = this.getAuthButtonsTemplate();

    return `
      <header class="p-4 bg-transparent">
        <div class="grid grid-cols-3 items-center">
          <div></div>
          <div class="text-center">
            <h1 class="text-3xl font-bold text-white cursor-pointer" id="app-title" onclick="event.stopPropagation(); window.headerNavigate('/');">
              ft_transcendence
            </h1>
            <p class="text-sm text-gray-400 mt-1">The Ultimate Pong Experience</p>
          </div>
          <div class="flex justify-end items-center space-x-3">
            ${authButtons}
          </div>
        </div>
      </header>
    `;
  }

  private getAuthButtonsTemplate(): string {
    // 現在のページパスを取得
    const currentPath = window.location.pathname;

    // ログイン/レジスターページでは認証ボタンを表示しない
    if (currentPath === "/login" || currentPath === "/register") {
      return "";
    }

    // グローバル関数を設定
    window.headerNavigate = (path: string) => {
      router.navigate(path);
    };

    window.headerLogout = async () => {
      try {
        await AuthService.logout();
        NotificationService.getInstance().success("Logged out successfully");
        router.navigate("/");
      } catch (error) {
        console.error("Logout failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred during logout";
        NotificationService.getInstance().error(
          `Logout error: ${errorMessage}`,
        );
        router.navigate("/");
      }
    };

    if (AuthService.isAuthenticated()) {
      return `
        <button id="header-settings-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerNavigate('/settings');">
          Settings
        </button>
        <button id="header-logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerLogout();">
          Logout
        </button>
      `;
    }

    return `
      <button id="header-login-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerNavigate('/login');">
        Login
      </button>
      <button id="header-register-btn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerNavigate('/register');">
        Register
      </button>
    `;
  }

  destroy(): void {
    // イベントリスナーのクリーンアップは自動的に行われる（innerHTML更新時）
  }
}

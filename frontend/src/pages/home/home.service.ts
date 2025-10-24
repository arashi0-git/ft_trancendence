import { AuthService } from "../../shared/services/auth-service";
import { NotificationService } from "../../shared/services/notification.service";
import { router } from "../../routes/router";

export class HomeService {
  navigateToQuickPlay(): void {
    this.navigate("/quick-play");
  }

  navigateToTournament(): void {
    this.navigate("/tournament");
  }

  navigateToAiMode(): void {
    this.navigate("/ai-mode");
  }

  navigateToLogin(): void {
    this.navigate("/login");
  }

  navigateToRegister(): void {
    this.navigate("/register");
  }

  private navigate(path: string): void {
    router.navigate(path);
  }

  async handleLogout(): Promise<void> {
    try {
      await AuthService.logout();
      this.navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // エラーをユーザーに通知
      const errorMessage =
        error instanceof Error
          ? error.message
          : "ログアウト処理でエラーが発生しました";
      NotificationService.getInstance().error(
        `ログアウトエラー: ${errorMessage}`,
      );

      // エラーが発生してもホームに戻る（ローカルトークンは既に削除済み）
      this.navigate("/");
    }
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

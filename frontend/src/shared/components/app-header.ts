import { AuthService } from "../services/auth-service";
import { NotificationService } from "../services/notification.service";
import { router } from "../../routes/router";
import {
  i18next,
  SupportedLanguage,
  setLanguage,
  onLanguageChange,
} from "../../i18n";

export class AppHeader {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    onLanguageChange(this.render.bind(this));
  }

  render(): void {
    const template = this.getTemplate();
    this.container.innerHTML = template;
  }

  private getTemplate(): string {
    const authButtons = this.getAuthButtonsTemplate();
    const title = i18next.t("header.title", "ft_transcendence");

    return `
      <header class="p-4 bg-transparent">
        <div class="grid grid-cols-3 items-center">
          <div></div>
          <div class="text-center">
            <h1 class="text-3xl font-bold text-white cursor-pointer" id="app-title" onclick="event.stopPropagation(); window.headerNavigate('/');">
              ${title}
            </h1>
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
    (window as any).headerNavigate = (path: string) => {
      router.navigate(path);
    };

    (window as any).headerLogout = async () => {
      try {
        await AuthService.logout();
        // Přeložíme text notifikace
        NotificationService.getInstance().success(
          i18next.t("header.logoutSuccess", "ログアウトしました"),
        );
        router.navigate("/");
      } catch (error) {
        console.error("Logout failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : i18next.t(
                "header.logoutErrorFallback",
                "ログアウト処理でエラーが発生しました",
              );

        NotificationService.getInstance().error(
          i18next.t("header.logoutError", "ログアウトエラー: {{message}}", {
            message: errorMessage,
          }),
        );
        router.navigate("/");
      }
    };

    if (AuthService.isAuthenticated()) {
      // Přeložíme texty tlačítek
      const settingsLabel = i18next.t("header.settings", "Settings");
      const logoutLabel = i18next.t("header.logout", "Logout");
      return `
        <button id="header-settings-btn" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerNavigate('/settings');">
          ${settingsLabel}
        </button>
        <button id="header-logout-btn" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerLogout();">
          ${logoutLabel}
        </button>
      `;
    }
    (window as any).toggleHeaderLanguageMenu = () => {
      const menu = document.getElementById("header-language-menu");
      menu?.classList.toggle("hidden");
    };

    if (!(window as any).__headerLanguageMenuListener) {
      window.addEventListener("click", () => {
        const menu = document.getElementById("header-language-menu");
        menu?.classList.add("hidden");
      });
      (window as any).__headerLanguageMenuListener = true;
    }

    (window as any).headerSetLanguage = async (
      language: SupportedLanguage,
    ): Promise<void> => {
      try {
        await setLanguage(language);
        const menu = document.getElementById("header-language-menu");
        menu?.classList.add("hidden");
        window.location.reload();
      } catch (error) {
        console.error("Failed to change language:", error);
      }
    };

    const loginLabel = i18next.t("header.login", "Login");
    const languageLabel = i18next.t("header.language", "Language");

    return `
      <button id="header-login-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors" onclick="event.stopPropagation(); window.headerNavigate('/login');">
        ${loginLabel}
      </button>
      <div class="relative">
        <button id="header-language-btn" type="button" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center space-x-2" onclick="event.stopPropagation(); window.toggleHeaderLanguageMenu();">
          <span>${languageLabel}</span>
          <span aria-hidden="true">▾</span>
        </button>
        
        <div id="header-language-menu" class="hidden absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden z-10">
          <button type="button" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700" onclick="event.stopPropagation(); window.headerSetLanguage('cs');">
            ${i18next.t("header.lang.cs", "🇨🇿 Čeština")}
          </button>
          <button type="button" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700" onclick="event.stopPropagation(); window.headerSetLanguage('en');">
            ${i18next.t("header.lang.en", "🇬🇧 English")}
          </button>
          <button type="button" class="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700" onclick="event.stopPropagation(); window.headerSetLanguage('jp');">
            ${i18next.t("header.lang.jp", "🇯🇵 日本語")}
          </button>
        </div>
      </div>
    `;
  }

  destroy(): void {}
}

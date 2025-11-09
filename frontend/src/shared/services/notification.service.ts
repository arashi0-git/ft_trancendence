import { escapeHtml } from "../utils/html-utils";
import {
  translateApiError,
  type ErrorTranslationOptions,
} from "../utils/error-translator";

export type NotificationType = "success" | "info" | "warning" | "error";

export interface NotificationOptions {
  type?: NotificationType;
  duration?: number;
  position?:
    | "top-right"
    | "top-center"
    | "top-left"
    | "bottom-right"
    | "bottom-center"
    | "bottom-left";
}

export class NotificationService {
  private static instance: NotificationService;
  private container: HTMLElement | null = null;
  private readonly DEFAULT_DURATION = 3000;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private constructor() {
    this.createContainer();
  }

  private createContainer(): void {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "notification-container";
    this.container.className =
      "fixed top-4 right-4 z-50 space-y-2 pointer-events-none";
    this.container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(message: string, options: NotificationOptions = {}): void {
    const { type = "info", duration = this.DEFAULT_DURATION } = options;

    const notification = this.createNotification(message, type);

    if (this.container) {
      this.container.appendChild(notification);
    }

    // アニメーション
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
      notification.style.opacity = "1";
    }, 10);

    // 自動削除
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }
  }

  private createNotification(
    message: string,
    type: NotificationType,
  ): HTMLElement {
    const notification = document.createElement("div");
    notification.style.cssText = `
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease-in-out;
      max-width: 24rem;
      width: 100%;
      background-color: white;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 0.5rem;
      pointer-events: auto;
      border: 1px solid rgba(0, 0, 0, 0.05);
      overflow: hidden;
    `;

    const typeStyles = {
      success: "border-left: 4px solid #10b981;",
      info: "border-left: 4px solid #3b82f6;",
      warning: "border-left: 4px solid #f59e0b;",
      error: "border-left: 4px solid #ef4444;",
    };

    const typeIcons = {
      success: "✅",
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
    };

    notification.innerHTML = `
      <div style="padding: 1rem; ${typeStyles[type]}">
        <div style="display: flex; align-items: flex-start;">
          <div style="flex-shrink: 0;">
            <span style="font-size: 1.125rem;">${typeIcons[type]}</span>
          </div>
          <div style="margin-left: 0.75rem; flex: 1; min-width: 0;">
            <p style="font-size: 0.875rem; font-weight: 500; color: #111827; margin: 0;">
              ${escapeHtml(message)}
            </p>
          </div>
          <div style="margin-left: 1rem; flex-shrink: 0; display: flex;">
            <button class="close-btn" style="background: white; border-radius: 0.375rem; display: inline-flex; color: #9ca3af; border: none; cursor: pointer; padding: 0.25rem;">
              <span style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;">Close</span>
              <svg style="height: 1.25rem; width: 1.25rem;" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // 閉じるボタンのイベントリスナー
    const closeBtn = notification.querySelector(".close-btn");
    closeBtn?.addEventListener("click", () => {
      this.removeNotification(notification);
    });

    return notification;
  }

  private removeNotification(notification: HTMLElement): void {
    notification.style.transform = "translateX(100%)";
    notification.style.opacity = "0";

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // 便利メソッド
  success(message: string, duration?: number): void {
    this.show(message, { type: "success", duration });
  }

  info(message: string, duration?: number): void {
    this.show(message, { type: "info", duration });
  }

  warning(message: string, duration?: number): void {
    this.show(message, { type: "warning", duration });
  }

  error(message: string, duration?: number): void {
    this.show(message, { type: "error", duration });
  }

  apiError(
    error: unknown,
    options?: ErrorTranslationOptions & { duration?: number },
  ): void {
    const message = translateApiError(error, options);
    this.error(message, options?.duration);
  }

  handleUnexpectedError(error: unknown, context?: string): void {
    const prefix = context ? `${context}:` : "Unexpected error:";
    console.error(prefix, error);
    this.apiError(error, { fallbackKey: "errors.UNKNOWN_ERROR" });
  }
}

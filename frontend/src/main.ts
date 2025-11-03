import "./style.css";
import { App } from "./app";
import { initI18n } from "./i18n";
import { NotificationService } from "./shared/services/notification.service";

document.addEventListener("DOMContentLoaded", async () => {
  // 通知システムを初期化
  NotificationService.getInstance();
  try {
    await initI18n();
  } catch (error) {
    console.error("Failed to initialise translations", error);
  }
  new App();
});

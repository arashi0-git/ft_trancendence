import "./style.css";
import { App } from "./app";
import { NotificationService } from "./shared/services/notification.service";

document.addEventListener("DOMContentLoaded", () => {
  // 通知システムを初期化
  NotificationService.getInstance();

  new App();
});

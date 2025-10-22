import { GameManagerService } from "./game-manager.service";
import { NotificationService } from "./notification.service";

export abstract class BaseGameService {
  protected gameManager: GameManagerService;
  protected notificationService: NotificationService;
  protected controlListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor() {
    this.gameManager = new GameManagerService();
    this.notificationService = NotificationService.getInstance();
  }

  // 共通のゲーム制御メソッド
  protected startGame(): void {
    this.gameManager.startGame();
    this.onGameStart();
    this.updateButtonStates(true);
  }

  protected pauseGame(): void {
    this.gameManager.pauseGame();
    this.onGamePause();
    this.updateButtonStates(false);
  }

  protected resetGame(): void {
    this.gameManager.resetGame();
    this.onGameReset();
    this.updateButtonStates(false);
  }

  // 共通のボタン状態管理
  protected updateButtonStates(isPlaying: boolean): void {
    const startBtn = this.getStartButton();
    const pauseBtn = this.getPauseButton();

    if (startBtn && pauseBtn) {
      startBtn.disabled = isPlaying;
      pauseBtn.disabled = !isPlaying;
    }
  }

  // 共通のイベントリスナー管理
  protected addControlListener(
    elementId: string,
    event: string,
    handler: EventListener,
  ): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(event, handler);
      this.controlListeners.push({ element, event, handler });
    }
  }

  // 共通のクリーンアップ
  cleanup(): void {
    this.controlListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.controlListeners = [];
    this.gameManager.cleanup();
  }

  // 抽象メソッド（各サービスで実装）
  protected abstract onGameStart(): void;
  protected abstract onGamePause(): void;
  protected abstract onGameReset(): void;
  protected abstract getStartButton(): HTMLButtonElement | null;
  protected abstract getPauseButton(): HTMLButtonElement | null;
}

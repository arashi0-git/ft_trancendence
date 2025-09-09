// ft_transcendence メインアプリケーション

class PongGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameRunning: boolean = false;
  private websocket: WebSocket | null = null;

  constructor() {
    this.canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.initializeGame();
    this.setupEventListeners();
    this.connectWebSocket();
  }

  private initializeGame(): void {
    // キャンバスの初期化
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ft_transcendence Pong', this.canvas.width / 2, this.canvas.height / 2);
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('start-game') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-game') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-game') as HTMLButtonElement;

    startBtn.addEventListener('click', () => this.startGame());
    pauseBtn.addEventListener('click', () => this.pauseGame());
    resetBtn.addEventListener('click', () => this.resetGame());

    // キーボードイベント
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  private connectWebSocket(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:3000/ws`;
      
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected to backend');
        this.updateStatus('Connected to server');
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
      };

      this.websocket.onclose = () => {
        console.log('WebSocket connection closed');
        this.updateStatus('Disconnected from server');
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateStatus('Connection error');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.updateStatus('Failed to connect to server');
    }
  }

  private startGame(): void {
    if (!this.gameRunning) {
      this.gameRunning = true;
      this.updateStatus('Game Started!');
      
      const startBtn = document.getElementById('start-game') as HTMLButtonElement;
      const pauseBtn = document.getElementById('pause-game') as HTMLButtonElement;
      
      startBtn.disabled = true;
      pauseBtn.disabled = false;

      // WebSocketでゲーム開始を通知
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({
          type: 'game_start',
          timestamp: new Date().toISOString()
        }));
      }

      this.gameLoop();
    }
  }

  private pauseGame(): void {
    this.gameRunning = false;
    this.updateStatus('Game Paused');
    
    const startBtn = document.getElementById('start-game') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-game') as HTMLButtonElement;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }

  private resetGame(): void {
    this.gameRunning = false;
    this.updateStatus('Game Reset');
    
    const startBtn = document.getElementById('start-game') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-game') as HTMLButtonElement;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    this.initializeGame();
  }

  private gameLoop(): void {
    if (!this.gameRunning) return;

    // 基本的な描画（後でPongの実装を追加）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.fillText('Game Running...', this.canvas.width / 2, this.canvas.height / 2);

    requestAnimationFrame(() => this.gameLoop());
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.gameRunning) return;

    // キー入力をWebSocketで送信
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'key_press',
        key: event.key,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private updateStatus(message: string): void {
    const statusElement = document.querySelector('#game-status p');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('ft_transcendence loading...');
  new PongGame();
});
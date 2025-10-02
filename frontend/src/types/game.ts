export interface GameState {
  player1: Player;
  player2: Player;
  ball: Ball;
  score: Score;
  gameStatus: "waiting" | "playing" | "paused" | "finished";
  winner?: number;
}

export interface Player {
  id: number;
  paddle: Paddle;
  score: number;
  keys: {
    up: string;
    down: string;
    left: string;
    right: string;
  };
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  minX: number;
  maxX: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  speed: number;
}

export interface Score {
  player1: number;
  player2: number;
  maxScore: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballRadius: number;
  ballSpeed: number;
  maxScore: number;
}

export interface KeyState {
  [key: string]: boolean;
}

export interface GameEvents {
  onScoreUpdate: (score: Score) => void;
  onGameEnd: (winner: number) => void;
  onGameStateChange: (state: GameState) => void;
}

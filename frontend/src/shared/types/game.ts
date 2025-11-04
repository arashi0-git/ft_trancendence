export interface GameState {
  player1: Player;
  player2: Player;
  player3?: Player | null;
  player4?: Player | null;
  ball: Ball;
  score: Score;
  gameStatus: "waiting" | "playing" | "paused" | "finished";
  winner?: number;
}

export interface Player {
  id: number;
  name?: string;
  paddle: Paddle;
  keys: {
    up: string;
    down: string;
  };
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  minY?: number;
  maxY?: number;
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
  onGameEnd?: (data: {
    winner: number;
    score1: number;
    score2: number;
  }) => void;
  onGameStateChange: (state: GameState) => void;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Paddle3D extends Paddle {
  z?: number;
  depth?: number;
}

export interface Ball3D extends Ball {
  z?: number;
}

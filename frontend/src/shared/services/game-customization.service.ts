export type PaddleLengthOption = "short" | "normal" | "long";
export type BallSizeOption = "small" | "normal" | "big";

export interface GameCustomizationSettings {
  fieldColor: string;
  ballColor: string;
  paddleColor: string;
  paddleLength: PaddleLengthOption;
  ballSize: BallSizeOption;
}

type SettingsListener = (settings: GameCustomizationSettings) => void;

const STORAGE_KEY = "game_customization_settings";
const DEFAULT_SETTINGS: GameCustomizationSettings = {
  fieldColor: "#245224", // deep green default matching legacy appearance
  ballColor: "#ffffff", // classic white pong ball
  paddleColor: "#ffffff", // default bright paddle color
  paddleLength: "normal",
  ballSize: "normal",
};

const COLOR_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const PADDLE_LENGTH_OPTIONS: readonly PaddleLengthOption[] = [
  "short",
  "normal",
  "long",
];
const BALL_SIZE_OPTIONS: readonly BallSizeOption[] = [
  "small",
  "normal",
  "big",
];

const isValidColorHex = (value: string | undefined | null): value is string =>
  typeof value === "string" && COLOR_HEX_PATTERN.test(value);

const isValidPaddleLength = (
  value: string | undefined | null,
): value is PaddleLengthOption =>
  typeof value === "string" && PADDLE_LENGTH_OPTIONS.includes(value as PaddleLengthOption);

const isValidBallSize = (
  value: string | undefined | null,
): value is BallSizeOption =>
  typeof value === "string" && BALL_SIZE_OPTIONS.includes(value as BallSizeOption);

const isBrowserEnvironment = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export class GameCustomizationService {
  private settings: GameCustomizationSettings;
  private listeners: SettingsListener[] = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  getSettings(): GameCustomizationSettings {
    return this.settings;
  }

  getFieldColor(): string {
    return this.settings.fieldColor;
  }

  setFieldColor(colorHex: string): void {
    this.setColor("fieldColor", colorHex);
  }

  getBallColor(): string {
    return this.settings.ballColor;
  }

  setBallColor(colorHex: string): void {
    this.setColor("ballColor", colorHex);
  }

  getPaddleColor(): string {
    return this.settings.paddleColor;
  }

  setPaddleColor(colorHex: string): void {
    this.setColor("paddleColor", colorHex);
  }

  getPaddleLength(): PaddleLengthOption {
    return this.settings.paddleLength;
  }

  setPaddleLength(length: PaddleLengthOption): void {
    if (this.settings.paddleLength === length) {
      return;
    }
    if (!PADDLE_LENGTH_OPTIONS.includes(length)) {
      console.warn(
        `GameCustomizationService: attempted to set invalid paddle length '${length}'`,
      );
      return;
    }
    this.settings = { ...this.settings, paddleLength: length };
    this.persistSettings();
    this.notifyListeners();
  }

  getBallSize(): BallSizeOption {
    return this.settings.ballSize;
  }

  setBallSize(size: BallSizeOption): void {
    if (this.settings.ballSize === size) {
      return;
    }
    if (!BALL_SIZE_OPTIONS.includes(size)) {
      console.warn(
        `GameCustomizationService: attempted to set invalid ball size '${size}'`,
      );
      return;
    }
    this.settings = { ...this.settings, ballSize: size };
    this.persistSettings();
    this.notifyListeners();
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.push(listener);
    listener(this.settings);

    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  isUsingDefaults(): boolean {
    return (
      this.settings.fieldColor === DEFAULT_SETTINGS.fieldColor &&
      this.settings.ballColor === DEFAULT_SETTINGS.ballColor &&
      this.settings.paddleColor === DEFAULT_SETTINGS.paddleColor &&
      this.settings.paddleLength === DEFAULT_SETTINGS.paddleLength &&
      this.settings.ballSize === DEFAULT_SETTINGS.ballSize
    );
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.persistSettings();
    this.notifyListeners();
  }

  private setColor(
    key: "fieldColor" | "ballColor" | "paddleColor",
    colorHex: string,
  ): void {
    if (!isValidColorHex(colorHex)) {
      console.warn(
        `GameCustomizationService: attempted to set invalid color '${colorHex}'`,
      );
      return;
    }

    if (this.settings[key] === colorHex) {
      return;
    }

    this.settings = { ...this.settings, [key]: colorHex };
    this.persistSettings();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.settings));
  }

  private loadSettings(): GameCustomizationSettings {
    if (!isBrowserEnvironment()) {
      return DEFAULT_SETTINGS;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return DEFAULT_SETTINGS;
      }

      const parsed = JSON.parse(raw) as Partial<GameCustomizationSettings>;

      const fieldColor = isValidColorHex(parsed.fieldColor)
        ? parsed.fieldColor
        : DEFAULT_SETTINGS.fieldColor;
      const ballColor = isValidColorHex(parsed.ballColor)
        ? parsed.ballColor
        : DEFAULT_SETTINGS.ballColor;
      const paddleColor = isValidColorHex(parsed.paddleColor)
        ? parsed.paddleColor
        : DEFAULT_SETTINGS.paddleColor;
      const paddleLength = isValidPaddleLength(parsed.paddleLength)
        ? parsed.paddleLength
        : DEFAULT_SETTINGS.paddleLength;
      const ballSize = isValidBallSize(parsed.ballSize)
        ? parsed.ballSize
        : DEFAULT_SETTINGS.ballSize;

      return { fieldColor, ballColor, paddleColor, paddleLength, ballSize };
    } catch (error) {
      console.warn("GameCustomizationService: failed to load settings", error);
      return DEFAULT_SETTINGS;
    }
  }

  private persistSettings(): void {
    if (!isBrowserEnvironment()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn("GameCustomizationService: failed to save settings", error);
    }
  }
}

export const gameCustomizationService = new GameCustomizationService();

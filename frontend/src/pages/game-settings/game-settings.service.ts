import { router } from "../../routes/router";
import {
  gameCustomizationService,
  type GameCustomizationSettings,
  type PaddleLengthOption,
  type BallSizeOption,
} from "../../shared/services/game-customization.service";

export class GameSettingsService {
  navigateToHome(): void {
    router.navigate("/");
  }

  getFieldColor(): string {
    return gameCustomizationService.getFieldColor();
  }

  getBallColor(): string {
    return gameCustomizationService.getBallColor();
  }

  getPaddleColor(): string {
    return gameCustomizationService.getPaddleColor();
  }

  updateFieldColor(colorHex: string): void {
    gameCustomizationService.setFieldColor(colorHex);
  }

  updateBallColor(colorHex: string): void {
    gameCustomizationService.setBallColor(colorHex);
  }

  updatePaddleColor(colorHex: string): void {
    gameCustomizationService.setPaddleColor(colorHex);
  }

  getPaddleLength(): PaddleLengthOption {
    return gameCustomizationService.getPaddleLength();
  }

  updatePaddleLength(length: PaddleLengthOption): void {
    gameCustomizationService.setPaddleLength(length);
  }

  getBallSize(): BallSizeOption {
    return gameCustomizationService.getBallSize();
  }

  updateBallSize(size: BallSizeOption): void {
    gameCustomizationService.setBallSize(size);
  }

  resetToDefaults(): void {
    gameCustomizationService.resetToDefaults();
  }

  isUsingDefaults(): boolean {
    return gameCustomizationService.isUsingDefaults();
  }

  subscribeToSettings(
    listener: (settings: GameCustomizationSettings) => void,
  ): () => void {
    return gameCustomizationService.subscribe(listener);
  }
}

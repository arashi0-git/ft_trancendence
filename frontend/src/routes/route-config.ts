import { HomePage } from "../pages/home";
import { QuickPlayPage } from "../pages/quick-play";
import { TournamentPage } from "../pages/tournament";
import { LoginPage } from "../pages/login";
import { RegisterPage } from "../pages/register";

import { UserSettingsPage } from "../pages/settings";
import { GameSettingsPage } from "../pages/game-settings/game-settings.page";

export interface PageComponent {
  render(): void;
  destroy?(): void;
}

export type PageConstructor = new (container: HTMLElement) => PageComponent;

export const routeConfig: Record<string, PageConstructor> = {
  "/": HomePage,
  "/quick-play": QuickPlayPage,
  "/quick-play/game": QuickPlayPage,
  "/tournament": TournamentPage,
  "/tournament/registration": TournamentPage,
  "/tournament/bracket": TournamentPage,
  "/tournament/match/:matchId": TournamentPage,
  "/tournament/results": TournamentPage,
  "/game-settings": GameSettingsPage,
  "/settings": UserSettingsPage,
  "/login": LoginPage,
  "/register": RegisterPage,
};

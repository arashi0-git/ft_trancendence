import { HomePage } from "../pages/home";
import { QuickPlayPage } from "../pages/quick-play";
import { TournamentPage } from "../pages/tournament";
import { LoginPage } from "../pages/login";
import { RegisterPage } from "../pages/register";
import { AiModePage } from "../pages/ai-mode";
import { UserSettingsPage } from "../pages/settings";

export interface PageComponent {
  render(): void;
  destroy?(): void;
}

export type PageConstructor = new (container: HTMLElement) => PageComponent;

export const routeConfig: Record<string, PageConstructor> = {
  "/": HomePage,
  "/quick-play": QuickPlayPage,
  "/tournament": TournamentPage,
  "/tournament/registration": TournamentPage,
  "/tournament/bracket": TournamentPage,
  "/tournament/match/:matchId": TournamentPage,
  "/tournament/results": TournamentPage,
  "/ai-mode": AiModePage,
  "/settings": UserSettingsPage,
  "/login": LoginPage,
  "/register": RegisterPage,
};

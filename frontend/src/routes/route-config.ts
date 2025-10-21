import { HomePage } from "../pages/home";
import { QuickPlayPage } from "../pages/quick-play";
import { TournamentPage } from "../pages/tournament";
import { LoginPage } from "../pages/login";
import { RegisterPage } from "../pages/register";

export interface PageComponent {
  render(): void;
  destroy?(): void;
}

export type PageConstructor = new (container: HTMLElement) => PageComponent;

export const routeConfig: Record<string, PageConstructor> = {
  "/": HomePage,
  "/quick-play": QuickPlayPage,
  "/tournament": TournamentPage,
  "/tournament/setup": TournamentPage,
  "/tournament/bracket": TournamentPage,
  "/tournament/match/:matchId": TournamentPage,
  "/tournament/results": TournamentPage,
  "/login": LoginPage,
  "/register": RegisterPage,
};

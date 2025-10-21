export interface Route {
  path: string;
  handler: (params?: Record<string, string>) => void;
  params?: Record<string, string>;
}

export type RouterEventType = "routeChange";

type RouterEventCallback = (data: { path: string; route: Route }) => void;

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private eventListeners: Map<RouterEventType, RouterEventCallback[]> =
    new Map();

  constructor() {
    window.addEventListener("popstate", (event) => {
      this.handlePopState(event);
    });

    this.handleInitialRoute();
  }

  addRoute(
    path: string,
    handler: (params?: Record<string, string>) => void,
  ): void {
    this.routes.push({ path, handler });
  }

  navigate(path: string, pushState: boolean = true): void {
    const route = this.matchRoute(path);

    if (route) {
      this.currentRoute = route;

      if (pushState) {
        window.history.pushState({ path }, "", path);
      }

      route.handler(route.params);

      this.emit("routeChange", { path, route });
    } else {
      console.warn(`No route found for path: ${path}`);

      if (path !== "/") {
        this.navigate("/", pushState);
      }
    }
  }

  private matchRoute(path: string): Route | null {
    for (const route of this.routes) {
      const match = this.matchPath(route.path, path);
      if (match) {
        return {
          ...route,
          params: match.params,
        };
      }
    }
    return null;
  }

  private matchPath(
    routePath: string,
    actualPath: string,
  ): { params: Record<string, string> } | null {
    const cleanActualPath = actualPath.split("?")[0];
    if (routePath === cleanActualPath) {
      return { params: {} };
    }

    const routeParts = routePath.split("/");
    const actualParts = cleanActualPath.split("/");

    if (routeParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const actualPart = actualParts[i];

      if (routePart.startsWith(":")) {
        const paramName = routePart.slice(1);
        params[paramName] = actualPart;
      } else if (routePart !== actualPart) {
        return null;
      }
    }
    return { params };
  }
  private handlePopState(event: PopStateEvent): void {
    const path = event.state?.path || window.location.pathname;
    this.navigate(path, false);
  }

  private handleInitialRoute(): void {
    const currentPath = window.location.pathname;
    this.navigate(currentPath, false);
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  getCurrentPath(): string {
    return window.location.pathname;
  }

  on(event: RouterEventType, callback: RouterEventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.push(callback);
    }
  }

  off(event: RouterEventType, callback: RouterEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(
    event: RouterEventType,
    data: { path: string; route: Route },
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        callback(data);
      });
    }
  }

  destroy(): void {
    window.removeEventListener("popstate", this.handlePopState);
    this.eventListeners.clear();
  }
}

export const router = new Router();

const resolveWebSocketBaseUrl = (): string => {
  const configured = import.meta.env.VITE_WS_BASE_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.host) {
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    return `${scheme}://${window.location.host}`;
  }

  return "wss://localhost";
};

const WEBSOCKET_BASE_URL = resolveWebSocketBaseUrl();

export class WebSocketService {
  static connect(path = "/ws"): WebSocket {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return new WebSocket(`${WEBSOCKET_BASE_URL}${normalizedPath}`);
  }
}

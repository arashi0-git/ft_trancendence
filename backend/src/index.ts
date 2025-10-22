import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import path from "path";
// import fs from "fs";
// import https from "https";
import { initializeDatabase } from "./database/init";
import { authRoutes } from "./routes/auth";


// const httpsOptions =
//   process.env.NODE_ENV === "production"
//     ? {
//         key: fs.readFileSync(path.join(process.cwd(), "ssl", "key.pem")),
//         cert: fs.readFileSync(path.join(process.cwd(), "ssl", "cert.pem")),
//       }
//     : undefined;

const fastify = Fastify({
  logger: true,
  trustProxy: true
  // serverFactory: httpsOptions
  //   ? (handler) => {
  //       return https.createServer(httpsOptions, handler);
  //     }
  //   : undefined,
});

// プラグインの登録
async function registerPlugins() {
  // CORS設定
  await fastify.register(cors, {
    origin:  process.env.CORS_ORIGIN ?? "https://localhost",
    credentials: true,
  });

  // WebSocket対応
  await fastify.register(websocket);

  // 静的ファイル配信（フロントエンド用）
  await fastify.register(staticFiles, {
    root: path.join(__dirname, "../../frontend/dist"),
    prefix: "/",
  });
}

// ルートの設定
async function setupRoutes() {
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  // ヘルスチェック
  fastify.get("/api/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // WebSocket接続（リアルタイム通信用）
  fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (connection) => {
      connection.socket.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.info("WebSocket message received:", data);

          // エコーバック（開発用）
          connection.socket.send(
            JSON.stringify({
              type: "echo",
              data: data,
              timestamp: new Date().toISOString(),
            }),
          );
        } catch (error) {
          fastify.log.error("WebSocket message error: " + String(error));
        }
      });

      connection.socket.on("close", () => {
        fastify.log.info("WebSocket connection closed");
      });
    });
  });

  // API基本ルート
  fastify.get("/api", async (request, reply) => {
    return {
      message: "ft_transcendence API",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
        websocket: "/ws",
      },
    };
  });
}

// サーバー起動
async function start() {
  try {
    await initializeDatabase();
    await registerPlugins();
    await setupRoutes();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });

    fastify.log.info(
      `ft_transcendence backend server listening on ${host}:${port}`,
    );
    fastify.log.info(
      `WebSocket endpoint: ws${process.env.NODE_ENV === "production" ? "s" : ""}://${host}:${port}/ws`,
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on("SIGINT", async () => {
  fastify.log.info("Shutting down server...");
  await fastify.close();
  process.exit(0);
});

start();

/*
1. フロントエンド → POST /api/auth/register
2. routes/auth.ts → 入力検証
3. routes/auth.ts → UserService.createUser()
4. UserService → AuthUtils.hashPassword()
5. UserService → データベースに保存
6. UserService → AuthUtils.generateToken()
7. routes/auth.ts → レスポンス返却
*/

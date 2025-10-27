import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "path";
import fs from "fs";
import https from "https";
import { initializeDatabase } from "./database/init";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";

const httpsOptions =
  process.env.NODE_ENV === "production"
    ? {
        key: fs.readFileSync(path.join(process.cwd(), "ssl", "key.pem")),
        cert: fs.readFileSync(path.join(process.cwd(), "ssl", "cert.pem")),
      }
    : undefined;

const fastify = Fastify({
  logger: true,
  serverFactory: httpsOptions
    ? (handler) => {
        return https.createServer(httpsOptions, handler);
      }
    : undefined,
});

// プラグインの登録
async function registerPlugins() {
  // CORS設定
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
      files: 1,
    },
  });

  const uploadsDir = path.join(process.cwd(), "uploads");
  const avatarsDir = path.join(uploadsDir, "avatars");
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  await fastify.register(staticFiles, {
    root: avatarsDir,
    prefix: "/uploads/avatars/",
    decorateReply: false,
  });

  // 静的ファイル配信（フロントエンド用）
  await fastify.register(staticFiles, {
    root: path.join(__dirname, "../../frontend/dist"),
    prefix: "/",
  });
}

// ルートの設定
async function setupRoutes() {
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(userRoutes, { prefix: "/api/users" });
  // ヘルスチェック
  fastify.get("/api/health", async (request, reply) => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // API基本ルート
  fastify.get("/api", async (request, reply) => {
    return {
      message: "ft_transcendence API",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
        updateProfile: "/api/users/me",
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

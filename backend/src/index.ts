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
  const trustedOriginsEnv =
    process.env.CORS_ORIGINS || process.env.TRUSTED_ORIGINS || "";
  const trustedOrigins = trustedOriginsEnv
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && trustedOrigins.length === 0) {
    fastify.log.error(
      "CORS_ORIGINS (or TRUSTED_ORIGINS) must be configured in production",
    );
    throw new Error("Missing CORS whitelist configuration");
  }

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow server-to-server or same-origin requests without an Origin header
      if (!origin) {
        return cb(null, true);
      }

      if (trustedOrigins.length === 0) {
        // Non-production with no whitelist
        fastify.log.warn(
          `CORS whitelist is empty; allowing origin ${origin} (non-production fallback)`,
        );
        return cb(null, true);
      }

      if (trustedOrigins.includes(origin)) {
        return cb(null, origin);
      }

      fastify.log.warn(`Blocked CORS origin: ${origin}`);
      return cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 60 * 60 * 24, // 24 hours
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

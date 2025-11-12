import "dotenv/config";
import Fastify from "fastify";
import helmet from "@fastify/helmet";
import staticFiles from "@fastify/static";
import multipart from "@fastify/multipart";
import path from "path";
import fs from "fs";
import secureJsonParse from "secure-json-parse";
import { initializeDatabase } from "./database/init";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/user";
import { historyRoutes } from "./routes/history";

const fastify = Fastify({
  logger: true,
  // If serverFactory is not specified, Fastify automatically creates an HTTP server
  // Internally uses http.createServer() as the default server factory
});

// Allow empty JSON bodies (parsed as {}) for endpoints that don't require payloads.
fastify.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (request, body, done) => {
    try {
      const raw = typeof body === "string" ? body : (body?.toString() ?? "");
      const text = raw.trim();
      if (text.length === 0) {
        done(null, {});
        return;
      }
      // Securely parse incoming JSON payloads.
      // - Uses secure-json-parse to prevent prototype/constructor pollution.
      // - Removes any "__proto__" or "constructor" properties from the parsed object
      //   so malicious payloads cannot tamper with object prototypes or constructors.
      const parsed = secureJsonParse(text, undefined, {
        protoAction: "remove",
        constructorAction: "remove",
      });
      done(null, parsed);
    } catch (error) {
      const parseError = error as Error & { statusCode?: number };
      parseError.name = "FastifyError";
      parseError.message = "Invalid JSON payload";
      parseError.statusCode = 400;
      done(parseError, undefined);
    }
  },
);

// プラグインの登録
async function registerPlugins() {
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"], // デフォルト: 自分のドメインからのみリソース読み込み可能
        scriptSrc: ["'self'"], // XSS対策: 外部スクリプトをブロック
        styleSrc: ["'self'", "'unsafe-inline'"], // インラインスタイル許可（通知UI用、XSSリスク低）
        connectSrc: ["'self'"], // API呼び出し許可（自ドメインのみ）
        imgSrc: ["'self'", "data:", "blob:"], // 画像、アバター、BabylonJSテクスチャ
        fontSrc: ["'self'", "data:"], // Webフォント
        workerSrc: ["'self'", "blob:"], // BabylonJS Web Worker
      },
      reportOnly: false,
    },
    crossOriginEmbedderPolicy: false,
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
  await fastify.register(historyRoutes, { prefix: "/api/history" });
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

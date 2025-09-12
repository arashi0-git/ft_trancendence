import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './database/init';

const fastify = Fastify({
  logger: true,
  // HTTPS設定は開発環境では無効化
  ...(process.env.NODE_ENV === 'production' && fs.existsSync('/app/ssl/key.pem') ? {
    https: {
      key: fs.readFileSync('/app/ssl/key.pem'),
      cert: fs.readFileSync('/app/ssl/cert.pem')
    }
  } : {})
});

// プラグインの登録
async function registerPlugins() {
  // CORS設定
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // WebSocket対応
  await fastify.register(websocket);

  // 静的ファイル配信（フロントエンド用）
  await fastify.register(staticFiles, {
    root: path.join(__dirname, '../../frontend/dist'),
    prefix: '/'
  });
}

// ルートの設定
async function setupRoutes() {
  // ヘルスチェック
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // WebSocket接続（リアルタイム通信用）
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection) => {
      connection.socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.info('WebSocket message received:', data);

          // エコーバック（開発用）
          connection.socket.send(JSON.stringify({
            type: 'echo',
            data: data,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          fastify.log.error('WebSocket message error: ' + String(error));
        }
      });

      connection.socket.on('close', () => {
        fastify.log.info('WebSocket connection closed');
      });
    });
  });

  // API基本ルート
  fastify.get('/api', async (request, reply) => {
    return {
      message: 'ft_transcendence API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        websocket: '/ws'
      }
    };
  });
}

// サーバー起動
async function start() {
  try {
    await registerPlugins();
    await setupRoutes();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    fastify.log.info(`ft_transcendence backend server listening on ${host}:${port}`);
    fastify.log.info(`WebSocket endpoint: ws${process.env.NODE_ENV === 'production' ? 's' : ''}://${host}:${port}/ws`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down server...');
  await fastify.close();
  process.exit(0);
});

async function start() {
  try {
    await initializeDatabase();
    await registerPlugins();
    await setupRoutes();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });

    fastify.log.info(`ft_transcendence backend server listening on ${host}:${port}`);
    fastify.log.info(`WebSocket endpoint: ws${process.env.NODE_ENV === 'production' ? 's' : ''}://${host}:${port}/ws`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();
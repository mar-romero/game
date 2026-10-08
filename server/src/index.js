import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { closeDatabase, migrate, pool } from './db.js';
import { identifyToken } from './auth.js';
import { createApi, prepareOnlineSeason } from './routes.js';
import { initializeArenaRuntime } from './game/arena-runtime.js';
import { MatchManager } from './game/match-manager.js';

const runtimeLeaseClient = await pool.connect();
let ownsRuntimeLease = false;
try {
  const lease = await runtimeLeaseClient.query('select pg_try_advisory_lock(4062026, 2) as acquired');
  ownsRuntimeLease = lease.rows[0].acquired;
  if (!ownsRuntimeLease) throw new Error('Another Factory Wars server already owns this database; this beta supports one instance only');
  await migrate();
  await prepareOnlineSeason();
  await pool.query("update public.online_matches set status='abandoned' where status='active'");
  await initializeArenaRuntime();
} catch (error) {
  if (ownsRuntimeLease) await runtimeLeaseClient.query('select pg_advisory_unlock(4062026, 2)').catch(() => {});
  runtimeLeaseClient.release();
  await closeDatabase().catch(() => {});
  throw error;
}

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin(origin, callback) {
  if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed'));
}, credentials: true }));
app.use(express.json({ limit: '128kb' }));
app.get('/online-config.js', (_req, res) => {
  res.type('application/javascript').send(`window.FACTORY_WARS_CONFIG=${JSON.stringify({
    SUPABASE_URL: config.supabaseBrowserUrl,
    SUPABASE_PUBLISHABLE_KEY: config.supabaseAnonKey,
    API_URL: '', ONLINE_ENABLED: true,
    ALLOW_LOCAL_SAVE_IMPORT: config.allowLocalSaveImport,
    SEASON: config.seasonId, VERSION: '1.7-online',
  })};`);
});
const manager = new MatchManager();
manager.start();
app.use('/api/v1', createApi(manager));
app.use(express.static(process.env.PUBLIC_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../../public')));
app.get('/api', (_req, res) => res.json({ name: 'Factory Wars Online API', version: '0.1.0' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Factory Wars online listening on :${config.port}`);
  console.log(`Season ${config.seasonId}`);
});

const sockets = new WebSocketServer({
  noServer: true,
  maxPayload: 16 * 1024,
  handleProtocols(protocols) { return protocols.has('factory-wars-v1') ? 'factory-wars-v1' : false; },
});
server.on('upgrade', async (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== '/ws') return socket.destroy();
  const origin = request.headers.origin;
  if (origin && !config.allowedOrigins.includes(origin)) return socket.destroy();
  try {
    const protocols = (request.headers['sec-websocket-protocol'] || '').split(',').map((value) => value.trim());
    const token = protocols.find((value) => value.startsWith('fw-token.'))?.slice('fw-token.'.length);
    const user = await identifyToken(token);
    if (!user) return socket.destroy();
    if (sockets.clients.size >= config.maxWebSocketConnections) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    sockets.handleUpgrade(request, socket, head, (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      manager.joinSocket(user.id, ws);
      ws.send(JSON.stringify({ type: 'connected', userId: user.id, seasonId: config.seasonId }));
      ws.on('message', async (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.type === 'match.join' && typeof message.matchId === 'string') {
            const match = manager.matches.get(message.matchId);
            if (!match?.sides.has(user.id)) return ws.send(JSON.stringify({ type: 'error', error: 'Not a match participant' }));
            const side = match.sides.get(user.id);
            ws.send(JSON.stringify({ type: 'match.state', matchId: match.id, side, state: (await import('./game/arena-runtime.js')).publicMatchState(match.match, side) }));
          }
        } catch { ws.send(JSON.stringify({ type: 'error', error: 'Invalid message' })); }
      });
    });
  } catch { socket.destroy(); }
});

const socketHeartbeat = setInterval(() => {
  for (const ws of sockets.clients) {
    if (ws.readyState !== 1) continue;
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
socketHeartbeat.unref();

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(socketHeartbeat);
  manager.stop();
  await manager.flushPendingEvents();
  sockets.close();
  server.close();
  await pool.query("update online_matches set status='abandoned' where status='active'").catch(() => {});
  await runtimeLeaseClient.query('select pg_advisory_unlock(4062026, 2)').catch(() => {});
  runtimeLeaseClient.release();
  await closeDatabase();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

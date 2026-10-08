import 'dotenv/config';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};
const boundedInteger = (name, fallback, min, max) => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
  return Math.min(max, Math.max(min, value));
};
const databaseUrl = required('DATABASE_URL');
const databaseUrlOptions = new URL(databaseUrl);
const uriTlsOptions = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];
const conflictingTlsOption = uriTlsOptions.find((name) => databaseUrlOptions.searchParams.has(name));
if (conflictingTlsOption) {
  throw new Error(`Remove ${conflictingTlsOption} from DATABASE_URL; configure PostgreSQL TLS with DATABASE_SSL=true instead`);
}

export const config = {
  port: boundedInteger('PORT', 8080, 1, 65_535),
  databaseUrl,
  supabaseUrl: required('SUPABASE_URL').replace(/\/$/, ''),
  supabaseBrowserUrl: (process.env.SUPABASE_BROWSER_URL || required('SUPABASE_URL')).replace(/\/$/, ''),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  seasonId: process.env.SEASON_ID || 'BETA-ONLINE-01',
  seasonRosterSize: boundedInteger('SEASON_ROSTER_SIZE', 12, 2, 100_000),
  adminUserIds: (process.env.ADMIN_USER_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
    .split(',').map((origin) => origin.trim()).filter(Boolean),
  botFillDelayMs: boundedInteger('BOT_FILL_DELAY_MS', 12_000, 1_000, 3_600_000),
  maxWebSocketConnections: boundedInteger('MAX_WEBSOCKET_CONNECTIONS', 1_200, 5, 100_000),
  playerActionsPerSecond: boundedInteger('PLAYER_ACTIONS_PER_SECOND', 12, 1, 120),
  playerActionBurst: boundedInteger('PLAYER_ACTION_BURST', 20, 1, 500),
  playerHttpRequestsPerMinute: boundedInteger('PLAYER_HTTP_REQUESTS_PER_MINUTE', 300, 60, 10_000),
  matchTickIntervalMs: boundedInteger('MATCH_TICK_INTERVAL_MS', 200, 50, 500),
  matchEventPersistIntervalMs: boundedInteger('MATCH_EVENT_PERSIST_INTERVAL_MS', 5_000, 500, 60_000),
  stateBroadcastIntervalMs: boundedInteger('STATE_BROADCAST_INTERVAL_MS', 250, 100, 5_000),
  dbPoolMax: boundedInteger('DB_POOL_MAX', 10, 2, 1_000),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  allowLocalSaveImport: process.env.ALLOW_LOCAL_SAVE_IMPORT === 'true',
  botNamePrefix: process.env.BOT_NAME_PREFIX || 'Factory Bot',
};

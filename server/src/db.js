import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config } from './config.js';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
});

const here = dirname(fileURLToPath(import.meta.url));
export async function migrate() {
  const sql = await readFile(resolve(here, '../supabase/online_schema.sql'), 'utf8').catch(async () =>
    readFile(resolve(here, '../../supabase/online_schema.sql'), 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(4062026, 1)');
    await client.query(sql);
    await client.query(
      `insert into public.online_seasons(id,roster_size,ruleset_version) values($1,$2,'arena-online-1.7')
       on conflict(id) do update set roster_size=excluded.roster_size,ruleset_version=excluded.ruleset_version`,
      [config.seasonId, config.seasonRosterSize],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}

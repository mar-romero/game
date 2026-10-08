import { randomInt } from 'node:crypto';
import express from 'express';
import { config } from './config.js';
import { pool } from './db.js';
import { requireUser } from './auth.js';
import { advanceEmpire, applyEmpireCommand, defaultEmpire, empireIndustrialScore } from './game/empire-service.js';

const civilizations = ['forge','bastion','swarm','nexus'];
const botNames = ['FerroGreed','Blitz-9','Aegis','Tempo-X','Mimic','Dice','Atlas','VaultMax','GhostWire','Vanguardia','Muralla','Oráculo'];
const botStrategies = ['GREEDY','RUSHER','TURTLE','TEMPO','ADAPTIVE','RANDOM','BALANCED','HOARDER','SABOTEUR'];
const requestWindows = new Map();
let lastRequestWindowPrune = 0;
function limitPlayerRequests(req, res, next) {
  const now = Date.now();
  if (now - lastRequestWindowPrune >= 60_000) {
    for (const [userId, window] of requestWindows) if (window.endsAt <= now) requestWindows.delete(userId);
    lastRequestWindowPrune = now;
  }
  let window = requestWindows.get(req.user.id);
  if (!window || window.endsAt <= now) {
    window = { count: 0, endsAt: now + 60_000 };
    requestWindows.set(req.user.id, window);
  }
  window.count++;
  if (window.count > config.playerHttpRequestsPerMinute) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((window.endsAt - now) / 1000))));
    return res.status(429).json({ error: 'Too many requests; wait a moment and retry' });
  }
  next();
}
function economyEventId(event, index) {
  if (event.eventType === 'tick') return `tick-${event.payload.windowEndAt}`;
  return `contract-complete-${event.payload?.endsAt || Date.now()}-${index}`;
}
async function getOrCreateProfile(user) {
  const existing = await pool.query('select * from online_profiles where user_id=$1', [user.id]);
  if (existing.rowCount) return existing.rows[0];
  const nickname = `Factory-${user.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`;
  const inserted = await pool.query(
    `insert into online_profiles(user_id,nickname) values($1,$2)
     on conflict(user_id) do update set updated_at=now() returning *`, [user.id, nickname],
  );
  return inserted.rows[0];
}

async function getEmpire(userId, nickname = 'Factory-Local') {
  const row = await pool.query('select state,revision from online_empires where user_id=$1 and season_id=$2', [userId, config.seasonId]);
  if (row.rowCount) return { state: row.rows[0].state, revision: Number(row.rows[0].revision) };
  const state = defaultEmpire(nickname);
  const inserted = await pool.query(
    `insert into online_empires(user_id,season_id,state) values($1,$2,$3)
     on conflict(user_id,season_id) do nothing returning revision`, [userId, config.seasonId, JSON.stringify(state)],
  );
  if (inserted.rowCount) return { state, revision: Number(inserted.rows[0].revision) };
  return getEmpire(userId);
}

function normalizeLocalEmpireImport(candidate) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  const state = defaultEmpire();
  const numberField = (key, maximum, integer = false) => {
    if (candidate[key] === undefined) return state[key];
    const value = Number(candidate[key]);
    if (!Number.isFinite(value) || value < 0 || value > maximum || (integer && !Number.isInteger(value))) {
      fail(`${key} exceeds import limits`);
    }
    return value;
  };
  const resourceKeys = ['credits','energy','steel','intel','fragments','dominion'];
  for (const key of resourceKeys) state[key] = numberField(key, 50_000_000);
  for (const key of ['generator','refinery','lab','automation']) {
    const value = candidate.buildings?.[key];
    if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 500)) fail('Building levels exceed import limits');
    state.buildings[key] = value ?? state.buildings[key];
  }
  if (candidate.buildings !== undefined && (!candidate.buildings || typeof candidate.buildings !== 'object' || Array.isArray(candidate.buildings))) {
    fail('Invalid building data');
  }
  if (candidate.currentCiv != null && !civilizations.includes(candidate.currentCiv)) fail('Invalid civilization in save');
  state.currentCiv = candidate.currentCiv || null;
  state.civLocked = Boolean(state.currentCiv);
  const researchCatalog = globalThis.FactoryWars?.EmpireCatalog?.RESEARCH || {};
  if (candidate.research !== undefined && (!Array.isArray(candidate.research) || candidate.research.length > 100)) fail('Invalid research data');
  const research = [...new Set(candidate.research || [])];
  if (research.some((key) => typeof key !== 'string' || !Object.hasOwn(researchCatalog, key))) fail('Unknown research in save');
  state.research = research;
  const progression = globalThis.FactoryWars?.EmpireProgression;
  state.activeDoctrine = progression?.isDoctrine(candidate.activeDoctrine) && research.includes(candidate.activeDoctrine)
    ? candidate.activeDoctrine : null;
  for (const key of ['prestigeCount','legacyNodes','contractsCompleted','warWins','dominionTier']) {
    state[key] = numberField(key, 10_000, true);
  }
  if (state.dominionTier < 1) state.dominionTier = 1;
  for (const key of ['lifetimeProduction','cycleProduction','bestIndustrialScore']) state[key] = numberField(key, 1_000_000_000_000_000);
  for (const key of ['civLegacies','loyalty']) {
    const source = candidate[key];
    if (source !== undefined && (!source || typeof source !== 'object' || Array.isArray(source))) fail(`Invalid ${key} data`);
    for (const civ of civilizations) {
      const value = source?.[civ];
      if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10_000)) fail(`Invalid ${key} value`);
      state[key][civ] = value === undefined ? 0 : Number(value);
    }
  }
  // Active contracts carry user-provided reward values; they restart cleanly after import.
  state.activeContract = null;
  state.lastTick = Date.now();
  return state;
}

async function ensureBotRoster(seasonId, rosterSize) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select id from online_seasons where id=$1 for update', [seasonId]);
    const count = await client.query('select count(*)::int as count from online_season_players where season_id=$1', [seasonId]);
    const missing = Math.max(0, rosterSize - count.rows[0].count);
    if (missing > 0) {
      const participants = Array.from({ length: missing }, (_, index) => {
        const seat = randomInt(1, 1_000_000_000);
        return {
          id: `bot:${seat}`, name: `${botNames[index % botNames.length]}-${String(seat).slice(-6)}`,
          civ: civilizations[randomInt(civilizations.length)], strategy: botStrategies[randomInt(botStrategies.length)],
        };
      });
      await client.query(
        `insert into online_season_players(season_id,participant_id,display_name,civilization,is_bot,bot_strategy)
         select $1,x.participant_id,x.display_name,x.civilization,true,x.bot_strategy
         from unnest($2::text[],$3::text[],$4::text[],$5::text[])
         as x(participant_id,display_name,civilization,bot_strategy) on conflict do nothing`,
        [seasonId, participants.map((item) => item.id), participants.map((item) => item.name),
          participants.map((item) => item.civ), participants.map((item) => item.strategy)],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function prepareOnlineSeason() {
  const season = await pool.query('select roster_size from online_seasons where id=$1', [config.seasonId]);
  if (season.rowCount) await ensureBotRoster(config.seasonId, season.rows[0].roster_size);
}

async function seasonRoster(seasonId) {
  const season = await pool.query('select * from online_seasons where id=$1', [seasonId]);
  if (!season.rowCount) return null;
  await ensureBotRoster(seasonId, season.rows[0].roster_size);
  const players = await pool.query(
    `select participant_id,display_name,civilization,is_bot,bot_strategy,rating,points,wins,draws,losses
     from online_season_players where season_id=$1 order by is_bot asc,points desc,rating desc,created_at`, [seasonId],
  );
  return { ...season.rows[0], players: players.rows };
}

export function createApi(manager) {
  const api = express.Router();
  api.get('/health', async (_req, res) => {
    const result = await pool.query('select 1 as ok');
    res.json({ status: 'ok', database: result.rows[0].ok === 1, season: config.seasonId, serverTime: new Date().toISOString() });
  });

  api.use(requireUser, limitPlayerRequests);
  api.get('/me', async (req, res) => {
    const profile = await getOrCreateProfile(req.user);
    const empire = await getEmpire(req.user.id, profile.nickname);
    res.json({ profile, empire, user: { id: req.user.id, email: req.user.email }, isAdmin: config.adminUserIds.includes(req.user.id) });
  });
  api.patch('/me/profile', async (req, res) => {
    const nickname = String(req.body?.nickname || '').trim();
    if (!/^[A-Za-z0-9_\-ÁÉÍÓÚÜÑáéíóúüñ ]{3,20}$/.test(nickname)) return res.status(400).json({ error: 'Nickname must be 3–20 valid characters' });
    const client = await pool.connect();
    try {
      await client.query('begin');
      const saved = await client.query(
        `insert into online_profiles(user_id,nickname) values($1,$2)
         on conflict(user_id) do update set nickname=excluded.nickname,updated_at=now() returning *`, [req.user.id, nickname],
      );
      await client.query(
        'update online_season_players set display_name=$3 where season_id=$1 and user_id=$2',
        [config.seasonId, req.user.id, nickname],
      );
      await client.query('commit');
      res.json({ profile: saved.rows[0] });
    } catch (error) {
      await client.query('rollback').catch(() => {});
      if (error.code === '23505') return res.status(409).json({ error: 'Nickname already in use' });
      throw error;
    } finally { client.release(); }
  });
  api.get('/me/empire', async (req, res) => res.json(await getEmpire(req.user.id)));
  api.post('/me/empire/advance', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      let row = await client.query('select state,revision from online_empires where user_id=$1 and season_id=$2 for update', [req.user.id, config.seasonId]);
      if (!row.rowCount) {
        const profile = await getOrCreateProfile(req.user);
        await client.query('insert into online_empires(user_id,season_id,state) values($1,$2,$3) on conflict do nothing', [req.user.id, config.seasonId, JSON.stringify(defaultEmpire(profile.nickname))]);
        row = await client.query('select state,revision from online_empires where user_id=$1 and season_id=$2 for update', [req.user.id, config.seasonId]);
      }
      const state = row.rows[0].state;
      const events = advanceEmpire(state);
      const updated = await client.query(
        'update online_empires set state=$3,revision=revision+1,updated_at=now() where user_id=$1 and season_id=$2 returning revision',
        [req.user.id, config.seasonId, JSON.stringify(state)],
      );
      await client.query(
        `update online_season_players set industrial_score=$3,civilization=$4
         where season_id=$1 and user_id=$2`,
        [config.seasonId, req.user.id, empireIndustrialScore(state), state.currentCiv],
      );
      for (const [index, event] of events.entries()) {
        await client.query(
          `insert into online_economy_events(user_id,season_id,event_id,event_type,resource,amount,state_revision,payload)
           values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(user_id,season_id,event_id) do nothing`,
          [req.user.id, config.seasonId, economyEventId(event, index), event.eventType, event.resource, event.amount, updated.rows[0].revision, JSON.stringify(event.payload || {})],
        );
      }
      await client.query('commit');
      res.json({ state, revision: Number(updated.rows[0].revision), events });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  });
  api.post('/me/empire/command', async (req, res) => {
    const { eventId, command } = req.body || {};
    if (typeof eventId !== 'string' || !/^[A-Za-z0-9-]{8,100}$/.test(eventId)) return res.status(400).json({ error: 'A unique eventId is required' });
    const client = await pool.connect();
    try {
      await client.query('begin');
      let row = await client.query('select state,revision from online_empires where user_id=$1 and season_id=$2 for update', [req.user.id, config.seasonId]);
      if (!row.rowCount) {
        const profile = await getOrCreateProfile(req.user);
        await client.query('insert into online_empires(user_id,season_id,state) values($1,$2,$3) on conflict do nothing', [req.user.id, config.seasonId, JSON.stringify(defaultEmpire(profile.nickname))]);
        row = await client.query('select state,revision from online_empires where user_id=$1 and season_id=$2 for update', [req.user.id, config.seasonId]);
      }
      const duplicate = await client.query(
        `select 1 from online_economy_events where user_id=$1 and season_id=$2 and (event_id=$3 or event_id like $3||':%') limit 1`,
        [req.user.id, config.seasonId, eventId],
      );
      if (duplicate.rowCount) {
        await client.query('commit');
        return res.json({ duplicate: true, state: row.rows[0].state, revision: Number(row.rows[0].revision) });
      }
      const state = row.rows[0].state;
      const events = advanceEmpire(state);
      events.push(...applyEmpireCommand(state, command));
      const updated = await client.query(
        `update online_empires set state=$3,revision=revision+1,updated_at=now()
         where user_id=$1 and season_id=$2 returning revision`,
        [req.user.id, config.seasonId, JSON.stringify(state)],
      );
      await client.query(
        `update online_season_players set industrial_score=$3,civilization=$4
         where season_id=$1 and user_id=$2`,
        [config.seasonId, req.user.id, empireIndustrialScore(state), state.currentCiv],
      );
      for (const [index, event] of events.entries()) {
        await client.query(
          `insert into online_economy_events(user_id,season_id,event_id,event_type,resource,amount,state_revision,payload)
           values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(user_id,season_id,event_id) do nothing`,
          [req.user.id, config.seasonId, index ? `${eventId}:${index}` : eventId, event.eventType, event.resource, event.amount, updated.rows[0].revision, JSON.stringify(event.payload || {})],
        );
      }
      await client.query('commit');
      res.json({ state, revision: Number(updated.rows[0].revision), events });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally { client.release(); }
  });
  api.post('/me/empire/import-local-save', async (req, res) => {
    if (!config.allowLocalSaveImport) return res.status(403).json({ error: 'Local save import is disabled for this season' });
    const candidate = req.body?.state;
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || JSON.stringify(candidate).length > 100_000) return res.status(400).json({ error: 'Invalid save data' });
    const state = normalizeLocalEmpireImport(candidate);
    const saved = await pool.query(
      `insert into online_empires(user_id,season_id,state) values($1,$2,$3)
       on conflict(user_id,season_id) do nothing returning revision`,
      [req.user.id, config.seasonId, JSON.stringify(state)],
    );
    if (!saved.rowCount) return res.status(409).json({ error: 'An online empire already exists' });
    res.status(201).json({ revision: Number(saved.rows[0].revision) });
  });
  api.post('/season/join', async (req, res) => {
    const profile = await getOrCreateProfile(req.user);
    const { state } = await getEmpire(req.user.id);
    const civ = civilizations.includes(state.currentCiv) ? state.currentCiv : null;
    if (!civ) return res.status(409).json({ error: 'Choose a civilization in the Megafactory first' });
    const season = await pool.connect();
    try {
      await season.query('begin');
      await season.query('select id from online_seasons where id=$1 for update', [config.seasonId]);
      const seasonConfig = await season.query('select roster_size,status from online_seasons where id=$1', [config.seasonId]);
      if (!seasonConfig.rowCount) throw Object.assign(new Error('Season not found'), { status: 404 });
      if (seasonConfig.rows[0].status !== 'open' && seasonConfig.rows[0].status !== 'running') {
        throw Object.assign(new Error('Season is closed'), { status: 409 });
      }
      const membership = await season.query(
        'select 1 from online_season_players where season_id=$1 and user_id=$2',
        [config.seasonId, req.user.id],
      );
      if (!membership.rowCount) {
        const humans = await season.query(
          'select count(*)::int as count from online_season_players where season_id=$1 and not is_bot',
          [config.seasonId],
        );
        if (humans.rows[0].count >= seasonConfig.rows[0].roster_size) {
          throw Object.assign(new Error('Season is full'), { status: 409 });
        }
      }
      await season.query(
        `insert into online_season_players(season_id,participant_id,user_id,display_name,civilization,is_bot)
         values($1,$2,$3,$4,$5,false)
         on conflict(season_id,user_id) do update set display_name=excluded.display_name,civilization=excluded.civilization`,
        [config.seasonId, `human:${req.user.id}`, req.user.id, profile.nickname, civ],
      );
      const rosterSize = seasonConfig.rows[0].roster_size;
      const total = await season.query('select count(*)::int as count from online_season_players where season_id=$1', [config.seasonId]);
      const excess = Math.max(0, total.rows[0].count - rosterSize);
      const bots = excess ? await season.query(
        `select participant_id from online_season_players s where s.season_id=$1 and s.is_bot
         and not exists (select 1 from online_matches m where m.status in ('queued','active')
           and (m.player_a=s.participant_id or m.player_b=s.participant_id))
         order by created_at desc limit $2`, [config.seasonId, excess],
      ) : { rows: [] };
      if (bots.rowCount) await season.query('delete from online_season_players where season_id=$1 and participant_id=any($2::text[])', [config.seasonId, bots.rows.map((row) => row.participant_id)]);
      await season.query('commit');
    } catch (error) {
      await season.query('rollback');
      throw error;
    } finally {
      season.release();
    }
    res.json({ joined: true, seasonId: config.seasonId });
  });
  api.get('/season', async (_req, res) => {
    const season = await seasonRoster(config.seasonId);
    if (!season) return res.status(404).json({ error: 'Season not found' });
    res.json({ season });
  });
  api.get('/leaderboard', async (_req, res) => {
    const result = await pool.query(
      `select participant_id,display_name,civilization,is_bot,bot_strategy,rating,points,wins,draws,losses,industrial_score
       from online_season_players where season_id=$1 order by points desc,rating desc,wins desc`, [config.seasonId],
    );
    res.json({ seasonId: config.seasonId, players: result.rows });
  });
  api.post('/matches/queue', async (req, res) => {
    const current = manager.queueStatus(req.user.id);
    if (current) return res.json(current);
    const player = await pool.query('select 1 from online_season_players where season_id=$1 and user_id=$2 and not is_bot', [config.seasonId, req.user.id]);
    if (!player.rowCount) return res.status(409).json({ error: 'Join the season first' });
    res.json(await manager.queuePlayer(req.user.id));
  });
  api.get('/matches/status', (req, res) => {
    res.json({ status: manager.queueStatus(req.user.id) });
  });
  api.get('/matches/:matchId', async (req, res) => {
    const match = await pool.query(
      `select m.id,m.season_id,m.ruleset_version,m.mode,m.status,m.result,m.seed,m.duration_seconds,m.end_reason,
       m.started_at,m.completed_at,m.report,p.participant_id,p.result as player_result,p.rating_before,p.rating_after,p.stats
       from online_matches m join online_match_participants p on p.match_id=m.id
       where m.id=$1 and p.user_id=$2`, [req.params.matchId, req.user.id],
    );
    if (!match.rowCount) return res.status(404).json({ error: 'Match not found' });
    // Event payloads contain full server-side samples, including the hidden opponent bank.
    // Keep them unavailable while either player can still act.
    const events = match.rows[0].status === 'complete'
      ? await pool.query(
        `select seq,game_time,event_type,player_id,payload from online_match_events
         where match_id=$1 order by seq`, [req.params.matchId],
      )
      : { rows: [] };
    res.json({ match: match.rows[0], events: events.rows });
  });
  api.get('/analytics/summary', async (req, res) => {
    const [matches, events, economy, performance] = await Promise.all([
      pool.query(`select count(*)::int matches, count(*) filter(where result='a')::int wins_a,
        count(*) filter(where result='b')::int wins_b,count(*) filter(where result='draw')::int draws,
        coalesce(avg(duration_seconds),0)::numeric(10,2) average_duration
        from online_matches where season_id=$1 and status='complete'`, [config.seasonId]),
      pool.query(`select event_type,count(*)::int count from online_match_events e
        join online_matches m on m.id=e.match_id where m.season_id=$1 group by event_type order by count desc`, [config.seasonId]),
      pool.query(`select event_type,count(*)::int count from online_economy_events where season_id=$1
        and user_id=$2 group by event_type`, [config.seasonId, req.user.id]),
      pool.query(`select count(*)::int games,
        count(*) filter(where p.result='win')::int wins,
        count(*) filter(where p.result='draw')::int draws,
        count(*) filter(where p.result='loss')::int losses,
        coalesce(round(avg((p.stats->>'damageDealt')::numeric),2),0) average_damage,
        coalesce(round(avg((p.stats->>'militarySpend')::numeric),2),0) average_military_spend,
        coalesce(round(avg((p.stats->>'defensiveSpend')::numeric),2),0) average_defensive_spend,
        coalesce(round(avg((p.stats->>'territorySeconds')::numeric),2),0) average_territory_seconds,
        coalesce(round(avg((p.stats->'telemetry'->>'validDecisions')::numeric),2),0) average_decisions,
        coalesce(round(avg((p.stats->'telemetry'->>'invalidInputs')::numeric),2),0) average_invalid_inputs,
        coalesce(round(avg((p.stats->'telemetry'->>'queueWaitMs')::numeric)/1000,2),0) average_queue_wait_seconds
        from online_match_participants p join online_matches m on m.id=p.match_id
        where m.season_id=$1 and p.user_id=$2 and m.status='complete'`, [config.seasonId, req.user.id]),
    ]);
    res.json({ seasonId: config.seasonId, matches: matches.rows[0], myPerformance: performance.rows[0], arenaEvents: events.rows, ownEconomyEvents: economy.rows });
  });
  api.get('/analytics/export', async (req, res) => {
    const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const economyLimit = 1000;
    const before = typeof req.query.matchesBefore === 'string' ? req.query.matchesBefore : null;
    const beforeId = typeof req.query.matchesBeforeId === 'string' ? req.query.matchesBeforeId : null;
    if (Boolean(before) !== Boolean(beforeId)
        || (before && !Number.isFinite(Date.parse(before)))
        || (beforeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(beforeId))) {
      return res.status(400).json({ error: 'Invalid match export cursor' });
    }
    const economyBefore = typeof req.query.economyBefore === 'string' ? req.query.economyBefore : null;
    if (economyBefore && !/^[1-9][0-9]*$/.test(economyBefore)) return res.status(400).json({ error: 'Invalid economy export cursor' });
    const requestedAsOf = typeof req.query.exportAsOf === 'string' ? req.query.exportAsOf : null;
    if (requestedAsOf && !Number.isFinite(Date.parse(requestedAsOf))) return res.status(400).json({ error: 'Invalid export timestamp' });
    const exportAsOf = requestedAsOf ? new Date(requestedAsOf) : new Date();
    const includeEmpire = !before && !beforeId && !economyBefore && !requestedAsOf;
    const [matchesResult, economyResult, empire] = await Promise.all([
      pool.query(
        `select m.id,m.season_id,m.ruleset_version,m.mode,m.status,m.result,m.seed,m.duration_seconds,
         m.end_reason,m.started_at,m.completed_at,p.participant_id,p.result as player_result,
         coalesce(m.started_at,m.created_at) as export_cursor_at,
         p.rating_before,p.rating_after,p.stats,
         coalesce((select jsonb_agg(jsonb_build_object('seq',e.seq,'eventVersion',e.event_version,
           'gameTime',e.game_time,'eventType',e.event_type,'playerId',e.player_id,'payload',e.payload)
           order by e.seq) from online_match_events e where e.match_id=m.id),'[]'::jsonb) as events,
         m.report
         from online_matches m join online_match_participants p on p.match_id=m.id
         where m.season_id=$1 and p.user_id=$2 and m.status in ('complete','abandoned')
         and coalesce(m.completed_at,m.started_at,m.created_at)<=$5::timestamptz
         and ($3::timestamptz is null or (coalesce(m.started_at,m.created_at),m.id)<($3::timestamptz,$4::uuid))
         order by coalesce(m.started_at,m.created_at) desc,m.id desc limit $6`,
        [config.seasonId, req.user.id, before, beforeId, exportAsOf.toISOString(), limit + 1],
      ),
      pool.query(
        `select id,event_id,event_type,resource,amount,state_revision,payload,created_at
         from online_economy_events where user_id=$1 and season_id=$2
         and created_at<=$5::timestamptz and ($3::bigint is null or id<$3::bigint)
         order by id desc limit $4`, [req.user.id, config.seasonId, economyBefore, economyLimit + 1, exportAsOf.toISOString()],
      ),
      includeEmpire ? pool.query(
        `select state,revision,updated_at from online_empires where user_id=$1 and season_id=$2`,
        [req.user.id, config.seasonId],
      ) : Promise.resolve({ rows: [] }),
    ]);
    const hasMoreMatches = matchesResult.rows.length > limit;
    const hasMoreEconomyEvents = economyResult.rows.length > economyLimit;
    const matches = matchesResult.rows.slice(0, limit);
    const economyEvents = economyResult.rows.slice(0, economyLimit);
    const ownEmpire = empire.rows[0] ? {
      state: empire.rows[0].state,
      revision: Number(empire.rows[0].revision),
      updatedAt: empire.rows[0].updated_at,
    } : null;
    const lastMatch = matches.at(-1);
    const lastEconomyEvent = economyEvents.at(-1);
    res.json({
      exportFormatVersion: 1, exportedAt: exportAsOf.toISOString(), seasonId: config.seasonId, ownEmpire,
      matches, economyEvents,
      hasMoreMatches, hasMoreEconomyEvents,
      next: {
        matchesBefore: lastMatch?.export_cursor_at || null,
        matchesBeforeId: lastMatch?.id || null,
        economyBefore: lastEconomyEvent?.id || null,
        exportAsOf: exportAsOf.toISOString(),
      },
    });
  });
  api.get('/analytics/admin/export', async (req, res) => {
    if (!config.adminUserIds.includes(req.user.id)) return res.status(403).json({ error: 'Administrator access required' });
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
    const economyLimit = 1000;
    const before = typeof req.query.matchesBefore === 'string' ? req.query.matchesBefore : null;
    const beforeId = typeof req.query.matchesBeforeId === 'string' ? req.query.matchesBeforeId : null;
    if (Boolean(before) !== Boolean(beforeId)
        || (before && !Number.isFinite(Date.parse(before)))
        || (beforeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(beforeId))) {
      return res.status(400).json({ error: 'Invalid match export cursor' });
    }
    const economyBefore = typeof req.query.economyBefore === 'string' ? req.query.economyBefore : null;
    if (economyBefore && !/^[1-9][0-9]*$/.test(economyBefore)) return res.status(400).json({ error: 'Invalid economy export cursor' });
    const requestedAsOf = typeof req.query.exportAsOf === 'string' ? req.query.exportAsOf : null;
    if (requestedAsOf && !Number.isFinite(Date.parse(requestedAsOf))) return res.status(400).json({ error: 'Invalid export timestamp' });
    const exportAsOf = requestedAsOf ? new Date(requestedAsOf) : new Date();
    const includeSnapshots = !before && !beforeId && !economyBefore && !requestedAsOf;
    const [matchesResult, economyResult, profiles, seasonPlayers] = await Promise.all([
      pool.query(
        `select m.id,m.season_id,m.ruleset_version,m.mode,m.status,m.result,m.seed,m.duration_seconds,
         m.end_reason,m.started_at,m.completed_at,m.created_at,coalesce(m.started_at,m.created_at) as export_cursor_at,m.report,
         coalesce((select jsonb_agg(to_jsonb(p)-'match_id' order by p.participant_id)
           from online_match_participants p where p.match_id=m.id),'[]'::jsonb) as participants,
         coalesce((select jsonb_agg(jsonb_build_object('seq',e.seq,'eventVersion',e.event_version,
           'gameTime',e.game_time,'eventType',e.event_type,'playerId',e.player_id,'payload',e.payload,
           'createdAt',e.created_at) order by e.seq)
           from online_match_events e where e.match_id=m.id),'[]'::jsonb) as events
         from online_matches m where m.season_id=$1 and m.status in ('complete','abandoned')
         and coalesce(m.completed_at,m.started_at,m.created_at)<=$2::timestamptz
         and ($3::timestamptz is null or (coalesce(m.started_at,m.created_at),m.id)<($3::timestamptz,$4::uuid))
         order by coalesce(m.started_at,m.created_at) desc,m.id desc limit $5`,
        [config.seasonId, exportAsOf.toISOString(), before, beforeId, limit + 1],
      ),
      pool.query(
        `select id,user_id,season_id,event_id,event_type,resource,amount,state_revision,payload,created_at
         from online_economy_events where season_id=$1 and created_at<=$4::timestamptz
         and ($2::bigint is null or id<$2::bigint)
         order by id desc limit $3`, [config.seasonId, economyBefore, economyLimit + 1, exportAsOf.toISOString()],
      ),
      includeSnapshots ? pool.query(
        `select s.participant_id,s.user_id,p.nickname,p.created_at,p.updated_at,
         e.state,e.state_version,e.revision,e.updated_at as empire_updated_at
         from online_season_players s join online_profiles p on p.user_id=s.user_id
         left join online_empires e on e.user_id=s.user_id and e.season_id=s.season_id
         where s.season_id=$1 and not s.is_bot order by p.created_at,s.user_id`, [config.seasonId],
      ) : Promise.resolve({ rows: [] }),
      includeSnapshots ? pool.query(
        `select season_id,participant_id,user_id,display_name,civilization,is_bot,bot_strategy,
         rating,points,wins,draws,losses,industrial_score,created_at
         from online_season_players where season_id=$1 order by is_bot,points desc,rating desc,participant_id`, [config.seasonId],
      ) : Promise.resolve({ rows: [] }),
    ]);
    const hasMoreMatches = matchesResult.rows.length > limit;
    const hasMoreEconomyEvents = economyResult.rows.length > economyLimit;
    const matches = matchesResult.rows.slice(0, limit);
    const economyEvents = economyResult.rows.slice(0, economyLimit);
    const lastMatch = matches.at(-1), lastEconomyEvent = economyEvents.at(-1);
    res.json({
      exportFormatVersion: 1, exportedAt: exportAsOf.toISOString(), seasonId: config.seasonId,
      ...(includeSnapshots ? { profiles: profiles.rows, seasonPlayers: seasonPlayers.rows } : {}),
      matches, economyEvents, hasMoreMatches, hasMoreEconomyEvents,
      next: {
        matchesBefore: lastMatch?.export_cursor_at || null,
        matchesBeforeId: lastMatch?.id || null,
        economyBefore: lastEconomyEvent?.id || null,
        exportAsOf: exportAsOf.toISOString(),
      },
    });
  });
  api.post('/matches/:matchId/action', async (req, res, next) => {
    try { res.json(await manager.act(req.user.id, req.params.matchId, req.body)); }
    catch (error) { next(error); }
  });
  return api;
}

export { defaultEmpire };

import { randomInt, randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { pool } from '../db.js';
import { applyMatchReward } from './empire-service.js';
import { createMatch, publicMatchState } from './arena-runtime.js';

const BOT_STRATEGIES = ['GREEDY','RUSHER','TURTLE','TEMPO','ADAPTIVE','RANDOM','BALANCED','HOARDER','SABOTEUR'];
const CIVILIZATIONS = ['forge','bastion','swarm','nexus'];

export class MatchManager {
  constructor() {
    this.queue = [];
    this.queuedUsers = new Map();
    this.matches = new Map();
    this.userMatches = new Map();
    this.startingUsers = new Map();
    this.queueLoadingUsers = new Set();
    this.connections = new Map();
    this.fillingQueue = false;
    this.queueTimer = null;
    this.tickTimer = null;
  }

  start() {
    this.queueTimer = setInterval(() => this.fillQueueWithBots(), 500);
    this.tickTimer = setInterval(() => this.tickMatches(), config.matchTickIntervalMs);
  }

  stop() {
    clearInterval(this.queueTimer);
    clearInterval(this.tickTimer);
    for (const session of this.matches.values()) clearTimeout(session.cleanupTimer);
  }

  joinSocket(userId, socket) {
    const sockets = this.connections.get(userId) || new Set();
    sockets.add(socket);
    this.connections.set(userId, sockets);
    socket.on('close', () => {
      sockets.delete(socket);
      if (!sockets.size) this.connections.delete(userId);
    });
  }

  queueStatus(userId) {
    const queued = this.queuedUsers.get(userId);
    if (queued) return { status: 'queued', queueId: queued.queueId };
    const matchId = this.userMatches.get(userId);
    if (matchId) return { status: 'active', matchId };
    const startingMatchId = this.startingUsers.get(userId);
    if (startingMatchId) return { status: 'starting', matchId: startingMatchId };
    if (this.queueLoadingUsers.has(userId)) return { status: 'queued' };
    return null;
  }

  async queuePlayer(userId) {
    const existingStatus = this.queueStatus(userId);
    if (existingStatus) return existingStatus;
    this.queueLoadingUsers.add(userId);
    try {
      const profile = await pool.query(
        `select p.nickname, coalesce(e.state->>'currentCiv','forge') as civilization,
         e.state as empire_state
         from online_profiles p left join online_empires e
         on e.user_id=p.user_id and e.season_id=$2 where p.user_id=$1`,
        [userId, config.seasonId],
      );
      this.queueLoadingUsers.delete(userId);
      const currentStatus = this.queueStatus(userId);
      if (currentStatus) return currentStatus;
      const player = profile.rows[0];
      if (!player) throw Object.assign(new Error('Create a player profile first'), { status: 409 });
      const entry = {
        queueId: randomUUID(), userId, nickname: player.nickname,
        civilization: CIVILIZATIONS.includes(player.civilization) ? player.civilization : 'forge',
        factoryProgress: player.empire_state ? {
          research: player.empire_state.research || [],
          activeDoctrine: player.empire_state.activeDoctrine || null,
          civMastery: Math.min(10, Number(player.empire_state.civLegacies?.[player.civilization] || 0) + Number(player.empire_state.loyalty?.[player.civilization] || 0)),
        } : null,
        queuedAt: Date.now(),
      };
      this.queue.push(entry);
      this.queuedUsers.set(userId, entry);
      this.matchQueued(entry);
      return { status: 'queued', queueId: entry.queueId, botFillAfterMs: config.botFillDelayMs };
    } finally {
      this.queueLoadingUsers.delete(userId);
    }
  }

  matchQueued(entry) {
    const socketSet = this.connections.get(entry.userId);
    if (!socketSet) return;
    this.sendToUser(entry.userId, { type: 'queue', status: 'queued', queueId: entry.queueId });
  }

  async fillQueueWithBots() {
    if (this.fillingQueue) return;
    this.fillingQueue = true;
    try {
      while (this.queue.length >= 2) {
        const first = this.queue[0];
        const pairIndex = this.queue.findIndex((entry, index) => index > 0 && entry.userId !== first.userId && entry.civilization !== first.civilization);
        if (pairIndex < 0) break;
        const [a] = this.queue.splice(0, 1);
        const [b] = this.queue.splice(pairIndex - 1, 1);
        if (a.userId) this.queuedUsers.delete(a.userId);
        if (b.userId) this.queuedUsers.delete(b.userId);
        await this.startMatch(a, b);
      }
      const readyIndex = this.queue.findIndex((entry) => Date.now() - entry.queuedAt >= config.botFillDelayMs);
      if (readyIndex >= 0) {
        const [human] = this.queue.splice(readyIndex, 1);
        this.queuedUsers.delete(human.userId);
        this.queueLoadingUsers.add(human.userId);
        try {
          const rosterBot = await pool.query(
            `select participant_id,display_name,civilization,bot_strategy from online_season_players
             where season_id=$1 and is_bot and civilization<>$2
             and not exists (
               select 1 from online_matches m where m.status in ('queued','active')
               and (m.player_a=online_season_players.participant_id or m.player_b=online_season_players.participant_id)
             ) order by random() limit 1`,
            [config.seasonId, human.civilization],
          );
          const options = CIVILIZATIONS.filter((civ) => civ !== human.civilization);
          const bot = rosterBot.rowCount ? {
            userId: null, participantId: rosterBot.rows[0].participant_id,
            nickname: rosterBot.rows[0].display_name, civilization: rosterBot.rows[0].civilization,
            strategy: rosterBot.rows[0].bot_strategy,
          } : {
            userId: null,
            participantId: `bot:${randomUUID()}`,
            nickname: `${config.botNamePrefix} ${randomInt(10, 9999)}`,
            civilization: options[randomInt(options.length)],
            strategy: BOT_STRATEGIES[randomInt(BOT_STRATEGIES.length)],
          };
          await this.startMatch(human, bot);
        } catch (error) {
          if (!this.queuedUsers.has(human.userId)) {
            this.queue.unshift(human);
            this.queuedUsers.set(human.userId, human);
          }
          throw error;
        } finally {
          this.queueLoadingUsers.delete(human.userId);
        }
      }
    } catch (error) {
      console.error('Queue processing failed', error);
    } finally {
      this.fillingQueue = false;
    }
  }

  async startMatch(a, b) {
    const id = randomUUID();
    const seed = randomInt(1, 0x7fffffff);
    const seasonId = config.seasonId;
    const userIds = [a.userId, b.userId].filter(Boolean);
    const participantA = a.userId ? `human:${a.userId}` : a.participantId;
    const participantB = b.userId ? `human:${b.userId}` : b.participantId;
    let match;
    let session;
    let client;
    try {
      match = createMatch({
        seed, civilizationA: a.civilization, civilizationB: b.civilization,
        botStrategy: b.strategy || null,
        factoryProgressA: a.factoryProgress || null,
        factoryProgressB: b.factoryProgress || null,
      });
      session = {
        id, seed, seasonId, match, userIds, participantA, participantB,
        mode: b.userId ? 'ranked' : 'bot-fill',
        sides: new Map([[a.userId, 'A'], [b.userId, 'B']].filter(([userId]) => userId)),
        actionBuckets: new Map(),
        players: [a, b], lastBroadcast: 0, nextWallTick: performance.now(),
        lastEventFlushAt: 0, persistedEventSeq: 0, eventPersistPromise: null,
        status: 'active',
      };
      for (const userId of userIds) this.startingUsers.set(userId, id);
      client = await pool.connect();
      await client.query('begin');
      await client.query(
        `insert into public.online_matches
         (id,season_id,ruleset_version,seed,mode,status,player_a,player_b,started_at)
         values($1,$2,'arena-online-1.7',$3,$4,'active',$5,$6,now())`,
        [id, seasonId, seed, session.mode, participantA, participantB],
      );
      for (const [player, participantId] of [[a, participantA], [b, participantB]]) {
        if (!player.userId) {
          await client.query(
            `insert into public.online_season_players
             (season_id,participant_id,display_name,civilization,is_bot,bot_strategy)
             values($1,$2,$3,$4,true,$5) on conflict(season_id,participant_id) do nothing`,
            [seasonId, participantId, player.nickname, player.civilization, player.strategy || null],
          );
        }
        await client.query(
          `insert into public.online_match_participants
           (match_id,participant_id,user_id,display_name,civilization,bot_strategy)
           values($1,$2,$3,$4,$5,$6)`,
          [id, participantId, player.userId, player.nickname, player.civilization, player.strategy || null],
        );
      }
      await client.query('commit');
    } catch (error) {
      await client?.query('rollback').catch(() => {});
      for (const userId of userIds) this.startingUsers.delete(userId);
      const restore = b.userId ? [a, b] : [a];
      this.queue.unshift(...restore);
      for (const player of restore) if (player.userId) this.queuedUsers.set(player.userId, player);
      throw error;
    } finally {
      client?.release();
    }
    for (const userId of userIds) this.startingUsers.delete(userId);
    session.startedAt = Date.now();
    this.matches.set(id, session);
    for (const userId of userIds) {
      this.userMatches.set(userId, id);
      try {
        const side = session.sides.get(userId);
        this.sendToUser(userId, { type: 'match.started', matchId: id, side, state: publicMatchState(match, side) });
      } catch (error) {
        console.error('Could not send match start; player can rejoin', id, userId, error);
      }
    }
  }

  async act(userId, matchId, action) {
    const session = this.matches.get(matchId);
    if (!session || session.status !== 'active') throw Object.assign(new Error('Match is not active'), { status: 404 });
    const side = session.sides.get(userId);
    if (!side) throw Object.assign(new Error('You are not a participant in this match'), { status: 403 });
    if (!action || typeof action.action !== 'string' || action.action.length > 40) {
      throw Object.assign(new Error('Invalid action'), { status: 400 });
    }
    const now = performance.now();
    const bucket = session.actionBuckets.get(userId) || { tokens: config.playerActionBurst, updatedAt: now };
    bucket.tokens = Math.min(config.playerActionBurst,
      bucket.tokens + ((now - bucket.updatedAt) / 1000) * config.playerActionsPerSecond);
    bucket.updatedAt = now;
    if (bucket.tokens < 1) {
      session.actionBuckets.set(userId, bucket);
      throw Object.assign(new Error('Too many actions; wait a moment and retry'), { status: 429 });
    }
    bucket.tokens -= 1;
    session.actionBuckets.set(userId, bucket);
    const player = session.match.players[side === 'A' ? 0 : 1];
    let accepted = false;
    if (action.action === 'module') {
      if (typeof action.key !== 'string' || action.key.length > 60) throw Object.assign(new Error('Invalid module'), { status: 400 });
      accepted = session.match.startModule(player, action.key);
    } else if (action.action === 'retreat') {
      accepted = session.match.retreatGuardians(player, action.count);
    } else if (action.action === 'emergency-shield') {
      accepted = session.match.activateEmergencyShield(player);
    } else {
      if (action.action === 'capture') {
        const count = action.count === undefined ? 100 : Number(action.count);
        const maxCount = player.factoryProgress?.research?.includes('node_reserve') ? 300 : 200;
        if (!Number.isInteger(count) || count < 1 || count > maxCount) throw Object.assign(new Error(`Guardian count must be between 1 and ${maxCount}`), { status: 400 });
        player.pendingGuardianCount = count;
      }
      accepted = session.match.act(player, action.action, Number.isInteger(action.cell) ? action.cell : undefined);
    }
    if (!player.bot) {
      const telemetry = player.telemetry || (player.telemetry = {});
      telemetry.inputs ||= 0;
      telemetry.invalidInputs ||= 0;
      telemetry.validDecisions ||= 0;
      telemetry.majorDecisions ||= 0;
      telemetry.decisionGroups ||= [];
      telemetry.lastDecisionAt ??= -Infinity;
      telemetry.inputs++;
      if (!accepted) telemetry.invalidInputs++;
      else {
        const major = ['eco', 'large', 'capture', 'module'].includes(action.action);
        const grouping = globalThis.FactoryWars.Config.GAME_CONFIG.production.decisionGroupSeconds;
        if (major || session.match.t - telemetry.lastDecisionAt >= grouping) {
          telemetry.validDecisions++;
          telemetry.lastDecisionAt = session.match.t;
          telemetry.decisionGroups.push(Number(session.match.t.toFixed(1)));
          if (major) telemetry.majorDecisions++;
        }
      }
    }
    if (!accepted) session.match.log('action_rejected', player, { action: action.action });
    try { await this.persistPendingEvents(session); }
    catch (error) {
      // Don't reject an action after it has changed authoritative state.
      // The periodic flush and final match transaction will retry the event stream.
      console.error('Could not persist live match events; will retry', matchId, error);
    }
    const response = { type: 'match.state', matchId, accepted, state: publicMatchState(session.match, side) };
    try { this.broadcast(session, response); }
    catch (error) { console.error('Could not broadcast match action state', matchId, error); }
    return response;
  }

  tickMatches() {
    const now = performance.now();
    for (const session of this.matches.values()) {
      if (session.status !== 'active') continue;
      const dt = Math.min(0.5, Math.max(0, (now - session.nextWallTick) / 1000));
      session.nextWallTick = now;
      if (dt > 0) session.match.step(dt, true);
      if (now - session.lastEventFlushAt >= config.matchEventPersistIntervalMs) {
        session.lastEventFlushAt = now;
        void this.persistPendingEvents(session).catch((error) => {
          console.error('Could not persist live match events; will retry', session.id, error);
        });
      }
      if (now - session.lastBroadcast >= config.stateBroadcastIntervalMs) {
        session.lastBroadcast = now;
        try { this.broadcast(session, { type: 'match.state', matchId: session.id }); }
        catch (error) { console.error('Could not broadcast match state', session.id, error); }
      }
      if (session.match.ended) void this.finishMatch(session);
    }
  }

  async persistPendingEvents(session) {
    if (session.eventPersistPromise) {
      await session.eventPersistPromise;
      if (session.match.events.length > session.persistedEventSeq) return this.persistPendingEvents(session);
      return;
    }
    const startSeq = session.persistedEventSeq;
    const pending = session.match.events.slice(startSeq);
    if (!pending.length) return;
    const operation = pool.query(
      `insert into public.online_match_events(match_id,seq,game_time,event_type,player_id,payload)
       select $1,x.seq,x.t,x.type,x.player,x.payload from jsonb_to_recordset($2::jsonb)
       as x(seq integer,t numeric,type text,player text,payload jsonb)
       on conflict(match_id,seq) do nothing`,
      [session.id, JSON.stringify(pending.map((event, index) => ({
        seq: startSeq + index, t: event.t, type: event.type, player: event.player, payload: event,
      })))],
    ).then(() => { session.persistedEventSeq = startSeq + pending.length; });
    session.eventPersistPromise = operation;
    try { await operation; }
    finally { if (session.eventPersistPromise === operation) session.eventPersistPromise = null; }
  }

  async flushPendingEvents() {
    await Promise.all([...this.matches.values()].map(async (session) => {
      try {
        if (session.eventPersistPromise) await session.eventPersistPromise;
        await this.persistPendingEvents(session);
      } catch (error) {
        console.error('Could not flush match events during shutdown', session.id, error);
      }
    }));
  }

  async finishMatch(session) {
    if (session.status !== 'active') return;
    session.status = 'saving';
    const report = session.match.report();
    delete report.events;
    report.players = (report.players || []).map((playerReport, index) => ({
      ...playerReport,
      telemetry: {
        ...(session.match.players[index]?.telemetry || {}),
        queueWaitMs: Number.isFinite(session.players[index]?.queuedAt)
          ? Math.max(0, session.startedAt - session.players[index].queuedAt)
          : null,
      },
    }));
    // Factory research and doctrines are private progression. The engine includes
    // both sides in its settings snapshot, so strip them before storing or sharing
    // the post-match report (including analytics exports).
    if (report.settings && typeof report.settings === 'object') {
      const { factoryProgress: _privateFactoryProgress, ...publicSettings } = report.settings;
      report.settings = publicSettings;
    }
    const result = session.match.winner === 'A' ? 'a' : session.match.winner === 'B' ? 'b' : 'draw';
    const now = new Date().toISOString();
    const rewards = new Map();
    let client;
    try {
      client = await pool.connect();
      await client.query('begin');
      const persistedMatch = await client.query(
        'select status from public.online_matches where id=$1 for update', [session.id],
      );
      if (!persistedMatch.rowCount) throw new Error(`Match record ${session.id} is missing`);
      const persistedStatus = persistedMatch.rows[0].status;
      if (persistedStatus === 'complete') {
        const savedRewards = await client.query(
          `select user_id,payload from public.online_economy_events
           where event_id=$1 and event_type='match_reward'`, [`match-${session.id}`],
        );
        for (const row of savedRewards.rows) rewards.set(row.user_id, row.payload);
      } else {
        if (persistedStatus !== 'active') throw new Error(`Cannot finalize match ${session.id} from status ${persistedStatus}`);
        await client.query(
          `update public.online_matches set status='complete',result=$2,duration_seconds=$3,
           end_reason=$4,report=$5,completed_at=$6 where id=$1`,
          [session.id, result, session.match.t, session.match.endReason, JSON.stringify(report), now],
        );
        const events = session.match.events.map((event, seq) => ({ seq, t: event.t, type: event.type, player: event.player, payload: event }));
        await client.query(
          `insert into public.online_match_events(match_id,seq,game_time,event_type,player_id,payload)
           select $1,x.seq,x.t,x.type,x.player,x.payload from jsonb_to_recordset($2::jsonb)
           as x(seq integer,t numeric,type text,player text,payload jsonb)
           on conflict(match_id,seq) do nothing`,
          [session.id, JSON.stringify(events)],
        );
        for (const [index, participantId] of [session.participantA, session.participantB].entries()) {
          const ownResult = result === 'draw' ? 'draw' : result === (index === 0 ? 'a' : 'b') ? 'win' : 'loss';
          const playerReport = report.players[index] || {};
          await client.query(
            `update public.online_match_participants set result=$3,stats=$4::jsonb
             where match_id=$1 and participant_id=$2`,
            [session.id, participantId, ownResult, JSON.stringify({
              ...(playerReport.stats || {}),
              final: playerReport.final || {},
              telemetry: playerReport.telemetry || {},
            })],
          );
          const userId = session.players[index]?.userId;
          if (userId) {
            const empire = await client.query(
              'select state,revision from public.online_empires where user_id=$1 and season_id=$2 for update',
              [userId, session.seasonId],
            );
            if (!empire.rowCount) throw new Error(`Empire for match participant ${userId} is missing`);
            const state = empire.rows[0].state;
            const reward = applyMatchReward(state, ownResult);
            const updated = await client.query(
              `update public.online_empires set state=$3,revision=revision+1,updated_at=now()
               where user_id=$1 and season_id=$2 returning revision`,
              [userId, session.seasonId, JSON.stringify(state)],
            );
            await client.query(
              `insert into public.online_economy_events
               (user_id,season_id,event_id,event_type,resource,amount,state_revision,payload)
               values($1,$2,$3,'match_reward',null,null,$4,$5) on conflict(user_id,season_id,event_id) do nothing`,
              [userId, session.seasonId, `match-${session.id}`, updated.rows[0].revision, JSON.stringify(reward)],
            );
            rewards.set(userId, reward);
          }
        }
        if (session.mode === 'ranked') await this.updateRankings(client, session, result);
      }
      await client.query('commit');
    } catch (error) {
      await client?.query('rollback').catch(() => {});
      session.status = 'active';
      console.error('Could not persist match result', session.id, error);
      return;
    } finally {
      client?.release();
    }
    session.status = 'complete';
    session.rewards = rewards;
    for (const userId of session.userIds) this.userMatches.delete(userId);
    try {
      this.broadcast(session, { type: 'match.complete', matchId: session.id, result, report });
    } catch (error) {
      // Persistence already committed; a socket delivery failure must not apply the rating twice.
      console.error('Could not broadcast completed match', session.id, error);
    }
    session.cleanupTimer = setTimeout(() => {
      if (this.matches.get(session.id) === session) this.matches.delete(session.id);
    }, 120_000);
    session.cleanupTimer.unref?.();
  }

  async updateRankings(client, session, result) {
    const scoreA = result === 'a' ? 1 : result === 'draw' ? 0.5 : 0;
    const rows = await client.query(
       `select participant_id,rating,points,wins,draws,losses from online_season_players
       where season_id=$1 and participant_id=any($2::text[])
       order by array_position($2::text[], participant_id) for update`,
      [session.seasonId, [session.participantA, session.participantB]],
    );
    if (rows.rowCount !== 2) throw new Error(`Expected two season roster rows for match ${session.id}`);
    const [a, b] = rows.rows;
    const expectedA = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
    const expectedB = 1 - expectedA;
    for (const [row, score, expected] of [[a, scoreA, expectedA], [b, 1 - scoreA, expectedB]]) {
      const won = score === 1, draw = score === 0.5;
      const nextRating = Math.round(row.rating + 32 * (score - expected));
      await client.query(
        `update online_season_players set rating=$3,points=points+$4,wins=wins+$5,
         draws=draws+$6,losses=losses+$7 where season_id=$1 and participant_id=$2`,
        [session.seasonId, row.participant_id, nextRating, won ? 3 : draw ? 1 : 0, won ? 1 : 0, draw ? 1 : 0, score === 0 ? 1 : 0],
      );
      await client.query(
        `update online_match_participants set rating_before=$3,rating_after=$4
         where match_id=$1 and participant_id=$2`,
        [session.id, row.participant_id, row.rating, nextRating],
      );
    }
  }

  sendToUser(userId, message) {
    const payload = JSON.stringify(message);
    for (const socket of this.connections.get(userId) || []) {
      if (socket.readyState !== 1) continue;
      try { socket.send(payload); }
      catch (error) {
        console.error('Could not send WebSocket message', userId, error);
        socket.terminate();
      }
    }
  }

  broadcast(session, message) {
    for (const userId of session.userIds) {
      if (!this.connections.get(userId)?.size) continue;
      const side = session.sides.get(userId);
      this.sendToUser(userId, {
        ...message,
        ...(message.type === 'match.complete' && session.rewards?.has(userId)
          ? { reward: session.rewards.get(userId) }
          : {}),
        ...(message.state === undefined && !['match.state', 'match.complete'].includes(message.type)
          ? {}
          : { state: publicMatchState(session.match, side) }),
      });
    }
  }
}

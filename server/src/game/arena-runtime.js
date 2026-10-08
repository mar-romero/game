import { readFile } from 'node:fs/promises';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(process.env.PUBLIC_DIR || resolve(here, '../../../public'));
let Match;

async function loadClassic(path) {
  const source = await readFile(resolve(publicRoot, path), 'utf8');
  runInThisContext(source, { filename: path });
}

async function loadRulesLayer(path, extraSource = '') {
  const source = await readFile(resolve(publicRoot, path), 'utf8');
  const marker = '/* FACTORY_WARS_HEADLESS_RULES_END */';
  const end = source.indexOf(marker);
  if (end < 0) throw new Error(`Arena rules marker missing in ${path}`);
  runInThisContext(`${source.slice(0, end)}\n${extraSource}`, { filename: path });
}

export async function initializeArenaRuntime() {
  globalThis.window = globalThis;
  globalThis.__fwOnlineArenaServer = true;
  await loadClassic('game/domain/arena-config.js');
  await loadClassic('game/domain/random.js');
  await loadClassic('game/domain/arena/match-engine.js');
  await loadClassic('game/domain/arena/industrial-modules.js');
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await loadRulesLayer('game/adapters/web/arena-core-runtime.js', `
    let settings = { mode: 'human', civA: 'forge', civB: 'swarm', botA: 'GREEDY', botB: 'RUSHER' };
    function moduleStatusReason() { return 'Unavailable'; }
    function setRuntimeSettings(next) { settings = next; }
  `);
  await loadRulesLayer('game/adapters/web/arena-production-system.js');
  await loadRulesLayer('game/adapters/web/arena-balance-overrides.js');
  await loadRulesLayer('game/adapters/web/arena-tech.js', '\n})();');
  await loadClassic('game/domain/empire/catalog.js');
  await loadClassic('game/domain/empire/economy.js');
  await loadClassic('game/domain/empire/progression.js');
  Match = globalThis.FactoryWars.Match;
  return Match;
}

export function createMatch({ seed, civilizationA, civilizationB, botStrategy = null, factoryProgressA = null, factoryProgressB = null }) {
  if (!Match) throw new Error('Arena runtime has not been initialized');
  const settings = {
    mode: 'human',
    training: false,
    civA: civilizationA,
    civB: civilizationB,
    botA: null,
    botB: botStrategy,
    factoryProgress: { A: factoryProgressA, B: factoryProgressB },
  };
  globalThis.setRuntimeSettings(settings);
  globalThis.__fwLeagueMatch = { factoryProgress: factoryProgressA };
  let match;
  try {
    match = new Match(settings, seed >>> 0);
  } finally {
    globalThis.__fwLeagueMatch = null;
  }
  for (const player of match.players) {
    player.factory = true;
    if (!player.tiles.includes('fabricator')) {
      const cell = player.tiles.findIndex((tile) => tile === null);
      if (cell >= 0) player.tiles[cell] = 'fabricator';
    }
    player.bank = Math.max(player.bank, 300);
  }
  return match;
}

export function publicMatchState(match, viewerSide = null) {
  const viewer = match.players.find((player) => player.id === viewerSide) || null;
  const canReadNodeForces = Boolean(viewer?.modules?.tech_node_intel);
  const modules = globalThis.FactoryWars.IndustrialModules || {};
  const { factoryProgress: _privateFactoryProgress, ...publicSettings } = match.settings;
  // Redactar los datos privados antes de aplicar las revelaciones de inteligencia.
  const visibleEvents = match.events.slice(-20).map((event) => {
    if (event.type === 'match_start') {
      const { seed: _seed, ...safe } = event;
      return safe;
    }
    if (event.type === 'state_sample' && event.player !== viewerSide) {
      const { bank: _bank, ...safe } = event;
      return safe;
    }
    if (event.player === viewerSide) return event;
    if (event.type === 'scan') {
      const { result: _result, ...safe } = event;
      return safe;
    }
    if (canReadNodeForces) return event;
    if (event.type === 'production_order' && event.action === 'capture') {
      const { cost: _cost, ...safe } = event;
      return safe;
    }
    if (event.type === 'territory_commit') {
      const { guardians: _guardians, cost: _cost, ...safe } = event;
      return safe;
    }
    if (event.type === 'territory_capture') {
      const { guardians: _guardians, sent: _sent, defenders: _defenders, ...safe } = event;
      return safe;
    }
    if (event.type.startsWith('guardian_')) {
      return { t: event.t, type: event.type, player: event.player };
    }
    return event;
  });
  return {
    settings: publicSettings,
    time: match.t,
    duration: globalThis.FactoryWars.Config.GAME_CONFIG.matchDuration,
    ended: match.ended,
    winner: match.winner,
    endReason: match.endReason,
    territoryOwner: match.owner,
    owner: match.owner,
    events: visibleEvents,
    transit: match.transit.map((trip) => {
      if (trip.kind !== 'capture' || trip.from === viewerSide || canReadNodeForces) return trip;
      const { guardians: _guardians, ...safe } = trip;
      return safe;
    }),
    lastSample: match.lastSample,
    guardians: {
      A: viewerSide === 'A' || canReadNodeForces ? (match.guardians?.A || 0) : null,
      B: viewerSide === 'B' || canReadNodeForces ? (match.guardians?.B || 0) : null,
      N: match.guardians?.N ?? (match.owner === null ? 100 : 0),
    },
    players: match.players.map((p) => {
      const stats = { ...p.stats };
      if (p.id !== viewerSide) {
        delete stats.peakBank;
        delete stats.hoardPenaltySeconds;
        if (!canReadNodeForces) delete stats.territorySpend;
      }
      return {
        id: p.id,
        civilization: p.civ,
        isBot: Boolean(p.bot),
        botStrategy: p.bot || null,
        bank: p.id === viewerSide ? Math.floor(p.bank) : null,
        income: Number(match.income(p).toFixed(2)),
        coreHp: p.hp,
        level: p.level,
        factory: p.factory,
        tiles: [...p.tiles],
        spec: p.spec,
        shields: (p.shields || []).map((shield) => ({ ...shield })),
        overdriveUntil: p.overdriveUntil || 0,
        sabotagedUntil: p.sabotagedUntil || 0,
        scanUntil: p.id === viewerSide ? p.scanUntil || 0 : 0,
        scanText: p.id === viewerSide ? p.scanText || '' : '',
        heavyCommitUntil: p.heavyCommitUntil || 0,
        shield: match.shield(p),
        specialization: p.spec,
        modules: { ...(p.modules || {}) },
        moduleBuild: p.moduleBuild ? { ...p.moduleBuild } : null,
        prodJobs: (p.prodJobs || []).map((job) => ({ ...job })),
        stats,
        telemetry: p.id === viewerSide ? { ...(p.telemetry || {}) } : {},
        history: p.id === viewerSide ? (p.history || []).slice(-30) : [],
        factoryProgress: p.id === viewerSide ? p.factoryProgress || null : undefined,
        productionQueue: (p.prodJobs || []).map((job) => ({
          action: job.action, family: job.family, status: job.status,
          progress: Number((job.progress || 0).toFixed(2)), duration: job.duration,
          finish: Number((job.finish || 0).toFixed(2)),
        })),
        factoryResearch: p.id === viewerSide ? [...(p.factoryProgress?.research || [])] : undefined,
        activeDoctrine: p.id === viewerSide ? p.factoryProgress?.activeDoctrine || null : undefined,
        guardianCount: viewerSide === p.id || canReadNodeForces ? (match.guardians?.[p.id] || 0) : null,
        emergencyShieldCooldown: p.emergencyShieldCooldown || 0,
        moduleOptions: p.id === viewerSide ? Object.entries(modules).map(([key, item]) => ({
          key, name: item.name, cost: match.moduleCost?.(p, key) ?? item.cost, build: item.build,
          canBuild: Boolean(match.canModule?.(p, key)),
        })) : undefined,
        cooldowns: { ...p.cd },
        incoming: match.incoming(p).map((trip) => ({
          size: trip.size, damage: trip.damage,
          eta: Math.max(0, Number((trip.eta - match.t).toFixed(2))),
        })),
      };
    }),
  };
}

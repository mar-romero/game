#!/usr/bin/env node
// Simulate bot-run Factory Wars seasons using the current Arena and Empire rules.
// Arena matches and Empire calculations are loaded from the same source as the game.
// Economic decision policies below are explicit simulation assumptions: live bots do
// not currently own online_empires or issue Megafactory commands.

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInThisContext } from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
globalThis.window = globalThis;
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  return match ? [match[1], match[2]] : [arg.replace(/^--/, ''), 'true'];
}));
const options = {
  days: bounded('days', 30, 1, 365),
  activeHours: bounded('active-hours', 4, 0, 24),
  matchesPerDay: bounded('matches-per-bot-day', 3, 0, 10),
  seed: bounded('seed', 20261008, 1, 2_147_483_647),
  rateMultiplier: Number(args['rate-multiplier'] || 1),
};
if (!Number.isFinite(options.rateMultiplier) || options.rateMultiplier <= 0 || options.rateMultiplier > 10) {
  throw new Error('--rate-multiplier must be greater than 0 and at most 10');
}

function bounded(key, fallback, min, max) {
  const value = Number(args[key] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`--${key} must be an integer from ${min} to ${max}`);
  return value;
}
function loadClassic(path) {
  return readFile(resolve(PUBLIC, path), 'utf8').then((source) => runInThisContext(source, { filename: path }));
}
function xorshift(seed) {
  let state = seed >>> 0 || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x1_0000_0000; };
}
function shuffled(values, random) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const BOT_DEFS = [
  ['FerroGreed','GREEDY',178], ['Blitz-9','RUSHER',92], ['Aegis','TURTLE',132],
  ['Tempo-X','TEMPO',118], ['Mimic','ADAPTIVE',128], ['Dice','RANDOM',72],
  ['Atlas','BALANCED',124], ['VaultMax','HOARDER',166], ['GhostWire','SABOTEUR',108],
  ['Vanguardia','RUSHER',116], ['Muralla','TURTLE',140], ['Oráculo','ADAPTIVE',126],
];
const CIVS = ['forge','bastion','swarm','nexus'];
const CIV_NAMES = { forge:'FORJA', bastion:'BASTIÓN', swarm:'ENJAMBRE', nexus:'NEXO' };
const RESEARCH_PRIORITIES = {
  GREEDY: ['logistics','eco_output','eco_discount','eco_speed','blueprint_refinery','recon','rocket_efficiency','archive'],
  RUSHER: ['rocket_efficiency','rocket_line','rocket_propulsion','rocket_payload','missile_fast','blueprint_armory','recon'],
  TURTLE: ['shield_efficiency','shield_charge','shield_strength','shield_capacity','shield_emergency','node_intel','blueprint_shield'],
  TEMPO: ['eco_speed','rocket_propulsion','missile_fast','eco_output','rocket_line','shield_charge','recon'],
  ADAPTIVE: ['logistics','recon','eco_output','rocket_efficiency','shield_efficiency','node_intel','blueprint_control'],
  RANDOM: null,
  BALANCED: ['logistics','recon','eco_output','rocket_efficiency','shield_efficiency','node_intel','blueprint_refinery'],
  HOARDER: ['archive','logistics','eco_storage','rocket_efficiency','shield_efficiency','recon'],
  SABOTEUR: ['sabotage_detection','sabotage_economy','sabotage_industry','sabotage_counter','sabotage_node','node_intel','logistics'],
};
const BUILDING_PRIORITIES = {
  GREEDY: ['automation','automation','generator','refinery','lab'],
  RUSHER: ['automation','generator','refinery','automation','lab'],
  TURTLE: ['automation','generator','refinery','lab','automation'],
  TEMPO: ['automation','lab','generator','refinery'],
  ADAPTIVE: ['automation','generator','refinery','lab'],
  RANDOM: null,
  BALANCED: ['automation','generator','refinery','lab'],
  HOARDER: ['automation','automation','generator','refinery'],
  SABOTEUR: ['automation','lab','generator','refinery'],
};

await loadClassic('game/domain/arena-config.js');
await loadClassic('game/domain/random.js');
await loadClassic('game/domain/arena/match-engine.js');
await loadClassic('game/domain/arena/industrial-modules.js');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const runtime = await readFile(resolve(PUBLIC, 'game/adapters/web/arena-core-runtime.js'), 'utf8');
const marker = '/* FACTORY_WARS_HEADLESS_RULES_END */';
if (!runtime.includes(marker)) throw new Error('Arena headless rules marker is missing');
runInThisContext(runtime.slice(0, runtime.indexOf(marker)) + `
  let settings = { mode: 'bots', civA: 'forge', civB: 'swarm', botA: 'GREEDY', botB: 'RUSHER' };
  function moduleStatusReason() { return 'Unavailable'; }
  function visibleModuleChoices() { return { primary: [], secondary: [] }; }
  function hasTech(player, id) { return Boolean(player?.modules?.['tech_' + id]); }
  function setRuntimeSettings(next) { settings = next; }
`, { filename: 'arena-core-runtime.js' });
for (const path of ['game/adapters/web/arena-production-system.js','game/adapters/web/arena-balance-overrides.js']) {
  const source = await readFile(resolve(PUBLIC, path), 'utf8');
  const end = source.indexOf(marker);
  if (end < 0) throw new Error(`Arena headless rules marker is missing in ${path}`);
  runInThisContext(source.slice(0, end), { filename: path });
}
const tech = await readFile(resolve(PUBLIC, 'game/adapters/web/arena-tech.js'), 'utf8');
runInThisContext(tech.slice(0, tech.indexOf(marker)) + '\n})();', { filename: 'arena-tech.js' });
for (const path of ['game/domain/empire/catalog.js','game/domain/empire/economy.js','game/domain/empire/progression.js']) await loadClassic(path);
const { advanceEmpire, applyEmpireCommand, applyMatchReward, defaultEmpire } = await import('../server/src/game/empire-service.js');
const fw = globalThis.FactoryWars;
const originalRates = fw.EmpireEconomy.productionRates;
fw.EmpireEconomy.productionRates = (state) => Object.fromEntries(
  Object.entries(originalRates(state)).map(([key, value]) => [key, value * options.rateMultiplier]),
);
const Match = fw.Match;
if (!Match) throw new Error('Could not initialize the Arena Match engine');

const random = xorshift(options.seed);
const epoch = Date.UTC(2026, 0, 1);
const states = BOT_DEFS.map(([name, strategy], index) => {
  const civilization = CIVS[index % CIVS.length];
  const state = defaultEmpire(name);
  applyEmpireCommand(state, { type:'select-civilization', civilization }, epoch);
  return {
    name, strategy, civilization, state, matches:0, wins:0, draws:0, losses:0,
    researchUnlockedTotal:0, researchUnlockedKeys:new Set(), prestigeEvents:0,
    totalRewards:{credits:0,intel:0,fragments:0,dominion:0},
    totalProduced:{credits:0,energy:0,steel:0,intel:0},
  };
});

function selectResearch(bot) {
  const keys = RESEARCH_PRIORITIES[bot.strategy]
    ? [...RESEARCH_PRIORITIES[bot.strategy]]
    : shuffled(Object.keys(fw.EmpireCatalog.RESEARCH), random);
  if (bot.strategy === 'ADAPTIVE') {
    const counts = Object.fromEntries(['economy','rockets','defense','intel'].map((branch) =>
      [branch, fw.EmpireCatalog.researchCountForBranch(bot.state.research, branch)]));
    keys.sort((a, b) => {
      const branchA = fw.EmpireCatalog.researchPathInfo(a)?.branch || 'other';
      const branchB = fw.EmpireCatalog.researchPathInfo(b)?.branch || 'other';
      return (counts[branchA] || 0) - (counts[branchB] || 0);
    });
  }
  return keys.find((key) => {
    if (bot.state.research.includes(key)) return false;
    const item = fw.EmpireCatalog.RESEARCH[key];
    return item && !fw.EmpireCatalog.researchLockReason(bot.state.research, key)
      && bot.state.intel >= fw.EmpireProgression.researchCost(bot.state, key);
  });
}

function actFactory(bot, now) {
  const state = bot.state;
  // Resolve mature contracts, accrue production, and count any event history first.
  const previous = Number(state.lastTick || now);
  const elapsed = Math.min(4 * 3600, Math.max(0, (now - previous) / 1000));
  const rates = fw.EmpireEconomy.productionRates(state);
  advanceEmpire(state, now);
  for (const resource of Object.keys(bot.totalProduced)) bot.totalProduced[resource] += (rates[resource] || 0) * elapsed;
  if (state.activeContract) return;
  const contract = fw.EmpireProgression.contractSpec(state);
  if (!fw.EmpireProgression.contractMissing(state, contract).some((item) => item.missing > 0)) {
    applyEmpireCommand(state, { type:'start-contract' }, now);
  }
  const candidates = BUILDING_PRIORITIES[bot.strategy]
    ? [...BUILDING_PRIORITIES[bot.strategy]]
    : shuffled(Object.keys(state.buildings), random);
  for (const key of candidates) {
    const cost = fw.EmpireProgression.buildingCost(state, key);
    // Preserve a small operating reserve so bots do not spend the contract inputs.
    const reserve = key === 'automation' ? 0 : 100;
    if (state.credits >= cost + reserve) {
      applyEmpireCommand(state, { type:'upgrade-building', key }, now);
      break;
    }
  }
  const research = selectResearch(bot);
  if (research) {
    applyEmpireCommand(state, { type:'buy-research', key:research }, now);
    bot.researchUnlockedTotal++;
    bot.researchUnlockedKeys.add(research);
  }
  if (fw.EmpireProgression.prestigeProgress(state) >= 100) {
    const nextCiv = bot.strategy === 'ADAPTIVE' && bot.prestigeEvents % 2 === 1
      ? CIVS[(CIVS.indexOf(bot.civilization) + 1) % CIVS.length] : bot.civilization;
    applyEmpireCommand(state, { type:'prestige', civilization:nextCiv }, now);
    bot.prestigeEvents++;
    bot.civilization = nextCiv;
  }
}

function pairBots() {
  const remaining = shuffled(states.map((_, index) => index), random);
  const pairs = [];
  function search(pool) {
    if (!pool.length) return true;
    const first = pool[0];
    for (let i = 1; i < pool.length; i++) {
      const second = pool[i];
      if (states[first].civilization === states[second].civilization) continue;
      pairs.push([first, second]);
      const next = pool.filter((id) => id !== first && id !== second);
      if (search(next)) return true;
      pairs.pop();
    }
    return false;
  }
  if (!search(remaining)) throw new Error('Could not form cross-civilization bot pairs');
  return pairs;
}

function playMatch(indexA, indexB, matchSeed) {
  const a = states[indexA], b = states[indexB];
  const settings = { mode:'bots', training:false, civA:a.civilization, civB:b.civilization, botA:a.strategy, botB:b.strategy };
  globalThis.setRuntimeSettings(settings);
  const match = new Match(settings, matchSeed >>> 0);
  for (const player of match.players) {
    player.factory = true;
    if (!player.tiles.includes('fabricator')) {
      const cell = player.tiles.findIndex((tile) => tile === null);
      if (cell >= 0) player.tiles[cell] = 'fabricator';
    }
    player.bank = Math.max(player.bank, 300);
  }
  while (!match.ended) match.step(0.5, true);
  const resultA = match.winner === 'A' ? 'win' : match.winner === 'B' ? 'loss' : 'draw';
  for (const [bot, result] of [[a,resultA],[b,resultA === 'win' ? 'loss' : resultA === 'loss' ? 'win' : 'draw']]) {
    bot.matches++;
    if (result === 'win') bot.wins++;
    else if (result === 'draw') bot.draws++;
    else bot.losses++;
    const reward = applyMatchReward(bot.state, result);
    for (const key of Object.keys(bot.totalRewards)) bot.totalRewards[key] += reward[key] || 0;
  }
}

const activeSeconds = options.activeHours * 3600;
const tickSeconds = 15 * 60;
let matchCount = 0;
for (let day = 0; day < options.days; day++) {
  const dayStart = epoch + day * 86_400_000;
  // One daily visit after downtime. advanceEmpire deliberately applies the game's
  // four-hour catch-up cap; continuous active time is then accrued in 15-minute ticks.
  for (const bot of states) {
    const loginAt = dayStart + 12 * 3600_000;
    actFactory(bot, loginAt);
    for (let elapsed = tickSeconds; elapsed <= activeSeconds; elapsed += tickSeconds) {
      actFactory(bot, loginAt + elapsed * 1000);
    }
  }
  for (let round = 0; round < options.matchesPerDay; round++) {
    for (const [a, b] of pairBots()) {
      const seed = (options.seed + day * 1_000_003 + round * 100_003 + matchCount * 10_007) >>> 0;
      playMatch(a, b, seed);
      matchCount++;
    }
  }
}
const finalAt = epoch + options.days * 86_400_000;
for (const bot of states) advanceEmpire(bot.state, finalAt);

function round(value, digits = 1) { const p = 10 ** digits; return Math.round(value * p) / p; }
const rows = states.map((bot) => {
  const state = bot.state;
  const rates = fw.EmpireEconomy.productionRates(state);
  const byBranch = Object.fromEntries(['economy','rockets','defense','intel'].map((branch) =>
    [branch, fw.EmpireCatalog.researchCountForBranch(state.research, branch)]));
  return {
    bot:bot.name, strategy:bot.strategy, civilization:bot.civilization,
    matches:bot.matches, record:`${bot.wins}-${bot.draws}-${bot.losses}`,
    credits:Math.floor(state.credits), energy:Math.floor(state.energy), steel:Math.floor(state.steel), intel:Math.floor(state.intel),
    buildings:{...state.buildings}, currentResearch:state.research.length,
    researchBought:bot.researchUnlockedTotal, researchUnique:[...bot.researchUnlockedKeys], researchByBranch:byBranch,
    totalProduced:Object.fromEntries(Object.entries(bot.totalProduced).map(([key,value])=>[key,Math.floor(value)])),
    lifetimeProduction:Math.floor(state.lifetimeProduction),
    prestiges:state.prestigeCount, prestigeThisRun:bot.prestigeEvents,
    productionPerSecond:Object.fromEntries(Object.entries(rates).map(([key,value]) => [key,round(value,3)])),
    productionMultiplier:round(options.rateMultiplier,3),
  };
});
const totals = {
  bots:rows.length, matches:matchCount,
  avgResearchBought:round(rows.reduce((sum,row)=>sum+row.researchBought,0)/rows.length,1),
  avgCurrentResearch:round(rows.reduce((sum,row)=>sum+row.currentResearch,0)/rows.length,1),
  avgPrestiges:round(rows.reduce((sum,row)=>sum+row.prestiges,0)/rows.length,1),
  avgProductionPerSecond:Object.fromEntries(['credits','energy','steel','intel'].map((resource)=>[
    resource,round(rows.reduce((sum,row)=>sum+row.productionPerSecond[resource],0)/rows.length,3),
  ])),
};
const report = {
  schemaVersion:'factory-wars-factory-simulation-1',
  generatedAt:new Date().toISOString(),
  ruleset:{arena:'loaded from current game code',empire:'loaded from current game code',
    economicBotBehavior:'simulation policy; bots do not currently issue factory commands in production'},
  assumptions:{...options,offlineCatchupHoursPerDailyVisit:4,tickMinutes:15,allBotsVisitDaily:true,
    eachBotPlaysMatchesPerDay:options.matchesPerDay,allMatchesCrossCivilization:true,
    matchRewards:'current server win/draw/loss rewards applied to simulated bot empires'},
  totals, bots:rows,
};
console.log(JSON.stringify(report,null,2));

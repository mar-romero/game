import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const DEFAULT_URL = 'http://localhost:8000/arena.html';
const DEFAULT_REPETITIONS = 20;
const DEFAULT_SEED = 20261006;
const HISTORY_DIR = join(import.meta.dirname, 'simulations');
const MANIFEST_PATH = join(HISTORY_DIR, 'manifest.json');
const BASELINE_PATH = join(import.meta.dirname, 'arena_bot_interactions.json');
const BUILDING_KEYS = ['generator', 'refinery', 'lab', 'automation'];
const DEVELOPED_FACTORY_LEVELS = { generator: 5, refinery: 5, lab: 5, automation: 5 };
const DOCTRINES = ['missile_breaker', 'missile_siege', 'missile_fast'];
const GREEDY_TUNING = { GREEDY: { growthFactor: 2.05, economyUntil: 120, attackAfter: 115 } };
const RANDOM_TUNING = { RANDOM: { actionProbability: 0.92, actionWeights: { eco: 1.3, small: 2, large: 1.5, defSmall: 1.3, capture: 1.2, sabotage: 0.65 } } };
const RUSHER_TUNING = { RUSHER: { economyAfter: 32, growthFactor: 1.55, minimumAttackEfficiency: 0.19, shieldAttackEfficiency: 0.24, smallAttackEfficiency: 0.18 } };
const COMBINED_BOT_TUNING = { ...GREEDY_TUNING, ...RANDOM_TUNING, ...RUSHER_TUNING };
const CIVILIZATION_TUNING = {
  forge: { ecoCost: 0.90, attackCost: 1.04 },
  swarm: { attackCost: 0.92 },
};
const BOT_NAMES = {
  GREEDY: 'FerroGreed',
  RUSHER: 'Blitz-9',
  TURTLE: 'Aegis',
  TEMPO: 'Tempo-X',
  ADAPTIVE: 'Mimic',
  RANDOM: 'Dice',
  BALANCED: 'Atlas',
  HOARDER: 'VaultMax',
  SABOTEUR: 'GhostWire',
};

function parseOptions(args) {
  const options = { url: DEFAULT_URL, repetitions: DEFAULT_REPETITIONS, seed: DEFAULT_SEED, changeNote: '' };
  for (let index = 0; index < args.length; index += 1) {
    const [key, inlineValue] = args[index].split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) index += 1;
    if (key === '--url') options.url = value;
    else if (key === '--repetitions') options.repetitions = Number(value);
    else if (key === '--seed') options.seed = Number(value);
    else if (key === '--change-note') options.changeNote = value;
    else throw new Error(`Unknown option: ${key}`);
  }
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) throw new Error('--repetitions must be a positive integer.');
  if (!Number.isInteger(options.seed) || options.seed < 0) throw new Error('--seed must be a non-negative integer.');
  if (!options.changeNote.trim()) throw new Error('Every archived run needs --change-note describing what changed.');
  return options;
}

function buildScenarios() {
  const baseFactory = Object.fromEntries(BUILDING_KEYS.map(key => [key, 1]));
  return [
    { id: 'baseline', name: 'Control: factory link disabled', enabled: false, buildings: baseFactory, doctrine: null },
    { id: 'factory_supply_level_5', name: 'Developed factory: +8% starting reserve', enabled: true, buildings: DEVELOPED_FACTORY_LEVELS, doctrine: null },
    ...DOCTRINES.map(doctrine => ({
      id: `factory_level_5_${doctrine}`,
      name: `Developed factory + ${doctrine}`,
      enabled: true,
      buildings: DEVELOPED_FACTORY_LEVELS,
      doctrine,
    })),
    { id: 'greedy_slow_economy', name: 'GREEDY: slower economic snowball', enabled: false, buildings: baseFactory, doctrine: null, botTuning: GREEDY_TUNING },
    { id: 'random_weighted_actions', name: 'RANDOM: weighted legal actions', enabled: false, buildings: baseFactory, doctrine: null, botTuning: RANDOM_TUNING },
    { id: 'rusher_more_economy', name: 'RUSHER: earlier economy and better attack threshold', enabled: false, buildings: baseFactory, doctrine: null, botTuning: RUSHER_TUNING },
    { id: 'bot_rebalance', name: 'Bot rebalance: GREEDY + RANDOM + RUSHER', enabled: false, buildings: baseFactory, doctrine: null, botTuning: COMBINED_BOT_TUNING },
    { id: 'civilization_cost_rebalance', name: 'Civilizations: FORGE + SWARM cost adjustment', enabled: false, buildings: baseFactory, doctrine: null, civilizationOverrides: CIVILIZATION_TUNING },
    { id: 'bot_civ_candidate_ranked_start', name: 'Bot + civilization candidate with normal Ranked start', enabled: false, buildings: baseFactory, doctrine: null, botTuning: COMBINED_BOT_TUNING, civilizationOverrides: CIVILIZATION_TUNING },
    { id: 'combined_balance_candidate', name: 'Factory link + bot + civilization candidate', enabled: true, buildings: DEVELOPED_FACTORY_LEVELS, doctrine: null, botTuning: COMBINED_BOT_TUNING, civilizationOverrides: CIVILIZATION_TUNING },
  ];
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

function findEdge() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const executable = candidates.find(path => existsSync(path));
  if (!executable) throw new Error('Microsoft Edge or Google Chrome was not found. Set EDGE_PATH to its executable.');
  return executable;
}

async function waitForArenaTarget(port, browser) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (browser.exitCode !== null) throw new Error(`Browser exited with code ${browser.exitCode}.`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) });
      const targets = await response.json();
      const target = targets.find(item => item.url.includes('/arena.html'));
      if (target) return target;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Timed out waiting for the Arena tab. Is serve.py running?');
}

async function waitForArenaEngine(devTools) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const engine = JSON.parse(await devTools.evaluate("JSON.stringify({match:typeof Match,civilizations:typeof CIVILIZATIONS==='undefined'?null:Object.keys(CIVILIZATIONS),bots:typeof BOTS==='undefined'?null:Object.keys(BOTS)})"));
      if (engine.match === 'function' && engine.civilizations?.length && engine.bots?.length) return engine;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Arena loaded, but its Match engine did not become available.');
}

function createDevToolsClient(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const resolve = pending.get(message.id);
    if (!resolve) return;
    pending.delete(message.id);
    resolve(message);
  });

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    async evaluate(expression) {
      await ready;
      const id = nextId++;
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Arena evaluation timed out.'));
        }, 180000);
        pending.set(id, message => {
          clearTimeout(timer);
          resolve(message);
        });
        socket.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        }));
      });
      if (response.error || response.result.exceptionDetails) {
        throw new Error(JSON.stringify(response.error || response.result.exceptionDetails));
      }
      return response.result.result.value;
    },
    close() {
      socket.close();
    },
  };
}

function buildChunkExpression({ civA, civB, botA, opponents, repetitions, seed, chunkIndex, scenario, baseCivilizations }) {
  const input = JSON.stringify({ civA, civB, botA, opponents, repetitions, seed, chunkIndex, scenario, baseCivilizations });
  return `(() => {
    const input = ${input};
    for (const [civ, values] of Object.entries(input.baseCivilizations)) Object.assign(CIVILIZATIONS[civ], values);
    for (const [civ, values] of Object.entries(input.scenario.civilizationOverrides || {})) Object.assign(CIVILIZATIONS[civ], values);
    const metricNames = ['hp', 'level', 'damageDealt', 'damageTaken', 'attacks', 'defenses', 'sabotages', 'captures', 'territorySeconds', 'upgrades', 'modulesBuilt', 'specializations', 'simulationFactoryStartingBank', 'simulationFactoryReservePct'];
    const rows = [];
    for (let opponentIndex = 0; opponentIndex < input.opponents.length; opponentIndex += 1) {
      const botB = input.opponents[opponentIndex];
      const row = { scenarioId: input.scenario.id, civilizationA: input.civA, civilizationB: input.civB, botA: input.botA, botB, matches: 0, winsA: 0, winsB: 0, draws: 0, durationTotal: 0, endReasons: {}, profiles: { A: {}, B: {} } };
      for (const side of ['A', 'B']) {
        row.profiles[side] = Object.fromEntries(metricNames.map(name => [name, 0]));
      }
      for (let repetition = 0; repetition < input.repetitions; repetition += 1) {
        for (let swap = 0; swap < 2; swap += 1) {
          const firstIsA = swap === 0;
          const settings = {
            mode: 'bots',
            training: false,
            civA: firstIsA ? input.civA : input.civB,
            civB: firstIsA ? input.civB : input.civA,
            botA: firstIsA ? input.botA : botB,
            botB: firstIsA ? botB : input.botA,
            enableSimulationFactoryLink: input.scenario.enabled,
            simulationFactoryProfiles: {
              A: { buildings: input.scenario.buildings, doctrine: input.scenario.doctrine },
              B: { buildings: input.scenario.buildings, doctrine: input.scenario.doctrine },
            },
            simulationBotTuning: input.scenario.botTuning || {},
          };
          const matchSeed = (input.seed + input.chunkIndex * 1000003 + opponentIndex * 1009 + repetition * 2 + swap) >>> 0;
          const sim = new Match(settings, matchSeed);
          while (!sim.ended) sim.step(0.5, true);

          const profileA = sim.players.find(player => player.civ === input.civA && player.bot === input.botA);
          const profileB = sim.players.find(player => player.civ === input.civB && player.bot === botB);
          const winnerProfile = sim.winner === null ? null : sim.players[sim.winner === 'A' ? 0 : 1];
          if (!winnerProfile) row.draws += 1;
          else if (winnerProfile === profileA) row.winsA += 1;
          else row.winsB += 1;

          row.matches += 1;
          row.durationTotal += sim.t;
          row.endReasons[sim.endReason] = (row.endReasons[sim.endReason] || 0) + 1;
          for (const [key, player] of [['A', profileA], ['B', profileB]]) {
            const totals = row.profiles[key];
            totals.hp += player.hp;
            totals.level += player.level;
            totals.damageDealt += player.stats.damageDealt;
            totals.damageTaken += player.stats.damageTaken;
            totals.attacks += player.stats.attacks;
            totals.defenses += player.stats.defenses;
            totals.sabotages += player.stats.sabotages;
            totals.captures += player.stats.captures;
            totals.territorySeconds += player.stats.territorySeconds;
            totals.upgrades += player.stats.upgrades;
            totals.modulesBuilt += player.stats.modulesBuilt || 0;
            totals.specializations += player.stats.specializations;
            totals.simulationFactoryStartingBank += player.simulationFactoryStartingBank;
            totals.simulationFactoryReservePct += player.simulationFactoryReservePct * 100;
          }
        }
      }
      row.winRateA = Number((row.winsA / row.matches * 100).toFixed(2));
      row.winRateB = Number((row.winsB / row.matches * 100).toFixed(2));
      row.drawRate = Number((row.draws / row.matches * 100).toFixed(2));
      row.averageDurationSeconds = Number((row.durationTotal / row.matches).toFixed(2));
      delete row.durationTotal;
      for (const profile of Object.values(row.profiles)) {
        for (const name of metricNames) profile[name] = Number((profile[name] / row.matches).toFixed(2));
      }
      rows.push(row);
    }
    return JSON.stringify(rows);
  })()`;
}

function summarizeProfiles(matchups, civilizations, bots) {
  const summaries = new Map();
  for (const civ of civilizations) {
    for (const bot of bots) {
      summaries.set(`${civ}:${bot}`, {
        civilization: civ,
        bot,
        botName: BOT_NAMES[bot],
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        durationTotal: 0,
        damageDealtTotal: 0,
        damageTakenTotal: 0,
        attacksTotal: 0,
        defensesTotal: 0,
        sabotagesTotal: 0,
        capturesTotal: 0,
        territorySecondsTotal: 0,
        modulesBuiltTotal: 0,
        startingBankTotal: 0,
        factoryReservePctTotal: 0,
      });
    }
  }

  for (const matchup of matchups) {
    for (const [side, civ, bot, wins, losses] of [
      ['A', matchup.civilizationA, matchup.botA, matchup.winsA, matchup.winsB],
      ['B', matchup.civilizationB, matchup.botB, matchup.winsB, matchup.winsA],
    ]) {
      const profile = summaries.get(`${civ}:${bot}`);
      const metrics = matchup.profiles[side];
      profile.matches += matchup.matches;
      profile.wins += wins;
      profile.losses += losses;
      profile.draws += matchup.draws;
      profile.durationTotal += matchup.averageDurationSeconds * matchup.matches;
      profile.damageDealtTotal += metrics.damageDealt * matchup.matches;
      profile.damageTakenTotal += metrics.damageTaken * matchup.matches;
      profile.attacksTotal += metrics.attacks * matchup.matches;
      profile.defensesTotal += metrics.defenses * matchup.matches;
      profile.sabotagesTotal += metrics.sabotages * matchup.matches;
      profile.capturesTotal += metrics.captures * matchup.matches;
      profile.territorySecondsTotal += metrics.territorySeconds * matchup.matches;
      profile.modulesBuiltTotal += metrics.modulesBuilt * matchup.matches;
      profile.startingBankTotal += metrics.simulationFactoryStartingBank * matchup.matches;
      profile.factoryReservePctTotal += metrics.simulationFactoryReservePct * matchup.matches;
    }
  }

  return [...summaries.values()].map(profile => {
    const matches = Math.max(1, profile.matches);
    return {
      ...profile,
      winRatePct: Number((profile.wins / matches * 100).toFixed(2)),
      drawRatePct: Number((profile.draws / matches * 100).toFixed(2)),
      averageDurationSeconds: Number((profile.durationTotal / matches).toFixed(2)),
      averageDamageDealt: Number((profile.damageDealtTotal / matches).toFixed(2)),
      averageDamageTaken: Number((profile.damageTakenTotal / matches).toFixed(2)),
      averageAttacks: Number((profile.attacksTotal / matches).toFixed(2)),
      averageDefenses: Number((profile.defensesTotal / matches).toFixed(2)),
      averageSabotages: Number((profile.sabotagesTotal / matches).toFixed(2)),
      averageCaptures: Number((profile.capturesTotal / matches).toFixed(2)),
      averageTerritorySeconds: Number((profile.territorySecondsTotal / matches).toFixed(2)),
      averageModulesBuilt: Number((profile.modulesBuiltTotal / matches).toFixed(2)),
      averageStartingBank: Number((profile.startingBankTotal / matches).toFixed(2)),
      averageFactoryReservePct: Number((profile.factoryReservePctTotal / matches).toFixed(2)),
      durationTotal: undefined,
      damageDealtTotal: undefined,
      damageTakenTotal: undefined,
      attacksTotal: undefined,
      defensesTotal: undefined,
      sabotagesTotal: undefined,
      capturesTotal: undefined,
      territorySecondsTotal: undefined,
      modulesBuiltTotal: undefined,
      startingBankTotal: undefined,
      factoryReservePctTotal: undefined,
    };
  });
}

function buildScenarioComparisons(scenarioResults) {
  const baseline = scenarioResults.find(result => result.scenario.id === 'baseline');
  const baselineProfiles = new Map(baseline.botCivilizationSummary.map(profile => [`${profile.civilization}:${profile.bot}`, profile]));
  return Object.fromEntries(scenarioResults.filter(result => result.scenario.id !== 'baseline').map(result => [
    result.scenario.id,
    result.botCivilizationSummary.map(profile => {
      const base = baselineProfiles.get(`${profile.civilization}:${profile.bot}`);
      return {
        civilization: profile.civilization,
        bot: profile.bot,
        baselineWinRatePct: base.winRatePct,
        scenarioWinRatePct: profile.winRatePct,
        deltaWinRatePct: Number((profile.winRatePct - base.winRatePct).toFixed(2)),
        baselineStartingBank: base.averageStartingBank,
        scenarioStartingBank: profile.averageStartingBank,
        averageFactoryReservePct: profile.averageFactoryReservePct,
      };
    }),
  ]));
}

function loadManifest() {
  mkdirSync(HISTORY_DIR, { recursive: true });
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
    : { schemaVersion: 1, runs: [] };
  const baselineFile = 'arena_bot_interactions_v1_baseline.json';
  if (!manifest.runs.some(run => run.version === 1)) {
    if (existsSync(BASELINE_PATH) && !existsSync(join(HISTORY_DIR, baselineFile))) {
      const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
      baseline.simulation_comment = {
        version: 1,
        title: 'Linea base: bots y civilizaciones sin bonus persistente de Megafabrica',
        changes: ['Medicion inicial con el motor real de Arena; la Megafabrica persistente no se aplica al combate.'],
      };
      baseline.meta.simulationVersion = 1;
      writeFileSync(join(HISTORY_DIR, baselineFile), JSON.stringify(baseline, null, 2), 'utf8');
    }
    if (existsSync(join(HISTORY_DIR, baselineFile))) {
      manifest.runs.push({
        version: 1,
        file: baselineFile,
        simulationComment: 'Linea base sin vinculacion persistente de Megafabrica a PvP.',
        simulatedMatches: manifest.runs.length ? undefined : 9720,
      });
    }
  }
  return manifest;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const response = await fetch(options.url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Arena returned HTTP ${response.status}. Start the game server first.`);

  const edgePath = findEdge();
  const profileDir = mkdtempSync(join(tmpdir(), 'factory-wars-arena-'));
  const port = await reservePort();
  const browser = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--remote-allow-origins=*',
    `--user-data-dir=${profileDir}`,
    options.url,
  ], { stdio: 'ignore', windowsHide: true });

  let devTools;
  try {
    const target = await waitForArenaTarget(port, browser);
    devTools = createDevToolsClient(target.webSocketDebuggerUrl);
    const engine = await waitForArenaEngine(devTools);

    const civilizations = engine.civilizations;
    const bots = engine.bots;
    const baseCivilizations = JSON.parse(await devTools.evaluate('JSON.stringify(CIVILIZATIONS)'));
    const manifest = loadManifest();
    const version = Math.max(0, ...manifest.runs.map(run => run.version)) + 1;
    const scenarios = buildScenarios();
    const matchupCount = civilizations.length * (civilizations.length - 1) / 2 * bots.length ** 2;
    const scenarioResults = [];
    const totalChunks = scenarios.length * civilizations.length * (civilizations.length - 1) / 2 * bots.length;
    let completedChunks = 0;

    for (const scenario of scenarios) {
      const matchups = [];
      let chunkIndex = 0;
      for (let civIndexA = 0; civIndexA < civilizations.length; civIndexA += 1) {
        for (let civIndexB = civIndexA + 1; civIndexB < civilizations.length; civIndexB += 1) {
          const civA = civilizations[civIndexA];
          const civB = civilizations[civIndexB];
          for (const botA of bots) {
            const expression = buildChunkExpression({
              civA,
              civB,
              botA,
              opponents: bots,
              repetitions: options.repetitions,
              seed: options.seed,
              chunkIndex,
              scenario,
              baseCivilizations,
            });
            matchups.push(...JSON.parse(await devTools.evaluate(expression)));
            chunkIndex += 1;
            completedChunks += 1;
            process.stdout.write(`Scenario ${scenario.id}: ${completedChunks}/${totalChunks} batches complete.\r`);
          }
        }
      }
      scenarioResults.push({
        scenario: {
          id: scenario.id,
          name: scenario.name,
          factoryLinkEnabled: scenario.enabled,
          factoryBuildingLevels: scenario.buildings,
          activeDoctrine: scenario.doctrine,
          botTuning: scenario.botTuning || {},
          civilizationOverrides: scenario.civilizationOverrides || {},
          startingReservePct: scenario.enabled ? Number((Math.min(.12, Math.max(0, BUILDING_KEYS.reduce((total, key) => total + scenario.buildings[key], 0) - BUILDING_KEYS.length) * .005) * 100).toFixed(2)) : 0,
        },
        uniqueMatchups: matchupCount,
        simulatedMatches: matchupCount * options.repetitions * 2,
        matchups,
        botCivilizationSummary: summarizeProfiles(matchups, civilizations, bots),
      });
    }

    const sourceChanges = [
      { file: 'public/arena.html', area: 'Match.prototype.createPlayer', detail: 'Opt-in simulations convert each building level above 1 into +0.5% starting reserve, capped at +12%; four level-5 buildings yield +8% (300 to 324 resources).' },
      { file: 'public/arena.html', area: 'v152Doctrine', detail: 'Simulation profiles can equip Breaker, Siege, or Fast doctrines on either bot so missile research effects use the actual Arena combat code.' },
      { file: 'public/arena.html', area: 'Match.prototype.botDecision', detail: 'Add opt-in test knobs for GREEDY economy/attack timing, weighted RANDOM legal actions, and RUSHER economy/attack thresholds; no change when simulations omit these settings.' },
      { file: 'analytics/arena_bot_interactions.js', area: 'scenario matrix and archive', detail: 'Add paired tuning arms for bot behavior and FORJA/ENJAMBRE PvP costs, resetting civilization rules before every matchup; preserve every run as a versioned JSON snapshot.' },
    ];
    const now = new Date().toISOString();
    const snapshotName = `arena_bot_interactions_v${version}.json`;
    const snapshotPath = join(HISTORY_DIR, snapshotName);
    const totalMatches = scenarioResults.reduce((sum, result) => sum + result.simulatedMatches, 0);
    const payload = {
      simulation_comment: {
        version,
        title: `V${version}: ${options.changeNote}`,
        changes: sourceChanges,
        comparison: 'All scenarios use the same bot/civilization matchups and seed schedule; baseline results are included in this file.',
        liveRankedChanged: false,
      },
      meta: {
        simulationVersion: version,
        generatedAt: now,
        seed: options.seed,
        engine: 'Interactive Arena Match engine loaded from public/arena.html',
        method: 'Each cross-civilization bot pair is simulated with both A/B side assignments and identical seed schedules across scenarios.',
        civilizations,
        bots: bots.map(bot => ({ id: bot, name: BOT_NAMES[bot] || bot })),
        uniqueMatchupsPerScenario: matchupCount,
        repetitionsPerSideAssignment: options.repetitions,
        sideAssignmentsPerMatchup: 2,
        scenarioCount: scenarioResults.length,
        simulatedMatches: totalMatches,
        reserveFormula: '+0.5% starting resources for every persistent building level above the four starting levels, capped at +12%.',
        candidateBotTuning: { GREEDY: 'Growth factor 2.05; stop factory expansion at 120 s; attack after 115 s.', RANDOM: 'Action chance 92%; legal action weights favor economy, rockets, defense, and capture over sabotage.', RUSHER: 'Economy after 32 s, growth factor 1.55, and lower attack-efficiency thresholds.' },
        candidateCivilizationTuning: { FORGE: 'Economic upgrade cost 0.93 to 0.90; attack cost 1.08 to 1.04.', ENJAMBRE: 'Attack cost 0.88 to 0.92.' },
        persistentFactoryBonusIsSimulationOnly: true,
        factoryBonusNote: 'Normal Ranked gameplay is unchanged. The Arena hook applies only when enableSimulationFactoryLink is explicitly set by this runner.',
      },
      scenarios: scenarioResults,
      comparisonAgainstBaseline: buildScenarioComparisons(scenarioResults),
    };

    writeFileSync(snapshotPath, JSON.stringify(payload, null, 2), 'utf8');
    manifest.runs.push({
      version,
      file: snapshotName,
      generatedAt: now,
      simulationComment: payload.simulation_comment.title,
      simulatedMatches: totalMatches,
      scenarios: scenarios.map(scenario => scenario.id),
      changeNote: options.changeNote,
    });
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    process.stdout.write(`\nSaved V${version}: ${totalMatches} actual Arena matches across ${matchupCount} matchups per scenario to ${snapshotPath}.\n`);
  } finally {
    devTools?.close();
    if (browser.exitCode === null) {
      if (process.platform === 'win32') {
        try {
          execFileSync('taskkill.exe', ['/PID', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
        } catch {
          browser.kill();
        }
      } else {
        browser.kill();
      }
    }
    if (browser.exitCode === null) await new Promise(resolve => browser.once('exit', resolve));
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    } catch (error) {
      console.warn(`Could not remove temporary browser profile ${profileDir}: ${error.message}`);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
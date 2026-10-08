const validCivs = new Set(['forge','bastion','swarm','nexus']);
const buildingKeys = new Set(['generator','refinery','lab','automation']);

export function defaultEmpire(nickname = 'Factory-Local') {
  return {
    version: 'online-1', nickname, currentCiv: null, civLocked: false,
    credits: 400, energy: 220, steel: 160, intel: 0, fragments: 0,
    dominion: 0, dominionTier: 1, warWins: 0,
    buildings: { generator: 1, refinery: 1, lab: 1, automation: 1 },
    research: [], activeDoctrine: null, contractsCompleted: 0,
    lifetimeProduction: 0, cycleProduction: 0, bestIndustrialScore: 0,
    prestigeCount: 0, legacyNodes: 0,
    civLegacies: { forge: 0, bastion: 0, swarm: 0, nexus: 0 },
    loyalty: { forge: 0, bastion: 0, swarm: 0, nexus: 0 },
    factionLocal: {
      forge: { pvp: 0, industrial: 0, operations: 0 },
      bastion: { pvp: 0, industrial: 0, operations: 0 },
      swarm: { pvp: 0, industrial: 0, operations: 0 },
      nexus: { pvp: 0, industrial: 0, operations: 0 },
    },
    activeContract: null, lastTick: Date.now(),
  };
}

export function empireIndustrialScore(state) {
  const fw = rules();
  return fw.EmpireProgression.industrialScore(state);
}

function rules() {
  const fw = globalThis.FactoryWars;
  if (!fw?.EmpireProgression) throw new Error('Empire rules are not initialized');
  return fw;
}

export function advanceEmpire(state, now = Date.now()) {
  const fw = rules(), economy = fw.EmpireEconomy;
  const previous = Number(state.lastTick || now);
  const elapsed = Math.min(4 * 3600, Math.max(0, (now - previous) / 1000));
  state.lastTick = now;
  const events = [];
  if (elapsed > 0) {
    const rates = economy.productionRates(state);
    state.telemetryWindowStartedAt ??= previous;
    state.telemetryWindowSeconds = Number(state.telemetryWindowSeconds || 0) + elapsed;
    state.telemetryPendingProduction ||= {};
    for (const [resource, rate] of Object.entries(rates)) {
      const produced = rate * elapsed;
      state[resource] = Number(state[resource] || 0) + produced;
      state.telemetryPendingProduction[resource] = Number(state.telemetryPendingProduction[resource] || 0) + produced;
    }
    const counted = (rates.energy + rates.steel + rates.credits) * elapsed;
    state.lifetimeProduction = Number(state.lifetimeProduction || 0) + counted;
    state.cycleProduction = Number(state.cycleProduction || 0) + counted;
    if (state.telemetryWindowSeconds >= 60) {
      events.push({
        eventType: 'tick', resource: null, amount: null,
        payload: {
          windowStartedAt: state.telemetryWindowStartedAt,
          windowEndAt: now,
          seconds: Number(state.telemetryWindowSeconds.toFixed(2)),
          produced: state.telemetryPendingProduction,
          rates: Object.fromEntries(Object.entries(state.telemetryPendingProduction).map(([key, value]) => [key, Number((value / state.telemetryWindowSeconds).toFixed(5))])),
        },
      });
      state.telemetryWindowStartedAt = now;
      state.telemetryWindowSeconds = 0;
      state.telemetryPendingProduction = {};
    }
  }
  const contract = state.activeContract;
  if (contract && Number(contract.endsAt) <= now) {
    const intel = contract.intelReward || 8;
    state.credits += contract.reward;
    state.intel += intel;
    state.contractsCompleted++;
    state.activeContract = null;
    events.push({ eventType: 'contract_complete', resource: null, amount: null, payload: { credits: contract.reward, intel, operations: 25, endsAt: contract.endsAt } });
  }
  return events;
}

export function applyMatchReward(state, result) {
  const rewards = {
    win: { credits: 180, intel: 12, fragments: 2, faction: 30, dominion: 36 },
    draw: { credits: 100, intel: 6, fragments: 1, faction: 12, dominion: 14 },
    loss: { credits: 70, intel: 4, fragments: 0, faction: 8, dominion: 6 },
  };
  const reward = rewards[result];
  if (!reward) throw new Error(`Invalid match result: ${result}`);
  const civ = state.currentCiv;
  const civBoost = ({ forge: 1.12, bastion: 1.08, swarm: 1.10, nexus: 1.14 })[civ] || 1;
  reward.dominion = Math.round(reward.dominion * civBoost);
  const finiteNonnegative = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };
  state.credits = finiteNonnegative(state.credits) + reward.credits;
  state.intel = finiteNonnegative(state.intel) + reward.intel;
  state.fragments = finiteNonnegative(state.fragments) + reward.fragments;
  state.dominion = finiteNonnegative(state.dominion) + reward.dominion;
  state.warWins = finiteNonnegative(state.warWins) + (result === 'win' ? 1 : 0);
  state.dominionTier = Math.max(1, Math.floor(finiteNonnegative(state.dominionTier) || 1));
  const threshold = 120 + (state.dominionTier - 1) * 80;
  if (state.dominion >= threshold) {
    const levels = Math.floor(state.dominion / threshold);
    state.dominionTier = Number(state.dominionTier || 1) + levels;
    state.dominion %= threshold;
  }
  if (civ && ['forge', 'bastion', 'swarm', 'nexus'].includes(civ)) {
    if (!state.factionLocal || typeof state.factionLocal !== 'object' || Array.isArray(state.factionLocal)) state.factionLocal = {};
    if (!state.factionLocal[civ] || typeof state.factionLocal[civ] !== 'object' || Array.isArray(state.factionLocal[civ])) {
      state.factionLocal[civ] = { pvp: 0, industrial: 0, operations: 0 };
    }
    state.factionLocal[civ].pvp = finiteNonnegative(state.factionLocal[civ].pvp) + reward.faction;
  }
  return { ...reward, civilization: civ || null, result };
}

function error(message, status = 400) { return Object.assign(new Error(message), { status }); }

export function applyEmpireCommand(state, command, now = Date.now()) {
  const fw = rules(), progression = fw.EmpireProgression, catalog = fw.EmpireCatalog;
  const type = command?.type;
  const events = [];
  if (type === 'select-civilization') {
    if (!validCivs.has(command.civilization)) throw error('Civilization is not valid');
    if (state.civLocked && state.currentCiv !== command.civilization) throw error('Civilization is locked until prestige');
    state.currentCiv = command.civilization;
    state.civLocked = true;
    events.push({ eventType: 'building_upgrade', resource: null, amount: null, payload: { action: type, civilization: command.civilization } });
  } else if (type === 'upgrade-building') {
    const key = command.key;
    if (!state.currentCiv) throw error('Choose a civilization first', 409);
    if (!buildingKeys.has(key)) throw error('Building is not valid');
    const cost = progression.buildingCost(state, key);
    if (state.credits < cost) throw error('Not enough credits', 409);
    state.credits -= cost;
    state.buildings[key]++;
    events.push({ eventType: 'building_upgrade', resource: 'credits', amount: -cost, payload: { building: key, level: state.buildings[key], cost } });
  } else if (type === 'buy-research') {
    const key = command.key;
    const item = catalog.RESEARCH[key];
    if (!item) throw error('Research is not valid');
    if (state.research.includes(key)) throw error('Research is already unlocked', 409);
    const locked = catalog.researchLockReason(state.research, key);
    if (locked) throw error(locked, 409);
    const cost = progression.researchCost(state, key);
    if (state.intel < cost) throw error('Not enough intel', 409);
    state.intel -= cost;
    state.research.push(key);
    if (progression.isDoctrine(key) && !state.activeDoctrine) state.activeDoctrine = key;
    events.push({ eventType: 'research', resource: 'intel', amount: -cost, payload: { key, cost } });
  } else if (type === 'equip-doctrine') {
    if (!progression.isDoctrine(command.key) || !state.research.includes(command.key)) throw error('Doctrine is not unlocked', 409);
    state.activeDoctrine = command.key;
    events.push({ eventType: 'research', resource: null, amount: null, payload: { action: type, doctrine: command.key } });
  } else if (type === 'start-contract') {
    if (!state.currentCiv) throw error('Choose a civilization first', 409);
    if (state.activeContract) throw error('A contract is already active', 409);
    const contract = progression.contractSpec(state);
    const missing = progression.contractMissing(state, contract).filter((item) => item.missing > 0);
    if (missing.length) throw error('Contract resources are not ready', 409);
    for (const [resource, need] of Object.entries(contract.inputs)) state[resource] -= need;
    state.activeContract = { ...contract, endsAt: now + contract.seconds * 1000, id: `contract-${now}` };
    events.push({ eventType: 'contract_start', resource: null, amount: null, payload: { inputs: contract.inputs, reward: contract.reward, intelReward: contract.intelReward, endsAt: state.activeContract.endsAt } });
  } else if (type === 'prestige') {
    const nextCiv = command.civilization;
    if (!validCivs.has(nextCiv)) throw error('Choose the next civilization');
    if (!state.currentCiv || progression.prestigeProgress(state) < 100) throw error('Prestige requirements are not complete', 409);
    const previousCiv = state.currentCiv;
    state.prestigeCount++;
    state.legacyNodes++;
    state.civLegacies[previousCiv] = (state.civLegacies[previousCiv] || 0) + 1;
    if (nextCiv === previousCiv) state.loyalty[previousCiv] = (state.loyalty[previousCiv] || 0) + 1;
    else state.loyalty[nextCiv] = (state.loyalty[nextCiv] || 0) + 0.5;
    state.credits = 400; state.energy = 220; state.steel = 160;
    state.intel = Math.floor(state.intel * 0.35); state.fragments = Math.floor(state.fragments * 0.5);
    state.buildings = { generator: 1, refinery: 1, lab: 1, automation: 1 };
    state.research = state.research.includes('archive') ? ['archive'] : [];
    state.activeDoctrine = null; state.contractsCompleted = 0;
    state.cycleProduction = 0; state.activeContract = null;
    state.currentCiv = nextCiv; state.civLocked = true;
    events.push({ eventType: 'prestige', resource: null, amount: null, payload: { previousCiv, nextCiv, prestigeCount: state.prestigeCount } });
  } else {
    throw error('Command is not supported');
  }
  return events;
}

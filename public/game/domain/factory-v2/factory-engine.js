import { SCHEMA_VERSION, OFFLINE_LIMIT_MS, RESOURCES, BUILDINGS, MAX_BUILDING_LEVEL, PROJECTS, CONTRACTS, LEGACY_CONTRACT_IDS, PRODUCTION_MODES, MODE_COOLDOWN_MS, PRESTIGE_COST_FACTOR, PRESTIGE_ADVANTAGE_CAP, PRESTIGE_ADVANTAGE_PACE, CONTRACT_TIME_MIN_SECONDS, CONTRACT_TIME_EXPERIENCE_FACTOR, PRESTIGE_ROUTES, SPECIAL_CONTRACTS, MAX_PRESTIGE_COUNT, BASE_ARSENAL, RESEARCH } from './catalog.js';
import { validateState } from './save-format.js';

const clone = value => JSON.parse(JSON.stringify(value));
const emptyResources = () => Object.fromEntries(Object.keys(RESOURCES).map(key => [key, 0]));
const RESOURCE_LIMIT = 1e15;
const safeCredit = (value, amount) => Math.min(RESOURCE_LIMIT, value + amount);
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function validNow(now) { requireValue(Number.isSafeInteger(now) && now >= 0 && now <= 1e15, 'Reloj inválido.'); }
export function costMultiplier(state) { return state.cycle.route === 'legacy' ? 1 : PRESTIGE_COST_FACTOR ** state.permanent.prestigeCount; }
export function efficiencyMultiplier(state) {
  if (state.cycle.route === 'legacy') return 1;
  const p = state.permanent.prestigeCount;
  const cumulativeAdvantage = 1 + PRESTIGE_ADVANTAGE_CAP * (1 - Math.exp(-p / PRESTIGE_ADVANTAGE_PACE));
  return costMultiplier(state) * cumulativeAdvantage;
}
export function scaleCost(state, cost) {
  return Object.fromEntries(Object.entries(cost).map(([key, amount]) => [key, Math.ceil(amount * costMultiplier(state))]));
}
export function projectCost(state, id) {
  requireValue(Object.hasOwn(PROJECTS, id), 'Proyecto desconocido.');
  return scaleCost(state, PROJECTS[id].cost);
}
export function contractCost(state, id) {
  requireValue(Object.hasOwn(CONTRACTS, id), 'Contrato desconocido.');
  return scaleCost(state, CONTRACTS[id].cost);
}
export function contractReward(state, id) {
  requireValue(Object.hasOwn(CONTRACTS, id), 'Contrato desconocido.');
  const routeBonus = state.cycle.route === 'logistics' ? 1.15 : 1;
  return Object.fromEntries(Object.entries(CONTRACTS[id].reward).map(([key, amount]) => [key, Math.ceil(amount * efficiencyMultiplier(state) * routeBonus)]));
}
export function contractDuration(state, id) {
  requireValue(Object.hasOwn(CONTRACTS, id), 'Contrato desconocido.');
  if (state.cycle.route === 'legacy') return CONTRACTS[id].duration;
  // Experience shortens jobs with diminishing returns; logistics specializes in contracts.
  const routeSpeed = state.cycle.route === 'logistics' ? 0.8 : 1;
  return Math.max(CONTRACT_TIME_MIN_SECONDS,
    Math.ceil(CONTRACTS[id].duration * routeSpeed / (1 + CONTRACT_TIME_EXPERIENCE_FACTOR * state.permanent.prestigeCount)));
}
function freshCycle() {
  return { resources: { credits: 350, energy: 100, steel: 100, intel: 20 },
    buildings: Object.fromEntries(Object.keys(BUILDINGS).map(key => [key, 1])),
    upgrades: 0, contractsCompleted: 0, specialContractsCompleted: 0, contract: null,
    contractTypes: [], seriesCompleted: false, project: null, route: null,
    mode: 'balanced', modeChangedAt: null };
}
export function createFactory(now) {
  validNow(now);
  return { schemaVersion: SCHEMA_VERSION, savedAt: now, permanent: { prestigeCount: 0, research: [] }, cycle: freshCycle() };
}
export function projectProgress(state) {
  const active = state.cycle.project;
  if (!active) return 0;
  const cost = projectCost(state, active.id);
  const total = Object.values(cost).reduce((a, b) => a + b, 0);
  return Object.values(active.delivered).reduce((a, b) => a + b, 0) / total;
}
export function projectMultiplier(state) {
  const active = state.cycle.project;
  if (!active) return 1;
  if (state.cycle.route === 'legacy') return active.completed ? PROJECTS[active.id].multiplier : 1;
  const full = PROJECTS[active.id].multiplier - 1;
  const fraction = projectProgress(state);
  if (fraction >= 1) return 1 + full;
  if (fraction >= 0.6) return 1 + full * 0.5;
  if (fraction >= 0.25) return 1 + full * 0.2;
  return 1;
}
export function productionRates(state) {
  const rates = emptyResources();
  for (const [id, building] of Object.entries(BUILDINGS)) {
    const level = state.cycle.buildings[id];
    rates[building.resource] += building.rate * level;
  }
  const industrialFactor = efficiencyMultiplier(state);
  for (const key of Object.keys(rates)) {
    rates[key] *= industrialFactor * (PRODUCTION_MODES[state.cycle.mode].factors[key] ?? 1);
  }
  if (state.cycle.project) rates[PROJECTS[state.cycle.project.id].rewardResource] *= projectMultiplier(state);
  // Each route has a short-lived economic identity without granting PvP power.
  if (state.cycle.route === 'scientific') rates.intel *= 1.3;
  if (state.cycle.route === 'priority') { rates.steel *= 1.25; rates.energy *= 1.15; }
  return rates;
}
export function buildingCost(state, id) {
  requireValue(Object.hasOwn(BUILDINGS, id), 'Edificio desconocido.');
  return scaleCost(state, { credits: Math.ceil(BUILDINGS[id].baseCost * 1.4 ** (state.cycle.buildings[id] - 1)) });
}
export function missingResources(state, cost) {
  return Object.fromEntries(Object.entries(cost).map(([key, amount]) => [key, Math.max(0, amount - state.cycle.resources[key])]).filter(([, amount]) => amount > 0));
}
function pay(state, cost) {
  requireValue(Object.keys(missingResources(state, cost)).length === 0, 'Faltan recursos para esta acción.');
  for (const [key, amount] of Object.entries(cost)) state.cycle.resources[key] -= amount;
}
export function advanceFactory(state, now) {
  validateState(state); validNow(now);
  requireValue(now >= state.savedAt, 'El reloj retrocedió. Esperá a que alcance la fecha del guardado.');
  const next = clone(state);
  const seconds = Math.min(now - state.savedAt, OFFLINE_LIMIT_MS) / 1000;
  for (const [key, rate] of Object.entries(productionRates(state))) next.cycle.resources[key] = safeCredit(next.cycle.resources[key], rate * seconds);
  next.savedAt = now;
  if (next.cycle.contract && now >= next.cycle.contract.endsAt) {
    const id = next.cycle.contract.id;
    for (const [key, amount] of Object.entries(contractReward(next, id))) next.cycle.resources[key] = safeCredit(next.cycle.resources[key], amount);
    next.cycle.contract = null;
    next.cycle.contractsCompleted++;
    if (SPECIAL_CONTRACTS.includes(id)) next.cycle.specialContractsCompleted++;
    if (next.cycle.route !== 'legacy' && !next.cycle.contractTypes.includes(id)) next.cycle.contractTypes.push(id);
    // A chain of three distinct contract types gives a once-per-cycle bonus.
    if (!next.cycle.seriesCompleted && next.cycle.contractTypes.length >= 3) {
      next.cycle.resources.credits = safeCredit(next.cycle.resources.credits, Math.ceil(100 * efficiencyMultiplier(next)));
      next.cycle.resources.intel = safeCredit(next.cycle.resources.intel, Math.ceil(10 * efficiencyMultiplier(next)));
      next.cycle.seriesCompleted = true;
    }
  }
  return validateState(next);
}
export function missions(state) {
  const route = PRESTIGE_ROUTES[state.cycle.route];
  if (!route) return [{ name: 'Elegir una ruta industrial', progress: 0, target: 1 }];
  const items = [
    { name: `Mejorar edificios ${route.upgrades} veces`, progress: Math.min(route.upgrades, state.cycle.upgrades), target: route.upgrades },
    { name: `Completar ${route.contracts} contratos`, progress: Math.min(route.contracts, state.cycle.contractsCompleted), target: route.contracts },
    { name: route.project === 'archive' ? 'Terminar el Centro científico' : 'Terminar el proyecto elegido',
      progress: state.cycle.project?.completed && (!route.project || state.cycle.project.id === route.project) ? 1 : 0, target: 1 },
  ];
  if (route.specialContracts) items.push({ name: 'Completar un contrato especial', progress: Math.min(route.specialContracts, state.cycle.specialContractsCompleted), target: route.specialContracts });
  return items;
}
export function availableResearch(state) { return Object.entries(RESEARCH).filter(([key]) => !state.permanent.research.includes(key)); }
export function canPrestige(state) { return state.permanent.prestigeCount < MAX_PRESTIGE_COUNT && missions(state).every(item => item.progress >= item.target); }
export function exportUnlocks(state) {
  const unlocks = Object.fromEntries(Object.entries(BASE_ARSENAL).map(([family, ids]) => [family, [...ids]]));
  for (const key of state.permanent.research) { const research = RESEARCH[key]; unlocks[research.family].push(research.id); }
  return unlocks;
}

export function executeCommand(state, command, now) {
  const next = advanceFactory(state, now);
  let message;
  switch (command.type) {
    case 'chooseRoute': {
      requireValue(next.cycle.route === null, 'La ruta de este ciclo ya está elegida.');
      requireValue(Object.hasOwn(PRESTIGE_ROUTES, command.id) && command.id !== 'legacy', 'Ruta industrial desconocida.');
      next.cycle.route = command.id;
      message = `Ruta elegida: ${PRESTIGE_ROUTES[command.id].name}.`; break;
    }
    case 'setMode': {
      requireValue(next.cycle.route !== 'legacy', 'Los nuevos modos estarán disponibles después del Prestigio de este ciclo V2.');
      requireValue(Object.hasOwn(PRODUCTION_MODES, command.id), 'Modo industrial desconocido.');
      requireValue(command.id !== next.cycle.mode, 'Este modo ya está activo.');
      requireValue(next.cycle.modeChangedAt === null || now >= next.cycle.modeChangedAt + MODE_COOLDOWN_MS, 'Esperá 60 segundos entre cambios de especialización.');
      next.cycle.mode = command.id; next.cycle.modeChangedAt = now;
      message = `Producción orientada a ${PRODUCTION_MODES[command.id].name}.`; break;
    }
    case 'upgrade': {
      requireValue(next.cycle.route !== null, 'Elegí primero una ruta industrial.');
      const id = command.id;
      requireValue(Object.hasOwn(BUILDINGS, id), 'Edificio desconocido.');
      requireValue(next.cycle.buildings[id] < MAX_BUILDING_LEVEL, 'Este edificio alcanzó el nivel máximo.');
      pay(next, buildingCost(next, id)); next.cycle.buildings[id]++; next.cycle.upgrades++;
      message = `${BUILDINGS[id].name} mejorado.`; break;
    }
    case 'selectProject': {
      requireValue(next.cycle.route !== null, 'Elegí primero una ruta industrial.');
      requireValue(next.cycle.project === null, 'Ya elegiste el proyecto de este ciclo.');
      requireValue(Object.hasOwn(PROJECTS, command.id), 'Proyecto desconocido.');
      const route = PRESTIGE_ROUTES[next.cycle.route];
      requireValue(!route.project || route.project === command.id, 'La ruta científica exige el Centro científico.');
      next.cycle.project = { id: command.id, delivered: emptyResources(), completed: false };
      message = `Objetivo elegido: ${PROJECTS[command.id].name}.`; break;
    }
    case 'deliverProject': {
      const project = next.cycle.project;
      requireValue(project && !project.completed, 'No hay un proyecto pendiente.');
      const cost = projectCost(next, project.id);
      let total = 0;
      for (const key of Object.keys(RESOURCES)) {
        const remaining = cost[key] - project.delivered[key];
        const amount = Math.min(next.cycle.resources[key], remaining);
        next.cycle.resources[key] -= amount;
        project.delivered[key] = amount === remaining ? cost[key] : project.delivered[key] + amount;
        total += amount;
      }
      requireValue(total > 0, 'Todavía no tenés materiales pendientes para entregar.');
      project.completed = Object.keys(RESOURCES).every(key => project.delivered[key] === cost[key]);
      message = project.completed ? 'Proyecto terminado. Bonus industrial máximo activo.' : next.cycle.route === 'legacy' ? 'Materiales entregados. La recompensa V2 se activa al completar el proyecto.' : 'Materiales entregados. El proyecto puede activar bonuses parciales al llegar al 25% y 60%.';
      break;
    }
    case 'startContract': {
      requireValue(next.cycle.route !== null, 'Elegí primero una ruta industrial.');
      requireValue(next.cycle.contract === null, 'Ya hay un contrato en curso.');
      requireValue(Object.hasOwn(CONTRACTS, command.id), 'Contrato desconocido.');
      requireValue(next.cycle.route !== 'legacy' || LEGACY_CONTRACT_IDS.includes(command.id), 'Los contratos nuevos estarán disponibles después del Prestigio de este ciclo V2.');
      pay(next, contractCost(next, command.id));
      next.cycle.contract = { id: command.id, startedAt: now, endsAt: now + contractDuration(next, command.id) * 1000 };
      message = 'Contrato iniciado. La recompensa se cobra automáticamente al terminar.'; break;
    }
    case 'prestige': {
      requireValue(next.permanent.prestigeCount < MAX_PRESTIGE_COUNT, 'Alcanzaste el límite de 100 prestigios. La fábrica puede seguir produciendo.');
      requireValue(canPrestige(next), 'Completá las misiones de la ruta antes de prestigiar.');
      const available = availableResearch(next);
      if (available.length > 0) {
        requireValue(available.some(([key]) => key === command.research), 'Elegí una investigación nueva válida.');
        next.permanent.research.push(command.research);
      } else {
        requireValue(command.research === null || command.research === undefined || command.research === '', 'No hay investigaciones PvP disponibles.');
      }
      next.permanent.prestigeCount++;
      next.cycle = freshCycle();
      message = available.length > 0 ? `Prestigio completado. ${RESEARCH[command.research].name} desbloqueado en Arena. Aumentó tu eficiencia industrial permanente.` : 'Prestigio industrial completado. Todas las investigaciones PvP ya están desbloqueadas; tu fábrica sigue progresando.';
      break;
    }
    default: throw new Error('Acción desconocida.');
  }
  return { state: validateState(next), message };
}

import { SCHEMA_VERSION, OFFLINE_LIMIT_MS, RESOURCES, BUILDINGS, MAX_BUILDING_LEVEL, PROJECTS, CONTRACTS, BASE_ARSENAL, RESEARCH } from './catalog.js';
import { validateState } from './save-format.js';

const clone = value => JSON.parse(JSON.stringify(value));
const emptyResources = () => Object.fromEntries(Object.keys(RESOURCES).map(key => [key, 0]));
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function validNow(now) { requireValue(Number.isSafeInteger(now) && now >= 0 && now <= 1e15, 'Reloj inválido.'); }
function freshCycle() {
  return { resources: { credits: 350, energy: 100, steel: 100, intel: 20 },
    buildings: Object.fromEntries(Object.keys(BUILDINGS).map(key => [key, 1])),
    upgrades: 0, contractsCompleted: 0, contract: null, project: null };
}
export function createFactory(now) {
  validNow(now);
  return { schemaVersion: SCHEMA_VERSION, savedAt: now, permanent: { prestigeCount: 0, research: [] }, cycle: freshCycle() };
}
export function productionRates(state) {
  const rates = emptyResources();
  for (const [id, building] of Object.entries(BUILDINGS)) rates[building.resource] += building.rate * state.cycle.buildings[id];
  if (state.cycle.project?.completed) {
    const project = PROJECTS[state.cycle.project.id];
    rates[project.rewardResource] *= project.multiplier;
  }
  return rates;
}
export function buildingCost(state, id) {
  requireValue(Object.hasOwn(BUILDINGS, id), 'Edificio desconocido.');
  return { credits: Math.ceil(BUILDINGS[id].baseCost * 1.4 ** (state.cycle.buildings[id] - 1)) };
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
  for (const [key, rate] of Object.entries(productionRates(state))) next.cycle.resources[key] = Math.min(1e15, next.cycle.resources[key] + rate * seconds);
  next.savedAt = now;
  if (next.cycle.contract && now >= next.cycle.contract.endsAt) {
    for (const [key, amount] of Object.entries(CONTRACTS[next.cycle.contract.id].reward)) next.cycle.resources[key] = Math.min(1e15, next.cycle.resources[key] + amount);
    next.cycle.contract = null;
    next.cycle.contractsCompleted++;
  }
  return validateState(next);
}
export function missions(state) {
  return [
    { name: 'Mejorar edificios dos veces', progress: Math.min(2, state.cycle.upgrades), target: 2 },
    { name: 'Completar dos contratos', progress: Math.min(2, state.cycle.contractsCompleted), target: 2 },
    { name: 'Terminar el proyecto elegido', progress: state.cycle.project?.completed ? 1 : 0, target: 1 },
  ];
}
export function availableResearch(state) { return Object.entries(RESEARCH).filter(([key]) => !state.permanent.research.includes(key)); }
export function canPrestige(state) { return missions(state).every(mission => mission.progress === mission.target) && availableResearch(state).length > 0; }
export function exportUnlocks(state) {
  const unlocks = Object.fromEntries(Object.entries(BASE_ARSENAL).map(([family, ids]) => [family, [...ids]]));
  for (const key of state.permanent.research) { const research = RESEARCH[key]; unlocks[research.family].push(research.id); }
  return unlocks;
}

export function executeCommand(state, command, now) {
  const next = advanceFactory(state, now);
  let message;
  switch (command.type) {
    case 'upgrade': {
      const id = command.id;
      requireValue(Object.hasOwn(BUILDINGS, id), 'Edificio desconocido.');
      requireValue(next.cycle.buildings[id] < MAX_BUILDING_LEVEL, 'Este edificio alcanzó el nivel máximo.');
      pay(next, buildingCost(next, id)); next.cycle.buildings[id]++; next.cycle.upgrades++;
      message = `${BUILDINGS[id].name} mejorado.`; break;
    }
    case 'selectProject':
      requireValue(next.cycle.project === null, 'Ya elegiste el proyecto de este ciclo.');
      requireValue(Object.hasOwn(PROJECTS, command.id), 'Proyecto desconocido.');
      next.cycle.project = { id: command.id, delivered: emptyResources(), completed: false };
      message = `Objetivo elegido: ${PROJECTS[command.id].name}.`; break;
    case 'deliverProject': {
      const project = next.cycle.project;
      requireValue(project && !project.completed, 'No hay un proyecto pendiente.');
      const cost = PROJECTS[project.id].cost;
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
      message = project.completed ? 'Proyecto terminado. Su recompensa industrial está activa este ciclo.' : 'Materiales entregados. Podés seguir aportando cuando produzcas más.';
      break;
    }
    case 'startContract':
      requireValue(next.cycle.contract === null, 'Ya hay un contrato en curso.');
      requireValue(Object.hasOwn(CONTRACTS, command.id), 'Contrato desconocido.');
      pay(next, CONTRACTS[command.id].cost);
      next.cycle.contract = { id: command.id, startedAt: now, endsAt: now + CONTRACTS[command.id].duration * 1000 };
      message = 'Contrato iniciado. La recompensa se cobra automáticamente al terminar.'; break;
    case 'prestige':
      requireValue(canPrestige(next), 'Completá las tres misiones y comprobá que quede una investigación nueva.');
      requireValue(availableResearch(next).some(([key]) => key === command.research), 'Elegí una investigación nueva válida.');
      next.permanent.research.push(command.research); next.permanent.prestigeCount++;
      next.cycle = freshCycle();
      message = `Prestigio completado. ${RESEARCH[command.research].name} queda desbloqueado para siempre.`; break;
    default: throw new Error('Acción desconocida.');
  }
  return { state: validateState(next), message };
}

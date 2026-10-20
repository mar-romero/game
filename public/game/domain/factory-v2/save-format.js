import { SCHEMA_VERSION, BACKUP_KEY, RESOURCES, BUILDINGS, MAX_BUILDING_LEVEL, PROJECTS, CONTRACTS, LEGACY_CONTRACT_IDS, RESEARCH, PRODUCTION_MODES, PRESTIGE_ROUTES, MAX_PRESTIGE_COUNT, PRESTIGE_COST_FACTOR } from './catalog.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e15;
const integer = value => number(value) && Number.isSafeInteger(value);
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function resourceMap(value) {
  return record(value) && Object.keys(value).length === Object.keys(RESOURCES).length
    && Object.keys(RESOURCES).every(key => number(value[key]));
}
function projectCostForCycle(state, id) {
  const factor = state.cycle.route === 'legacy' ? 1 : PRESTIGE_COST_FACTOR ** state.permanent.prestigeCount;
  return Object.fromEntries(Object.entries(PROJECTS[id].cost).map(([key, cost]) => [key, Math.ceil(cost * factor)]));
}

export function validateState(state) {
  requireValue(record(state), 'El guardado no es un objeto válido.');
  requireValue(state.schemaVersion === SCHEMA_VERSION, 'Versión de guardado incompatible. Conservamos tus datos sin modificarlos.');
  requireValue(integer(state.savedAt), 'Fecha de guardado inválida.');
  const permanent = state.permanent;
  requireValue(record(permanent) && integer(permanent.prestigeCount) && permanent.prestigeCount <= MAX_PRESTIGE_COUNT
    && Array.isArray(permanent.research), 'Progreso permanente inválido.');
  requireValue(permanent.research.every(key => typeof key === 'string' && Object.hasOwn(RESEARCH, key))
    && new Set(permanent.research).size === permanent.research.length
    && permanent.prestigeCount >= permanent.research.length
    && (permanent.prestigeCount === permanent.research.length || permanent.research.length === Object.keys(RESEARCH).length), 'Investigaciones permanentes inválidas.');
  const cycle = state.cycle;
  requireValue(record(cycle) && resourceMap(cycle.resources) && record(cycle.buildings), 'Recursos o edificios inválidos.');
  requireValue(Object.keys(cycle.buildings).length === Object.keys(BUILDINGS).length
    && Object.keys(BUILDINGS).every(key => integer(cycle.buildings[key]) && cycle.buildings[key] >= 1 && cycle.buildings[key] <= MAX_BUILDING_LEVEL), 'Niveles de edificios inválidos.');
  requireValue(integer(cycle.upgrades) && cycle.upgrades === Object.values(cycle.buildings).reduce((total, level) => total + level - 1, 0)
    && integer(cycle.contractsCompleted) && integer(cycle.specialContractsCompleted)
    && cycle.specialContractsCompleted <= cycle.contractsCompleted, 'Progreso de misiones inválido.');
  requireValue(cycle.route === null || Object.hasOwn(PRESTIGE_ROUTES, cycle.route), 'Ruta industrial inválida.');
  if (cycle.route === 'legacy') {
    requireValue(cycle.mode === 'balanced' && cycle.modeChangedAt === null
      && cycle.specialContractsCompleted === 0 && Array.isArray(cycle.contractTypes)
      && cycle.contractTypes.length === 0 && cycle.seriesCompleted === false, 'Ciclo heredado V2 inválido.');
  }
  requireValue(Object.hasOwn(PRODUCTION_MODES, cycle.mode) && (cycle.modeChangedAt === null || integer(cycle.modeChangedAt))
    && (cycle.modeChangedAt === null || cycle.modeChangedAt <= state.savedAt), 'Modo industrial inválido.');
  requireValue(Array.isArray(cycle.contractTypes) && cycle.contractTypes.length <= Object.keys(CONTRACTS).length
    && cycle.contractTypes.every(id => typeof id === 'string' && Object.hasOwn(CONTRACTS, id))
    && new Set(cycle.contractTypes).size === cycle.contractTypes.length
    && cycle.contractTypes.length <= cycle.contractsCompleted
    && typeof cycle.seriesCompleted === 'boolean'
    && cycle.seriesCompleted === (cycle.contractTypes.length >= 3), 'Serie de contratos inválida.');
  if (cycle.contract !== null) {
    const contract = cycle.contract;
    requireValue(record(contract) && Object.hasOwn(CONTRACTS, contract.id) && integer(contract.startedAt) && integer(contract.endsAt)
      && contract.startedAt <= state.savedAt && contract.endsAt > contract.startedAt
      && contract.endsAt <= contract.startedAt + CONTRACTS[contract.id].duration * 1000, 'Contrato guardado inválido.');
    if (cycle.route === 'legacy') requireValue(LEGACY_CONTRACT_IDS.includes(contract.id)
      && contract.endsAt === contract.startedAt + CONTRACTS[contract.id].duration * 1000, 'Contrato V2 inválido.');
  }
  if (cycle.project !== null) {
    const project = cycle.project;
    requireValue(record(project) && Object.hasOwn(PROJECTS, project.id) && resourceMap(project.delivered) && typeof project.completed === 'boolean', 'Proyecto guardado inválido.');
    const cost = projectCostForCycle(state, project.id);
    requireValue(Object.keys(RESOURCES).every(key => project.delivered[key] <= cost[key])
      && project.completed === Object.keys(RESOURCES).every(key => project.delivered[key] === cost[key]), 'Entregas del proyecto inválidas.');
  }
  return state;
}

function migrateV1(old) {
  // Check the complete V1 invariant before converting anything; never trust corrupt data.
  requireValue(record(old.permanent) && integer(old.permanent.prestigeCount)
    && Array.isArray(old.permanent.research) && old.permanent.prestigeCount === old.permanent.research.length
    && old.permanent.research.every(key => Object.hasOwn(RESEARCH, key))
    && new Set(old.permanent.research).size === old.permanent.research.length, 'Investigaciones V2 inválidas.');
  requireValue(integer(old.savedAt) && record(old.cycle) && resourceMap(old.cycle.resources)
    && record(old.cycle.buildings) && Object.keys(old.cycle.buildings).length === Object.keys(BUILDINGS).length
    && Object.keys(BUILDINGS).every(id => integer(old.cycle.buildings[id]) && old.cycle.buildings[id] >= 1 && old.cycle.buildings[id] <= MAX_BUILDING_LEVEL)
    && integer(old.cycle.upgrades) && old.cycle.upgrades === Object.values(old.cycle.buildings).reduce((sum, level) => sum + level - 1, 0)
    && integer(old.cycle.contractsCompleted), 'Progreso V2 inválido.');
  if (old.cycle.contract !== null) {
    const c = old.cycle.contract;
    requireValue(record(c) && LEGACY_CONTRACT_IDS.includes(c.id) && integer(c.startedAt) && integer(c.endsAt)
      && c.startedAt <= old.savedAt && c.endsAt === c.startedAt + CONTRACTS[c.id].duration * 1000, 'Contrato V2 inválido.');
  }
  if (old.cycle.project !== null) {
    const p = old.cycle.project;
    requireValue(record(p) && Object.hasOwn(PROJECTS, p.id) && resourceMap(p.delivered) && typeof p.completed === 'boolean'
      && Object.keys(RESOURCES).every(key => p.delivered[key] <= PROJECTS[p.id].cost[key])
      && p.completed === Object.keys(RESOURCES).every(key => p.delivered[key] === PROJECTS[p.id].cost[key]), 'Proyecto V2 inválido.');
  }
  const next = JSON.parse(JSON.stringify(old));
  next.schemaVersion = SCHEMA_VERSION;
  Object.assign(next.cycle, { route: 'legacy', mode: 'balanced', modeChangedAt: null,
    specialContractsCompleted: 0, contractTypes: [], seriesCompleted: false });
  // The current cycle keeps V2 quantities and prices exactly, including fractions.
  // Scaling and new route rules begin only after its next prestige.
  return validateState(next);
}

export function decodeSave(raw) {
  let state;
  try { state = JSON.parse(raw); } catch { throw new Error('El guardado contiene JSON corrupto. Conservamos tus datos sin modificarlos.'); }
  if (state?.schemaVersion === 1) return migrateV1(state);
  return validateState(state);
}
export function encodeSave(state) { return JSON.stringify(validateState(state)); }

// Decide where to back up the original JSON without overwriting older backups.
// Storage access is injected by the browser adapter; this function does not write.
export function legacyBackupPlan(raw, readBackup) {
  const old = JSON.parse(raw);
  if (old?.schemaVersion !== 1) return null;
  decodeSave(raw); // A corrupt save must never enter the migration write path.
  let key = BACKUP_KEY;
  let existing = readBackup(key);
  const stem = `${BACKUP_KEY}.${old.savedAt}`;
  for (let suffix = 1; existing !== null && existing !== raw; suffix++) {
    key = suffix === 1 ? stem : `${stem}.${suffix}`;
    existing = readBackup(key);
  }
  return { key, raw, writeRequired: existing === null };
}

import { SCHEMA_VERSION, RESOURCES, BUILDINGS, MAX_BUILDING_LEVEL, PROJECTS, CONTRACTS, RESEARCH } from './catalog.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e15;
const integer = value => number(value) && Number.isSafeInteger(value);
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function resourceMap(value) {
  return record(value) && Object.keys(value).length === Object.keys(RESOURCES).length
    && Object.keys(RESOURCES).every(key => number(value[key]));
}

export function validateState(state) {
  requireValue(record(state), 'El guardado no es un objeto válido.');
  requireValue(state.schemaVersion === SCHEMA_VERSION, 'Versión de guardado incompatible. Conservamos tus datos sin modificarlos.');
  requireValue(integer(state.savedAt), 'Fecha de guardado inválida.');
  const permanent = state.permanent;
  requireValue(record(permanent) && integer(permanent.prestigeCount) && Array.isArray(permanent.research), 'Progreso permanente inválido.');
  requireValue(permanent.research.every(key => typeof key === 'string' && Object.hasOwn(RESEARCH, key))
    && new Set(permanent.research).size === permanent.research.length
    && permanent.prestigeCount === permanent.research.length, 'Investigaciones permanentes inválidas.');
  const cycle = state.cycle;
  requireValue(record(cycle) && resourceMap(cycle.resources) && record(cycle.buildings), 'Recursos o edificios inválidos.');
  requireValue(Object.keys(cycle.buildings).length === Object.keys(BUILDINGS).length
    && Object.keys(BUILDINGS).every(key => integer(cycle.buildings[key]) && cycle.buildings[key] >= 1 && cycle.buildings[key] <= MAX_BUILDING_LEVEL), 'Niveles de edificios inválidos.');
  requireValue(integer(cycle.upgrades) && cycle.upgrades === Object.values(cycle.buildings).reduce((total, level) => total + level - 1, 0)
    && integer(cycle.contractsCompleted), 'Progreso de misiones inválido.');
  if (cycle.contract !== null) {
    const contract = cycle.contract;
    requireValue(record(contract) && Object.hasOwn(CONTRACTS, contract.id) && integer(contract.startedAt) && integer(contract.endsAt)
      && contract.startedAt <= state.savedAt && contract.endsAt === contract.startedAt + CONTRACTS[contract.id].duration * 1000, 'Contrato guardado inválido.');
  }
  if (cycle.project !== null) {
    const project = cycle.project;
    requireValue(record(project) && Object.hasOwn(PROJECTS, project.id) && resourceMap(project.delivered) && typeof project.completed === 'boolean', 'Proyecto guardado inválido.');
    const cost = PROJECTS[project.id].cost;
    requireValue(Object.keys(RESOURCES).every(key => project.delivered[key] <= cost[key])
      && project.completed === Object.keys(RESOURCES).every(key => project.delivered[key] === cost[key]), 'Entregas del proyecto inválidas.');
  }
  return state;
}

export function decodeSave(raw) {
  let state;
  try { state = JSON.parse(raw); } catch { throw new Error('El guardado contiene JSON corrupto. Conservamos tus datos sin modificarlos.'); }
  return validateState(state);
}

export function encodeSave(state) { return JSON.stringify(validateState(state)); }

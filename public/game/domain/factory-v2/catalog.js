import { CATALOG, BONUSES } from '../arena-v2/balance.js';

export const SCHEMA_VERSION = 2;
// Keep the exact existing key: Arena v2 imports the same save.
export const SAVE_KEY = 'factory-wars.factory-v2.local.v1';
export const BACKUP_KEY = `${SAVE_KEY}.backup-v1`;
export const OFFLINE_LIMIT_MS = 4 * 60 * 60 * 1000;
export const RESOURCES = Object.freeze({ credits: 'Créditos', energy: 'Energía', steel: 'Acero', intel: 'Intel' });
export const BUILDINGS = Object.freeze({
  automation: { name: 'Automatización', resource: 'credits', rate: 2, baseCost: 100 },
  generator: { name: 'Generador', resource: 'energy', rate: 1.5, baseCost: 90 },
  refinery: { name: 'Refinería', resource: 'steel', rate: 1, baseCost: 110 },
  lab: { name: 'Laboratorio', resource: 'intel', rate: 0.3, baseCost: 130 },
});
export const MAX_BUILDING_LEVEL = 50;
export const LEGACY_CONTRACT_IDS = Object.freeze(['urgent', 'regular', 'scientific']);
export const PROJECTS = Object.freeze({
  reactor: { name: 'Reactor industrial', cost: { credits: 450, energy: 350, steel: 450, intel: 60 }, rewardResource: 'energy', multiplier: 1.5, detail: 'Hasta +50% de Energía; mejora por etapas al aportar materiales.' },
  drones: { name: 'Red de drones', cost: { credits: 600, energy: 300, steel: 350, intel: 90 }, rewardResource: 'credits', multiplier: 1.35, detail: 'Hasta +35% de Créditos; mejora por etapas al aportar materiales.' },
  archive: { name: 'Centro científico', cost: { credits: 450, energy: 250, steel: 300, intel: 150 }, rewardResource: 'intel', multiplier: 1.5, detail: 'Hasta +50% de Intel; mejora por etapas al aportar materiales.' },
});
export const CONTRACTS = Object.freeze({
  urgent: { name: 'Entrega urgente', duration: 45, cost: { steel: 60, energy: 40 }, reward: { credits: 110, intel: 8 }, detail: 'Rápido, menor recompensa.' },
  regular: { name: 'Pedido industrial', duration: 90, cost: { steel: 90, energy: 70 }, reward: { credits: 190, intel: 16 }, detail: 'Equilibrio entre tiempo y materiales.' },
  scientific: { name: 'Pedido científico', duration: 150, cost: { steel: 100, energy: 100, credits: 80 }, reward: { credits: 160, intel: 50 }, detail: 'Mayor inversión para obtener Intel.' },
  freight: { name: 'Carga mayorista', duration: 120, cost: { steel: 180, energy: 110 }, reward: { credits: 330, intel: 18 }, detail: 'Gran inversión industrial a cambio de Créditos.' },
  prototype: { name: 'Prototipo experimental', duration: 180, cost: { steel: 80, energy: 120, credits: 120 }, reward: { credits: 150, intel: 65 }, detail: 'Contrato caro que prioriza Intel.' },
});
export const PRODUCTION_MODES = Object.freeze({
  balanced: { name: 'Equilibrado', factors: {}, detail: 'Sin ventajas ni desventajas.' },
  science: { name: 'Científico', factors: { intel: 1.25, credits: 0.85 }, detail: '+25% Intel / -15% Créditos.' },
  heavy: { name: 'Industria pesada', factors: { steel: 1.2, energy: 0.9 }, detail: '+20% Acero / -10% Energía.' },
  commercial: { name: 'Comercial', factors: { credits: 1.2, intel: 0.85 }, detail: '+20% Créditos / -15% Intel.' },
});
export const MODE_COOLDOWN_MS = 60_000;
// V3.1: requirements still grow by 20% per prestige. The industrial advantage
// grows by a bounded 0-35% over requirements, rather than compounding a separate
// +25% infinitely. This maintains tangible permanent progression without
// collapsing the end game into 15-second prestige loops.
export const PRESTIGE_COST_FACTOR = 1.2;
export const PRESTIGE_ADVANTAGE_CAP = 0.35;
export const PRESTIGE_ADVANTAGE_PACE = 12;
export const CONTRACT_TIME_MIN_SECONDS = 30;
export const CONTRACT_TIME_EXPERIENCE_FACTOR = 0.045;
// Protect arithmetic bounds for unrealistic save states while covering many cycles.
export const MAX_PRESTIGE_COUNT = 100;
export const PRESTIGE_ROUTES = Object.freeze({
  industrial: { name: 'Expansión industrial', upgrades: 4, contracts: 1, project: null, detail: 'Más mejoras de edificios, menos contratos. Prioriza la inversión productiva.' },
  logistics: { name: 'Operación logística', upgrades: 1, contracts: 4, project: null, detail: 'Más entregas, menos mejoras. Los contratos duran un 20% menos y recompensan un 15% más durante este ciclo.' },
  scientific: { name: 'Carrera científica', upgrades: 2, contracts: 2, project: 'archive', detail: 'Desarrollá el Centro científico. +30% de producción de Intel durante este ciclo.' },
  priority: { name: 'Proyecto prioritario', upgrades: 2, contracts: 1, project: null, specialContracts: 1, detail: 'Terminá un contrato especial y un proyecto. +25% de Acero y +15% de Energía durante este ciclo.' },
  // Exists only for migration: ongoing V2 missions are not discarded.
  legacy: { name: 'Ciclo heredado V2', upgrades: 2, contracts: 2, project: null, detail: 'Conserva los objetivos, costos, entregas y producción originales de V2 hasta el próximo Prestigio.' },
});
export const SPECIAL_CONTRACTS = Object.freeze(['freight', 'prototype']);
export const FAMILY_NAMES = Object.freeze({ rockets: 'Cohetes', shields: 'Defensas', sabotage: 'Sabotajes', bonuses: 'Bonus' });
export const BASE_ARSENAL = Object.freeze({
  rockets: Object.freeze(['fast', 'heavy', 'burst', 'piercing']),
  shields: Object.freeze(['quick', 'heavy', 'interceptor', 'sustained']),
  sabotage: Object.freeze(['disrupt', 'economy', 'production']),
  bonuses: Object.freeze(['expansion']),
});
export const ARSENAL_OPTIONS = Object.freeze({ ...CATALOG, bonuses: BONUSES });
export const RESEARCH = Object.freeze(Object.fromEntries(
  Object.entries(ARSENAL_OPTIONS).flatMap(([family, entries]) =>
    Object.entries(entries).filter(([id]) => !BASE_ARSENAL[family].includes(id))
      .map(([id, item]) => [`${family}:${id}`, { family, id, name: item.name, detail: item.detail }]))
));

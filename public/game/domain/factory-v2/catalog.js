import { CATALOG, BONUSES } from '../arena-v2/balance.js';

export const SCHEMA_VERSION = 1;
export const SAVE_KEY = 'factory-wars.factory-v2.local.v1';
export const OFFLINE_LIMIT_MS = 4 * 60 * 60 * 1000;
export const RESOURCES = Object.freeze({ credits: 'Créditos', energy: 'Energía', steel: 'Acero', intel: 'Intel' });
export const BUILDINGS = Object.freeze({
  automation: { name: 'Automatización', resource: 'credits', rate: 2, baseCost: 100 },
  generator: { name: 'Generador', resource: 'energy', rate: 1.5, baseCost: 90 },
  refinery: { name: 'Refinería', resource: 'steel', rate: 1, baseCost: 110 },
  lab: { name: 'Laboratorio', resource: 'intel', rate: 0.3, baseCost: 130 },
});
export const MAX_BUILDING_LEVEL = 50;
export const PROJECTS = Object.freeze({
  reactor: { name: 'Reactor industrial', cost: { credits: 450, energy: 350, steel: 450, intel: 60 }, rewardResource: 'energy', multiplier: 1.5, detail: '+50% producción de Energía durante este ciclo.' },
  drones: { name: 'Red de drones', cost: { credits: 600, energy: 300, steel: 350, intel: 90 }, rewardResource: 'credits', multiplier: 1.35, detail: '+35% producción de Créditos durante este ciclo.' },
  archive: { name: 'Centro científico', cost: { credits: 450, energy: 250, steel: 300, intel: 150 }, rewardResource: 'intel', multiplier: 1.5, detail: '+50% producción de Intel durante este ciclo.' },
});
export const CONTRACTS = Object.freeze({
  urgent: { name: 'Entrega urgente', duration: 45, cost: { steel: 60, energy: 40 }, reward: { credits: 110, intel: 8 }, detail: 'Rápido, menor recompensa.' },
  regular: { name: 'Pedido industrial', duration: 90, cost: { steel: 90, energy: 70 }, reward: { credits: 190, intel: 16 }, detail: 'Equilibrio entre tiempo y materiales.' },
  scientific: { name: 'Pedido científico', duration: 150, cost: { steel: 100, energy: 100, credits: 80 }, reward: { credits: 160, intel: 50 }, detail: 'Mayor inversión para obtener Intel.' },
});
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

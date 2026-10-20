import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createFactory, advanceFactory, executeCommand, productionRates, projectMultiplier,
  projectProgress, projectCost, contractCost, contractReward, contractDuration,
  missions, canPrestige, availableResearch, exportUnlocks, efficiencyMultiplier, costMultiplier, buildingCost
} from '../public/game/domain/factory-v2/factory-engine.js';
import { decodeSave, encodeSave, validateState, legacyBackupPlan } from '../public/game/domain/factory-v2/save-format.js';
import { PROJECTS, CONTRACTS, RESEARCH, PRESTIGE_ROUTES, SAVE_KEY, BACKUP_KEY, MAX_PRESTIGE_COUNT } from '../public/game/domain/factory-v2/catalog.js';
import { CATALOG, BONUSES, FAMILIES, defaultLoadout } from '../public/game/domain/arena-v2/balance.js';
import { resolveLoadout } from '../public/game/domain/arena-v2/match-engine.js';

function test(name, fn) { try { fn(); console.log(`OK ${name}`); } catch (err) { console.error(`FAIL ${name}`); throw err; } }
const act = (state, command, now = state.savedAt) => executeCommand(state, command, now).state;
const fund = (state, n = 1000000) => {
  const next = structuredClone(state);
  for (const key of Object.keys(next.cycle.resources)) next.cycle.resources[key] = n;
  return validateState(next);
};
const oldFactory = () => ({
  schemaVersion: 1, savedAt: 100000, permanent: { prestigeCount: 0, research: [] },
  cycle: { resources: { credits: 350, energy: 100, steel: 100, intel: 20 },
    buildings: { automation: 1, generator: 1, refinery: 1, lab: 1 },
    upgrades: 0, contractsCompleted: 0, contract: null, project: null }
});

test('V2 migration at prestige 7 preserves exact fractional deliveries and legacy economics', () => {
  const old = oldFactory();
  old.permanent = { prestigeCount: 7, research: Object.keys(RESEARCH).slice(0, 7) };
  old.cycle.buildings.automation = 3; old.cycle.upgrades = 2;
  old.cycle.contractsCompleted = 1;
  old.cycle.project = { id: 'reactor', delivered: { credits: 111.375, energy: 349.125, steel: 202.5, intel: 0.0625 }, completed: false };
  old.cycle.contract = { id: 'regular', startedAt: 90000, endsAt: 180000 };
  const before = JSON.stringify(old);
  let migrated = decodeSave(before);
  assert.deepEqual(migrated.cycle.project, old.cycle.project);
  assert.deepEqual(migrated.cycle.resources, old.cycle.resources);
  assert.deepEqual(migrated.cycle.buildings, old.cycle.buildings);
  assert.deepEqual(migrated.cycle.contract, old.cycle.contract);
  assert.equal(migrated.savedAt, old.savedAt);
  assert.equal(JSON.stringify(old), before);
  assert.deepEqual(missions(migrated).map(m => [m.progress, m.target]), [[2, 2], [1, 2], [0, 1]]);
  for (const id of Object.keys(PROJECTS)) assert.deepEqual(projectCost(migrated, id), PROJECTS[id].cost);
  for (const id of ['urgent', 'regular', 'scientific']) {
    assert.deepEqual(contractCost(migrated, id), CONTRACTS[id].cost);
    assert.deepEqual(contractReward(migrated, id), CONTRACTS[id].reward);
    assert.equal(contractDuration(migrated, id), CONTRACTS[id].duration);
  }
  assert.deepEqual(buildingCost(migrated, 'automation'), { credits: 196 });
  assert.deepEqual(productionRates(migrated), { credits: 6, energy: 1.5, steel: 1, intel: 0.3 });
  assert.equal(projectMultiplier(migrated), 1, 'V2 partial projects do not grant new milestone rewards');
  assert.deepEqual(decodeSave(encodeSave(migrated)), migrated);
  assert.throws(() => act(migrated, { type: 'setMode', id: 'heavy' }), /después del Prestigio/);
  assert.throws(() => act({ ...migrated, cycle: { ...migrated.cycle, contract: null } }, { type: 'startContract', id: 'freight' }), /después del Prestigio/);
  migrated = advanceFactory(migrated, 280000);
  migrated = act(migrated, { type: 'deliverProject' });
  assert.equal(canPrestige(migrated), true);
  const next = act(migrated, { type: 'prestige', research: availableResearch(migrated)[0][0] });
  assert.equal(next.cycle.route, null);
  assert.equal(next.permanent.prestigeCount, 8);
  assert.equal(projectCost(next, 'reactor').credits, Math.ceil(450 * 1.2 ** 8));
  assert.ok(productionRates(next).credits > 2);
});
test('V2 rejects V3-only active contracts and preserves completed project quantities at p>0', () => {
  const old = oldFactory();
  old.permanent = { prestigeCount: 3, research: Object.keys(RESEARCH).slice(0, 3) };
  old.cycle.project = { id: 'archive', delivered: { ...PROJECTS.archive.cost }, completed: true };
  const migrated = decodeSave(JSON.stringify(old));
  assert.deepEqual(migrated.cycle.project, old.cycle.project);
  assert.equal(projectMultiplier(migrated), 1.5);
  for (const id of ['freight', 'prototype']) {
    old.cycle.contract = { id, startedAt: 0, endsAt: CONTRACTS[id].duration * 1000 };
    assert.throws(() => decodeSave(JSON.stringify(old)), /Contrato V2/);
  }
});

test('V2 compatible key and V3 roundtrip', () => {
  assert.equal(SAVE_KEY, 'factory-wars.factory-v2.local.v1');
  const s = createFactory(1000);
  assert.equal(s.schemaVersion, 2);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('migration backup preserves older backups and the exact current V2 JSON', () => {
  const raw = JSON.stringify(oldFactory());
  const backups = new Map();
  const read = key => backups.get(key) ?? null;
  assert.deepEqual(legacyBackupPlan(raw, read), { key: BACKUP_KEY, raw, writeRequired: true });
  backups.set(BACKUP_KEY, 'older save');
  backups.set(`${BACKUP_KEY}.100000`, 'another older save');
  const plan = legacyBackupPlan(raw, read);
  assert.equal(plan.key, `${BACKUP_KEY}.100000.2`);
  assert.equal(plan.raw, raw);
  assert.equal(plan.writeRequired, true);
  backups.set(plan.key, plan.raw);
  assert.deepEqual(legacyBackupPlan(raw, read), { ...plan, writeRequired: false });
  assert.equal(backups.get(BACKUP_KEY), 'older save');
  assert.equal(backups.get(`${BACKUP_KEY}.100000`), 'another older save');
  assert.equal(legacyBackupPlan(encodeSave(createFactory(0)), read), null);
  const invalid = oldFactory(); invalid.cycle.upgrades = 99;
  assert.throws(() => legacyBackupPlan(JSON.stringify(invalid), read), /V2 inválido/);
});
test('V2 migration preserves projects, contracts, permanent research, and time', () => {
  const legacy = oldFactory(); legacy.permanent.prestigeCount = 1;
  legacy.permanent.research = [Object.keys(RESEARCH)[0]];
  legacy.cycle.project = { id: 'reactor', delivered: { credits: 450, energy: 350, steel: 450, intel: 60 }, completed: true };
  legacy.cycle.contract = { id: 'urgent', startedAt: 90000, endsAt: 135000 };
  const restored = decodeSave(JSON.stringify(legacy));
  assert.equal(restored.cycle.route, 'legacy');
  assert.equal(restored.cycle.project.completed, true);
  assert.deepEqual(restored.cycle.project.delivered, projectCost(restored, 'reactor'));
  assert.equal(restored.cycle.contract.endsAt, 135000);
  assert.equal(restored.permanent.prestigeCount, 1);
  assert.deepEqual(exportUnlocks(restored).rockets.includes(RESEARCH[legacy.permanent.research[0]].id), true);
  assert.equal(advanceFactory(restored, 136000).cycle.contractsCompleted, 1);
});
test('V2 invalid state is rejected before migrating', () => {
  const legacy = oldFactory(); legacy.cycle.buildings.refinery = 60;
  assert.throws(() => decodeSave(JSON.stringify(legacy)), /V2 inválido/);
  assert.throws(() => decodeSave('{bad'), /JSON corrupto/);
});
test('route selection is required once; new paths differ', () => {
  const s = createFactory(0);
  assert.equal(canPrestige(s), false);
  assert.throws(() => act(s, { type: 'upgrade', id: 'automation' }), /ruta/);
  for (const [id, route] of Object.entries(PRESTIGE_ROUTES)) {
    if (id === 'legacy') continue;
    const chosen = act(s, { type: 'chooseRoute', id });
    assert.equal(missions(chosen)[0].target, route.upgrades);
    assert.throws(() => act(chosen, { type: 'chooseRoute', id }), /ya está/);
  }
});
test('modes change rates and enforce cooldown, even after offline time', () => {
  const s = createFactory(0);
  const science = act(s, { type: 'setMode', id: 'science' }, 0);
  assert.equal(productionRates(science).intel, 0.375);
  assert.equal(productionRates(science).credits, 1.7);
  assert.throws(() => act(science, { type: 'setMode', id: 'heavy' }, 1000), /60 segundos/);
  const heavy = act(science, { type: 'setMode', id: 'heavy' }, 60000);
  assert.equal(productionRates(heavy).steel, 1.2);
  assert.equal(productionRates(heavy).energy, 1.35);
  const next = advanceFactory(heavy, 60000 + 5 * 3600 * 1000);
  assert.equal(next.cycle.resources.steel - heavy.cycle.resources.steel, 1.2 * 14400);
});
test('project reaches partial bonuses at 25%, 60%, and 100%', () => {
  let s = act(fund(createFactory(0)), { type: 'chooseRoute', id: 'industrial' });
  s = act(s, { type: 'selectProject', id: 'reactor' });
  assert.equal(projectMultiplier(s), 1);
  // Deliberate partial state: the engine validates delivered resource bounds.
  s.cycle.project.delivered = { credits: 200, energy: 100, steel: 100, intel: 0 }; // >25% total
  validateState(s); assert.equal(projectMultiplier(s), 1.1);
  s.cycle.project.delivered = { credits: 450, energy: 300, steel: 100, intel: 0 }; // >60%
  validateState(s); assert.equal(projectMultiplier(s), 1.25);
  s = act(s, { type: 'deliverProject' });
  assert.equal(s.cycle.project.completed, true);
  assert.equal(projectProgress(s), 1);
  assert.equal(projectMultiplier(s), 1.5);
});
test('contracts new/old, completion, series reward, routes specials', () => {
  let s = act(fund(createFactory(0)), { type: 'chooseRoute', id: 'priority' });
  for (const id of ['urgent', 'regular', 'freight']) {
    const started = act(s, { type: 'startContract', id });
    assert.equal(started.cycle.contract.id, id);
    s = advanceFactory(started, started.cycle.contract.endsAt);
  }
  assert.equal(s.cycle.contractsCompleted, 3);
  assert.equal(s.cycle.specialContractsCompleted, 1);
  assert.equal(s.cycle.seriesCompleted, true);
  assert.equal(s.cycle.contractTypes.length, 3);
  assert.equal(missions(s).at(-1).progress, 1);
  assert.ok(s.cycle.resources.credits > 0);
  assert.equal(contractDuration(s, 'prototype'), 180);
});
test('prestige raises requirements by 20%, gives bounded industrial advantage, preserves unlocks', () => {
  let s = act(fund(createFactory(0)), { type: 'chooseRoute', id: 'logistics' });
  s.cycle.upgrades = 1; s.cycle.buildings.automation = 2;
  s.cycle.contractsCompleted = 4;
  s.cycle.project = { id:'drones', delivered: projectCost(s, 'drones'), completed: true };
  validateState(s); assert.equal(canPrestige(s), true);
  const next = act(s, { type: 'prestige', research: availableResearch(s)[0][0] });
  assert.equal(next.permanent.prestigeCount, 1);
  assert.equal(next.cycle.route, null);
  assert.ok(efficiencyMultiplier(next) > costMultiplier(next));
  assert.ok(efficiencyMultiplier(next) < 1.25);
  assert.equal(productionRates(next).credits, 2 * efficiencyMultiplier(next));
  assert.equal(projectCost(next, 'reactor').credits, 540);
  assert.equal(contractCost(next, 'urgent').steel, 72);
  assert.equal(contractReward(next, 'urgent').credits, Math.ceil(110 * efficiencyMultiplier(next)));
  assert.equal(contractDuration(next, 'urgent'), 44);
  assert.equal(Object.values(exportUnlocks(next)).flat().length, 13);
});
test('prestige continues industrially after PvP research exhausts', () => {
  const s = createFactory(0);
  s.permanent.research = Object.keys(RESEARCH);
  s.permanent.prestigeCount = s.permanent.research.length;
  s.cycle.route = 'industrial';
  s.cycle.buildings.automation = 5; s.cycle.upgrades = 4;
  s.cycle.contractsCompleted = 1;
  s.cycle.project = { id: 'archive', delivered: projectCost(s, 'archive'), completed: true };
  validateState(s); assert.equal(canPrestige(s), true);
  const after = act(s, { type: 'prestige', research: null });
  assert.equal(after.permanent.prestigeCount, s.permanent.prestigeCount + 1);
  assert.equal(after.permanent.research.length, s.permanent.research.length);
  assert.equal(availableResearch(after).length, 0);
});
test('negative commands and invalid saves rejected', () => {
  const s = createFactory(0);
  assert.throws(() => act(s, {type:'chooseRoute',id:'legacy'}), /desconocida/);
  assert.throws(() => act(s, {type:'setMode',id:'unknown'}), /desconocido/);
  const bad = structuredClone(s); bad.cycle.resources.intel = Infinity;
  assert.throws(() => encodeSave(bad), /Recursos/);
});
console.log('Pruebas de compatibilidad Megafábrica V3.1 completadas');

// Real engine commands, no free-resource injection: verify several consecutive
// cycles can be completed with different routes and growing requirements.
test('100 consecutive paid prestige cycles preserve all 28 Arena research unlocks', () => {
  const routes = ['industrial', 'logistics', 'scientific', 'priority'];
  let s = createFactory(0), now = 0;
  assert.equal(Object.keys(RESEARCH).length, 28);
  for (let cycle = 0; cycle < MAX_PRESTIGE_COUNT; cycle++) {
    const route = routes[cycle % routes.length];
    s = act(s, { type: 'chooseRoute', id: route }, now);
    const projectId = route === 'scientific' ? 'archive' : cycle % 2 ? 'drones' : 'reactor';
    s = act(s, { type: 'selectProject', id: projectId }, now);
    let steps = 0;
    while (!canPrestige(s) && steps++ < 3000) {
      const due = missions(s).find(m => m.progress < m.target);
      let command = null;
      if (due.name.includes('Mejorar')) command = { type:'upgrade', id:'automation' };
      else if (due.name.includes('contratos') || due.name.includes('contrato especial')) {
        if (!s.cycle.contract) command = { type:'startContract', id:route === 'priority' ? 'freight' : 'urgent' };
      } else if (due.name.includes('Terminar')) command = { type:'deliverProject' };
      if (command) {
        try { s = act(s, command, now); continue; }
        catch (error) {
          assert.match(error.message, /Faltan recursos|no tenés materiales/);
        }
      }
      now += 10000;
      s = advanceFactory(s, now);
    }
    assert.equal(canPrestige(s), true, `cycle ${cycle + 1} blocked`);
    s = act(s, { type:'prestige', research:availableResearch(s)[0]?.[0] ?? null }, now);
    assert.equal(s.permanent.prestigeCount, cycle + 1);
    assert.equal(s.permanent.research.length, Math.min(28, cycle + 1));
    assert.deepEqual(decodeSave(encodeSave(s)), s);
    assert.deepEqual(s.cycle.resources, { credits: 350, energy: 100, steel: 100, intel: 20 });
  }
  assert.equal(s.permanent.prestigeCount, 100);
  assert.equal(canPrestige(s), false);
  assert.throws(() => act(s, { type: 'prestige', research: null }), /límite/);
  let capped = act(fund(s, 1e15), { type: 'chooseRoute', id: 'industrial' });
  for (let n = 0; n < 4; n++) capped = act(capped, { type: 'upgrade', id: 'automation' });
  capped = act(capped, { type: 'selectProject', id: 'reactor' });
  capped = act(capped, { type: 'deliverProject' });
  capped = act(capped, { type: 'startContract', id: 'urgent' });
  capped = advanceFactory(capped, capped.cycle.contract.endsAt);
  assert.ok(missions(capped).every(m => m.progress === m.target));
  assert.equal(canPrestige(capped), false, '100 is the limit even with all missions complete');
  const capBefore = encodeSave(capped);
  assert.throws(() => act(capped, { type: 'prestige', research: null }), /límite/);
  assert.equal(encodeSave(capped), capBefore);
  assert.ok(now < 100 * 12 * 60 * 1000, '100 paid cycles should finish within the simulation budget');
  const storage = new Map([[SAVE_KEY, encodeSave(s)]]);
  const unlocks = exportUnlocks(decodeSave(storage.get(SAVE_KEY)));
  assert.deepEqual(Object.fromEntries(Object.entries(unlocks).map(([f, ids]) => [f, ids.length])), { rockets: 10, shields: 10, sabotage: 10, bonuses: 10 });
  for (const [family, options] of Object.entries({ ...CATALOG, bonuses: BONUSES })) {
    assert.deepEqual([...unlocks[family]].sort(), Object.keys(options).sort());
  }
  for (const research of Object.values(RESEARCH)) {
    const loadout = defaultLoadout(research.family === 'bonuses' ? research.id : 'expansion');
    if (research.family !== 'bonuses') loadout.candidates[research.family][0] = research.id;
    const prepared = resolveLoadout(loadout, {}, unlocks);
    assert.equal(prepared.bonus, loadout.bonus);
    if (research.family !== 'bonuses') assert.ok(prepared.active[research.family].includes(research.id));
    for (const f of FAMILIES) assert.ok(prepared.active[f].every(id => unlocks[f].includes(id)));
  }
  // Pin the existing browser bridge to the very same key/decoder/export API.
  const arenaController = readFileSync(new URL('../public/game/adapters/web/arena-v2-controller.js', import.meta.url), 'utf8');
  assert.match(arenaController, /localStorage\.getItem\(SAVE_KEY\)/);
  assert.match(arenaController, /decodeSave\(raw\)/);
  assert.match(arenaController, /exportUnlocks\(factory\)/);
});
console.log('Simulación multicíclo completada');

// Regression checks for balancing V3.1 (saves retain schemaVersion 2).
test('bounded permanent advantage stays useful without 25% exponential runaway', () => {
  const s = createFactory(0);
  let last = 0;
  for (const p of [0, 1, 5, 10, 28, 50, 100]) {
    s.permanent.prestigeCount = p;
    s.permanent.research = Object.keys(RESEARCH).slice(0, Math.min(28, p));
    validateState(s);
    const relative = efficiencyMultiplier(s) / costMultiplier(s);
    assert.ok(relative >= last && relative <= 1.35 + 1e-8);
    if (p === 28) assert.ok(relative >= 1.3);
    last = relative;
  }
  assert.ok(last > 1.34);
  assert.ok(efficiencyMultiplier(s) > costMultiplier(s));
});
test('contracts preserve job time after V3.1 upgrades; new jobs have a 30s minimum', () => {
  const base = createFactory(0);
  assert.equal(contractDuration(base, 'urgent'), 45);
  const logist = act(base, { type:'chooseRoute', id:'logistics' });
  assert.equal(contractDuration(logist, 'urgent'), 36);
  assert.equal(contractReward(logist, 'urgent').credits, 127);
  const started = act(fund(logist), { type:'startContract', id:'urgent' }, 1000);
  assert.equal(started.cycle.contract.endsAt - started.cycle.contract.startedAt, 36000);
  const next = advanceFactory(started, 37000);
  assert.equal(next.cycle.contractsCompleted, 1);
  assert.equal(next.cycle.resources.credits > started.cycle.resources.credits, true);
  const p28 = createFactory(0); p28.permanent.prestigeCount = 28;
  p28.permanent.research = Object.keys(RESEARCH);
  assert.equal(contractDuration(p28,'urgent'),30);
  assert.equal(contractDuration(p28,'scientific'),67);
  p28.permanent.prestigeCount=100;
  for(const id of Object.keys(CONTRACTS)) assert.ok(contractDuration(p28,id) >= 30);
});
test('route specializations have meaningful non-PvP economic effects',()=>{
  const s=createFactory(0);
  const base = productionRates(s);
  const science=act(s,{type:'chooseRoute',id:'scientific'});
  const priority=act(s,{type:'chooseRoute',id:'priority'});
  const industry=act(s,{type:'chooseRoute',id:'industrial'});
  assert.equal(productionRates(science).intel,base.intel*1.3);
  assert.equal(productionRates(priority).steel,base.steel*1.25);
  assert.equal(productionRates(priority).energy,base.energy*1.15);
  assert.deepEqual(productionRates(industry),base);
  assert.deepEqual(exportUnlocks(science),exportUnlocks(priority));
});
test('V3 schema 2 saved contract and research remain readable after balancing',()=>{
  const state=createFactory(1000);state.permanent.prestigeCount=5;
  state.permanent.research=Object.keys(RESEARCH).slice(0,5);
  state.cycle.route='logistics';state.cycle.contract={id:'scientific',startedAt:100,endsAt:150100};
  validateState(state);
  assert.deepEqual(decodeSave(encodeSave(state)),state);
  const after=advanceFactory(state,150100);
  assert.equal(after.cycle.contractsCompleted,1);
  assert.equal(after.permanent.research.length,5);
});
console.log('Regresiones adicionales V3.1 completadas');

test('third distinct contract credits exact series reward once, including reload and repeats', () => {
  let s = fund(createFactory(0));
  s.permanent = { prestigeCount: 5, research: Object.keys(RESEARCH).slice(0, 5) };
  s = act(s, { type: 'chooseRoute', id: 'logistics' });
  for (const [index, id] of ['urgent', 'urgent', 'regular', 'freight', 'prototype', 'freight'].entries()) {
    const started = act(s, { type: 'startContract', id });
    const seconds = (started.cycle.contract.endsAt - started.savedAt) / 1000;
    const rates = productionRates(started), reward = contractReward(started, id);
    const series = index === 3 ? { credits: Math.ceil(100 * efficiencyMultiplier(started)), intel: Math.ceil(10 * efficiencyMultiplier(started)) } : {};
    const next = advanceFactory(started, started.cycle.contract.endsAt);
    for (const key of Object.keys(next.cycle.resources)) {
      const expected = started.cycle.resources[key] + rates[key] * seconds + (reward[key] ?? 0) + (series[key] ?? 0);
      assert.equal(next.cycle.resources[key], expected, `exact ${key} payout for ${id}`);
    }
    assert.equal(next.cycle.seriesCompleted, index >= 3);
    assert.deepEqual(advanceFactory(next, next.savedAt), next, 'same timestamp cannot pay again');
    s = decodeSave(encodeSave(next));
  }
  assert.equal(s.cycle.contractsCompleted, 6);
  assert.equal(s.cycle.contractTypes.length, 4);
});

test('level 50 cap and rejected upgrades preserve input and resources', () => {
  let s = act(fund(createFactory(0), 1e15), { type: 'chooseRoute', id: 'industrial' });
  for (let level = 1; level < 50; level++) s = act(s, { type: 'upgrade', id: 'automation' });
  assert.equal(s.cycle.buildings.automation, 50);
  const before = encodeSave(s);
  assert.throws(() => act(s, { type: 'upgrade', id: 'automation' }), /nivel máximo/);
  assert.equal(encodeSave(s), before);
  const poor = act(createFactory(0), { type: 'chooseRoute', id: 'industrial' });
  poor.cycle.resources.credits = 0;
  const poorBefore = encodeSave(poor);
  assert.throws(() => act(poor, { type: 'upgrade', id: 'automation' }), /Faltan recursos/);
  assert.equal(encodeSave(poor), poorBefore);
});

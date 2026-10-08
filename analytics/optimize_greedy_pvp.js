import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

// Bounded evolutionary search for a GREEDY-derived policy using only the base Arena engine.
globalThis.window = globalThis;
for (const file of ['public/game/domain/random.js', 'public/game/domain/arena-config.js', 'public/game/domain/arena/match-engine.js']) {
  vm.runInThisContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { filename: file });
}

const { CIVILIZATIONS, BOTS } = FactoryWars.Config;
const strategies = Object.keys(BOTS).filter(key => key !== 'GREEDY');
const civs = Object.keys(CIVILIZATIONS);
const Match = FactoryWars.Match;
const baseDecision = Match.prototype.botDecision;
const genes = {
  ecoUntil: [65, 155], ecoFactor: [1.15, 2.3], factoryAfter: [15, 80],
  defendAfter: [0, 100], defendHP: [0, 340], captureAfter: [30, 125], captureChance: [0.15, 0.85],
  attackAfter: [55, 155], largeAfter: [80, 180], largeBank: [250, 700],
  sabotageAfter: [50, 140], sabotageChance: [0.1, 0.75], specialization: [0, 2],
};
const integerGenes = new Set(['ecoUntil','factoryAfter','defendAfter','defendHP','captureAfter','attackAfter','largeAfter','largeBank','sabotageAfter','specialization']);
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
function randomGenome(rng) {
  const g = {};
  for (const [k, range] of Object.entries(genes)) {
    const v = range[0] + rng() * (range[1] - range[0]);
    g[k] = integerGenes.has(k) ? Math.round(v) : Number(v.toFixed(2));
  }
  return g;
}
function mutate(parent, rng, strength = 1) {
  const child = { ...parent };
  for (const [k, range] of Object.entries(genes)) if (rng() < 0.34) {
    const span = range[1] - range[0];
    const v = child[k] + (rng() + rng() + rng() - 1.5) * span * 0.22 * strength;
    child[k] = integerGenes.has(k) ? Math.round(clamp(v, range)) : Number(clamp(v, range).toFixed(2));
  }
  if (rng() < 0.12) return randomGenome(rng);
  return child;
}
function policy(p) {
  const g = p.botGenome;
  const C = FactoryWars.Config.GAME_CONFIG, o = this.other(p), t = this.t, remain = C.matchDuration - t;
  const threat = this.incoming(p), incomingDamage = threat.reduce((n, x) => n + x.damage, 0), value = incomingDamage - this.shield(p);
  const can = key => this.can(p, key), act = key => this.act(p, key);
  const econPayback = p.level >= 4 ? Infinity : this.cost(p, 'eco') / (C.economicLevels[p.level] - C.economicLevels[p.level - 1]);
  const grow = () => can('eco') && remain > econPayback * g.ecoFactor;
  const defend = () => {
    if (t < g.defendAfter || value <= g.defendHP) return false;
    if (value > 155 && can('defLarge')) return act('defLarge');
    return can('defSmall') && act('defSmall');
  };
  const capture = () => can('capture') && this.owner !== p.id && remain > 29 && act('capture');
  const attack = () => {
    if (!p.factory || t < g.attackAfter) return false;
    if (t >= g.largeAfter && p.bank >= g.largeBank && can('large')) return act('large');
    return can('small') && act('small');
  };
  if (!p.spec && p.level >= C.specializationUnlockLevel && t > 28 && t < 170) {
    const spec = ['specIndustry','specArsenal','specControl'][g.specialization];
    if (can(spec) && this.rand() < 0.42 && act(spec)) return;
  }
  if (defend()) return;
  if (grow() && t < g.ecoUntil && act('eco')) return;
  if (!p.factory && t >= g.factoryAfter && can('factory') && act('factory')) return;
  if (t >= g.captureAfter && this.rand() < g.captureChance && capture()) return;
  if (t >= g.sabotageAfter && o.level >= 2 && this.rand() < g.sabotageChance && can('sabotage') && act('sabotage')) return;
  if (attack()) return;
  if (grow() && act('eco')) return;
  return baseDecision.call(this, p);
}
Match.prototype.botDecision = function (p) {
  if (p.bot === 'GREEDY_OPT') return policy.call(this, p);
  return baseDecision.call(this, p);
};

function run(seed, genome, opponent, civA, civB, optimizedFirst) {
  const botA = optimizedFirst ? 'GREEDY_OPT' : opponent;
  const botB = optimizedFirst ? opponent : 'GREEDY_OPT';
  const match = new Match({ mode: 'bots', civA, civB, botA, botB }, seed);
  const optimized = match.players.find(p => p.bot === 'GREEDY_OPT');
  optimized.botGenome = genome;
  let guard = 0;
  while (!match.ended && guard++ < 1200) match.step(0.5, true);
  const opt = match.players.find(p => p.bot === 'GREEDY_OPT');
  return match.winner === opt.id ? 1 : match.winner === null ? 0.5 : 0;
}
function scoreGenome(genome, generation, candidateIndex) {
  let points = 0, count = 0;
  const byOpponent = {};
  for (let oi = 0; oi < strategies.length; oi++) {
    let subtotal = 0;
    for (let rep = 0; rep < REPS; rep++) {
      const seed = SEARCH_SEED + generation * 1_000_000 + candidateIndex * 10_000 + oi * 100 + rep;
      const civA = civs[(rep + oi) % civs.length], civB = civs[(rep * 3 + oi + 1) % civs.length];
      subtotal += run(seed, genome, strategies[oi], civA, civB, true);
      subtotal += run(seed, genome, strategies[oi], civB, civA, false);
    }
    byOpponent[strategies[oi]] = subtotal / (REPS * 2);
    points += subtotal; count += REPS * 2;
  }
  const rates = Object.values(byOpponent);
  const mean = points / count, worst = Math.min(...rates);
  return { genome, mean, worst, fitness: 0.75 * mean + 0.25 * worst, byOpponent };
}

const REPS = Number(process.env.PVP_REPS || 4);
const POPULATION = Number(process.env.PVP_POPULATION || 36);
const GENERATIONS = Number(process.env.PVP_GENERATIONS || 5);
const SEARCH_SEED = 731100;
let rngState = 0x4f505447;
const rng = () => { rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0; return rngState / 4294967296; };
const started = performance.now();
let population = Array.from({ length: POPULATION }, () => randomGenome(rng));
let best = null, evaluations = 0;
const generationSummaries = [];
for (let gen = 0; gen < GENERATIONS; gen++) {
  const ranked = population.map((g, i) => scoreGenome(g, gen, i)).sort((a, b) => b.fitness - a.fitness);
  evaluations += ranked.length;
  if (!best || ranked[0].fitness > best.fitness) best = ranked[0];
  generationSummaries.push({ generation: gen + 1, topMean: Number(ranked[0].mean.toFixed(4)), topWorst: Number(ranked[0].worst.toFixed(4)), bestSoFar: Number(best.mean.toFixed(4)) });
  const eliteCount = Math.max(4, Math.floor(POPULATION * 0.2));
  const next = ranked.slice(0, eliteCount).map(x => x.genome);
  while (next.length < POPULATION) {
    const parent = ranked[Math.floor(rng() * Math.min(12, ranked.length))].genome;
    next.push(mutate(parent, rng, gen < 2 ? 1 : 0.72));
  }
  population = next;
}

// Independent holdout: compare optimized GREEDY with stock GREEDY and every other bot.
const HOLDOUT_REPS = 20, holdout = {};
for (const opponent of ['GREEDY', ...strategies]) {
  let score = 0;
  for (let rep = 0; rep < HOLDOUT_REPS; rep++) {
    const seed = 9900000 + (opponent === 'GREEDY' ? 0 : strategies.indexOf(opponent) + 1) * 1000 + rep;
    const ca = civs[(rep + strategies.indexOf(opponent) + 1) % civs.length], cb = civs[(rep * 3 + 2) % civs.length];
    score += run(seed, best.genome, opponent, ca, cb, true);
    score += run(seed, best.genome, opponent, cb, ca, false);
  }
  holdout[opponent] = { games: HOLDOUT_REPS * 2, points: score, scoreRate: Number((score / (HOLDOUT_REPS * 2)).toFixed(4)) };
}
const elapsedSeconds = Number(((performance.now() - started) / 1000).toFixed(2));
const result = {
  title: 'GREEDY bounded PvP policy search', createdAt: new Date().toISOString(),
  method: 'Evolutionary random search on base Match engine; no web overlays, industrial modules, doctrines, or persistent empire bonuses. Fitness = 75% overall score rate + 25% weakest-opponent score rate. Each candidate faces all eight non-GREEDY strategies with paired side swaps and rotating civilizations.',
  budget: { elapsedSeconds, maxSeconds: 180, population: POPULATION, generations: GENERATIONS, repsPerOpponentPerCandidate: REPS, candidateEvaluations: evaluations, searchMatches: evaluations * strategies.length * REPS * 2, holdoutRepsPerOpponentAndSide: HOLDOUT_REPS },
  search: { generations: generationSummaries, bestSearchScoreRate: Number(best.mean.toFixed(4)), bestSearchWorstOpponentRate: Number(best.worst.toFixed(4)), bestGenome: best.genome, trainingOpponentScores: best.byOpponent },
  holdout,
};
fs.writeFileSync(new URL('./greedy_pvp_optimization.json', import.meta.url), JSON.stringify(result, null, 2));
const pct = n => `${(n * 100).toFixed(1)}%`;
const lines = ['# Optimización acotada de GREEDY en PvP', '', `- Tiempo: **${elapsedSeconds}s** (límite: 180s)`, `- Búsqueda: ${evaluations} candidatos, ${GENERATIONS} generaciones, ${result.budget.searchMatches.toLocaleString('es-AR')} partidas`, '- Fitness: 75% tasa media de puntos + 25% tasa del peor rival', '- Motor base: sin módulos industriales, doctrinas, overlays web ni bonificaciones persistentes', '- Cada cruce usa lados intercambiados y civilizaciones rotativas.', '', '## Validación independiente', '', '| Rival | Partidas | Puntuación de GREEDY optimizado |', '|---|---:|---:|', ...Object.entries(holdout).map(([bot, x]) => `| ${bot} | ${x.games} | ${pct(x.scoreRate)} |`), '', '## Parámetros encontrados', '', '| Parámetro | Valor |', '|---|---:|', ...Object.entries(best.genome).map(([k, v]) => `| ${k} | ${v} |`), '', `Mejor puntuación media de búsqueda: **${pct(best.mean)}**. Peor cruce en búsqueda: **${pct(best.worst)}**.`, 'La validación usa semillas separadas; los porcentajes son estimaciones y dependen de las políticas actuales de los bots.', ''];
fs.writeFileSync(new URL('./greedy_pvp_optimization.md', import.meta.url), lines.join('\n'));
console.log(JSON.stringify({ elapsedSeconds, evaluations, searchMatches: result.budget.searchMatches, bestSearchScoreRate: best.mean, bestSearchWorstOpponentRate: best.worst, holdout, bestGenome: best.genome }, null, 2));

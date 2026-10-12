import { CATALOG } from '../domain/arena-v2/balance.js';

function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}

// Draft preferences are public; the caller filters unavailable research.
export const BOT_ARCHETYPES = freeze({
  balanced: {
    name: 'Equilibrado', description: 'Combina crecimiento, ataques y defensa; disputa el nodo cuando puede pagarlo.',
    bonusPriority: ['sustained', 'efficiency', 'expansion', 'treasury', 'compound', 'emergency', 'logistics', 'rocketsSlot', 'shieldsSlot', 'sabotageSlot'],
    preferences: {
      rockets: ['fast', 'heavy', 'piercing', 'burst', 'breaker', 'economical', 'exposed', 'vector', 'emp', 'node'],
      shields: ['quick', 'heavy', 'interceptor', 'sustained', 'antiburst', 'antipiercing', 'regenerative', 'reinforced', 'reflection', 'emergency'],
      sabotage: ['economy', 'disrupt', 'production', 'cooldown', 'supplies', 'friction', 'launch', 'precision', 'reconfigure', 'ambush'],
    },
  },
  pressure: {
    name: 'Presión', description: 'Ataca seguido y busca ventanas con pocos escudos para dañar el núcleo.',
    bonusPriority: ['treasury', 'emergency', 'sustained', 'rocketsSlot', 'expansion', 'efficiency', 'logistics', 'compound', 'sabotageSlot', 'shieldsSlot'],
    preferences: {
      rockets: ['fast', 'burst', 'exposed', 'heavy', 'piercing', 'economical', 'vector', 'breaker', 'emp', 'node'],
      shields: ['quick', 'reinforced', 'interceptor', 'heavy', 'sustained', 'antiburst', 'antipiercing', 'emergency', 'reflection', 'regenerative'],
      sabotage: ['disrupt', 'supplies', 'precision', 'cooldown', 'economy', 'production', 'launch', 'friction', 'reconfigure', 'ambush'],
    },
  },
  economy: {
    name: 'Economista', description: 'Ahorra para mejorar ingresos y aumenta la presión después de desarrollar su economía.',
    bonusPriority: ['efficiency', 'sustained', 'compound', 'treasury', 'emergency', 'expansion', 'shieldsSlot', 'logistics', 'rocketsSlot', 'sabotageSlot'],
    preferences: {
      rockets: ['economical', 'fast', 'heavy', 'piercing', 'burst', 'exposed', 'vector', 'breaker', 'emp', 'node'],
      shields: ['quick', 'sustained', 'heavy', 'regenerative', 'interceptor', 'antiburst', 'antipiercing', 'emergency', 'reinforced', 'reflection'],
      sabotage: ['economy', 'friction', 'production', 'launch', 'supplies', 'cooldown', 'disrupt', 'precision', 'ambush', 'reconfigure'],
    },
  },
  defense: {
    name: 'Defensor', description: 'Prioriza cubrir impactos y conservar vida; adapta defensas al ataque visible del rival.',
    bonusPriority: ['compound', 'sustained', 'shieldsSlot', 'efficiency', 'emergency', 'treasury', 'expansion', 'logistics', 'rocketsSlot', 'sabotageSlot'],
    preferences: {
      rockets: ['piercing', 'heavy', 'fast', 'burst', 'economical', 'breaker', 'vector', 'exposed', 'emp', 'node'],
      shields: ['quick', 'heavy', 'interceptor', 'regenerative', 'antiburst', 'antipiercing', 'sustained', 'reinforced', 'emergency', 'reflection'],
      sabotage: ['launch', 'cooldown', 'economy', 'production', 'precision', 'supplies', 'disrupt', 'ambush', 'friction', 'reconfigure'],
    },
  },
  node: {
    name: 'Control del nodo', description: 'Invierte en guardianes y protege el control necesario para obtener Energía adicional.',
    bonusPriority: ['logistics', 'expansion', 'sustained', 'efficiency', 'treasury', 'emergency', 'rocketsSlot', 'shieldsSlot', 'sabotageSlot', 'compound'],
    preferences: {
      rockets: ['node', 'fast', 'heavy', 'emp', 'piercing', 'burst', 'economical', 'breaker', 'exposed', 'vector'],
      shields: ['quick', 'sustained', 'heavy', 'interceptor', 'regenerative', 'antiburst', 'antipiercing', 'reinforced', 'emergency', 'reflection'],
      sabotage: ['ambush', 'economy', 'production', 'launch', 'cooldown', 'supplies', 'disrupt', 'friction', 'precision', 'reconfigure'],
    },
  },
  saboteur: {
    name: 'Saboteador', description: 'Busca frenar ingresos, recargas y reconfiguraciones, y combina sabotajes con ataques.',
    bonusPriority: ['sabotageSlot', 'sustained', 'expansion', 'treasury', 'efficiency', 'emergency', 'rocketsSlot', 'shieldsSlot', 'logistics', 'compound'],
    preferences: {
      rockets: ['emp', 'fast', 'piercing', 'heavy', 'burst', 'breaker', 'economical', 'node', 'vector', 'exposed'],
      shields: ['quick', 'interceptor', 'heavy', 'sustained', 'antiburst', 'antipiercing', 'regenerative', 'reinforced', 'emergency', 'reflection'],
      sabotage: ['cooldown', 'economy', 'disrupt', 'production', 'supplies', 'precision', 'reconfigure', 'friction', 'launch', 'ambush'],
    },
  },
});

const PLANS = freeze({
  balanced: { upgrade: 80, target: 2, deadline: 160, attack: 55, defend: 90, sabotage: 52, node: 56, swap: 48 },
  pressure: { upgrade: 52, target: 1, deadline: 65, attack: 85, defend: 76, sabotage: 63, node: 32, swap: 62 },
  economy: { upgrade: 100, target: 3, deadline: 195, attack: 43, defend: 100, sabotage: 48, node: 38, swap: 40 },
  defense: { upgrade: 80, target: 2, deadline: 165, attack: 47, defend: 115, sabotage: 55, node: 42, swap: 65 },
  node: { upgrade: 74, target: 2, deadline: 170, attack: 46, defend: 90, sabotage: 57, node: 105, swap: 70 },
  saboteur: { upgrade: 76, target: 2, deadline: 150, attack: 55, defend: 88, sabotage: 85, node: 45, swap: 65 },
});
const shieldCapacity = player => player.shields.reduce((sum, shield) => sum + shield.capacity, 0);

function forecastCoreDamage(player, incoming, state, config, candidate = null) {
  const shields = player.shields.map(shield => ({
    variant: shield.variant, capacity: shield.capacity, reduction: shield.reduction,
    weakening: shield.weakening ?? 0, startsAt: 0, endsAt: shield.remaining, ready: true, id: -1,
  }));
  for (const flight of state.flights.filter(item => item.kind === 'shield' && item.player === player.index)) {
    const variant = CATALOG.shields[flight.variant];
    shields.push({ variant: flight.variant,
      capacity: 0, rawCapacity: variant.capacity * (flight.power ?? 1), reduction: variant.reduction,
      weakening: 0, startsAt: Math.max(0, flight.at - state.time),
      endsAt: Math.max(0, flight.at - state.time) + variant.duration, ready: false, id: flight.id });
  }
  if (candidate) {
    const variant = CATALOG.shields[candidate.id];
    const delay = variant.delay + (player.effects.find(effect => effect.kind === 'shieldDelay')?.delay ?? 0);
    shields.push({ variant: candidate.id, capacity: 0, rawCapacity: variant.capacity,
      reduction: variant.reduction, weakening: 0, startsAt: delay, endsAt: delay + variant.duration,
      ready: false, id: Number.MAX_SAFE_INTEGER });
  }
  let total = 0;
  for (const flight of [...incoming].sort((a, b) => a.at - b.at || a.id - b.id)) {
    const at = flight.at - state.time;
    for (const shield of shields.filter(item => !item.ready &&
      (item.startsAt < at || (item.startsAt === at && item.id < flight.id)))
      .sort((a, b) => a.startsAt - b.startsAt || a.id - b.id)) {
      const occupied = shields.filter(item => item.ready && item.capacity > 1e-9 &&
        shield.startsAt >= item.startsAt && shield.startsAt < item.endsAt)
        .reduce((sum, item) => sum + item.capacity, 0);
      shield.capacity = Math.min(shield.rawCapacity, Math.max(0, config.maxShield - occupied));
      shield.ready = true;
    }
    const active = shields.filter(shield => shield.capacity > 1e-9 && at >= shield.startsAt && at < shield.endsAt);
    const rocket = CATALOG.rockets[flight.variant];
    const damage = flight.damage * (!active.length ? rocket.exposedMultiplier ?? 1 : 1);
    const protection = active.reduce((best, shield) => Math.max(best, CATALOG.shields[shield.variant].bypassReduction ?? 0), 0);
    const direct = damage * flight.bypass * (1 - protection);
    let absorbedDamage = damage - direct;
    for (const shield of active) {
      if (absorbedDamage <= 0) break;
      const defense = CATALOG.shields[shield.variant];
      const reduction = rocket.shots > 1 ? Math.max(shield.reduction, defense.multiReduction ?? 0) : shield.reduction;
      const depletion = (1 - reduction) * (rocket.shieldMultiplier ?? 1) * (defense.capacityMultiplier ?? 1) / (1 - shield.weakening);
      const absorbed = Math.min(absorbedDamage, shield.capacity / depletion);
      shield.capacity = Math.max(0, shield.capacity - absorbed * depletion);
      absorbedDamage -= absorbed;
    }
    total += Math.max(0, absorbedDamage + direct);
  }
  return total;
}

// Seed and elapsed simulation time are injected. No private match state is read.
export class ArenaPracticeBot {
  constructor(seed = 1, player = 1, archetype = 'balanced') {
    this.seed = (Number(seed) >>> 0) || 1;
    this.player = player;
    this.archetype = Object.hasOwn(BOT_ARCHETYPES, archetype) ? archetype : 'balanced';
    this.nextThink = 0;
  }

  random() {
    let x = this.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  variantScore(family, id, own, enemy, state) {
    const order = BOT_ARCHETYPES[this.archetype].preferences[family];
    const variant = CATALOG[family][id];
    let score = (order.length - order.indexOf(id)) * 2;
    if (family === 'rockets') {
      const protectedEnemy = shieldCapacity(enemy) > 100;
      if (protectedEnemy && id === 'piercing') score += 35;
      if (protectedEnemy && id === 'breaker') score += 30;
      if (!protectedEnemy && id === 'exposed') score += 30;
      if (state.time > 210 && id === 'fast') score += 15;
      if (own.level === 0 && id === 'economical') score += 18;
    } else if (family === 'shields') {
      if (enemy.active.rockets.some(rocket => CATALOG.rockets[rocket].shots > 1) && id === 'antiburst') score += 40;
      if (enemy.active.rockets.some(rocket => CATALOG.rockets[rocket].bypass > 0) && id === 'antipiercing') score += 40;
      if (own.core < 400 && id === 'quick') score += 20;
      if (variant.emergencyThreshold && (own.emergencyUsed || own.emergencyArmed)) score -= 80;
    } else {
      if (id === 'disrupt') score += shieldCapacity(enemy) > 100 ? 25 : -25;
      if (id === 'production') score += enemy.level > 0 ? 20 : -25;
      if (id === 'friction') score += enemy.level < 2 && state.time < 140 ? 20 : -25;
      if (id === 'reconfigure') score += enemy.pending ? 45 : -25;
      if (id === 'ambush') score += state.node.owner === this.player ? 20 : -10;
    }
    return score;
  }

  think(match) {
    const state = match.snapshot(this.player);
    if (state.status !== 'playing' || state.time + 1e-9 < this.nextThink) return;
    this.nextThink = state.time + 1;
    const own = state.players[this.player], enemy = state.players[1 - this.player];
    const plan = PLANS[this.archetype], options = [];
    const upgradeQuote = match.quote(this.player, { type: 'upgrade' });
    const upgradeCost = upgradeQuote.credits ?? Infinity;
    const add = (command, score, saving = false) => {
      const quote = match.quote(this.player, command);
      if (score > 0 && quote.ok && (!saving || own.credits - quote.credits >= upgradeCost)) {
        options.push({ command, score: score + this.random() * 3 });
      }
    };
    const wantsUpgrade = own.level < Math.min(plan.target, match.config.incomeLevels.length - 1) &&
      state.time < Math.min(plan.deadline, match.config.duration - 50);
    // Save instead of spending each income tick before an economic upgrade is affordable.
    const saving = wantsUpgrade && own.credits < upgradeCost;
    if (wantsUpgrade) add({ type: 'upgrade' }, plan.upgrade);

    const incoming = state.flights.filter(flight => flight.kind === 'rocket' && flight.player !== this.player && flight.at - state.time <= 8);
    const imminentAt = incoming.length ? Math.min(...incoming.map(flight => flight.at)) : Infinity;
    const uncovered = forecastCoreDamage({ ...own, index: this.player }, incoming, state, match.config);
    const lethal = uncovered >= own.core;
    for (let slot = 0; slot < own.active.shields.length; slot++) {
      const id = own.active.shields[slot], variant = CATALOG.shields[id];
      if (variant.emergencyThreshold) {
        const urgent = own.core < match.config.coreHP * 0.55;
        if (!own.emergencyArmed && !own.emergencyUsed) add({ type: 'use', family: 'shields', slot }, urgent ? 130 : 35, saving && !urgent);
        continue;
      }
      const projected = forecastCoreDamage({ ...own, index: this.player }, incoming, state, match.config, { id });
      const prevented = uncovered - projected;
      if (prevented > (lethal ? 0 : 15)) {
        const deployAt = state.time + variant.delay + (own.effects.find(effect => effect.kind === 'shieldDelay')?.delay ?? 0);
        const timely = deployAt <= imminentAt;
        const savesLethal = lethal && projected < own.core;
        const score = plan.defend + Math.min(35, prevented / 8) + (savesLethal && timely ? 70 : 0) + (timely ? 20 : 0) + this.variantScore('shields', id, own, enemy, state) / 4;
        add({ type: 'use', family: 'shields', slot }, score);
      }
    }

    // Include visible guardian flights, avoiding duplicate orders for the same capture.
    const arriving = state.flights.filter(flight => flight.kind === 'guardians');
    const friendly = arriving.filter(flight => flight.player === this.player).reduce((sum, flight) => sum + flight.count, 0);
    const hostile = arriving.filter(flight => flight.player !== this.player).reduce((sum, flight) => sum + flight.count, 0);
    const owned = state.node.owner === this.player;
    const required = owned ? hostile - state.node.guardians - friendly + 1 : state.node.guardians + hostile - friendly + 1;
    if (required > 0 && (owned ? hostile > 0 : true) && own.extracted < match.config.nodeEnergyCap && state.time < match.config.duration - 25) {
      const count = Math.min(match.config.maxGuardiansPerSend, required);
      add({ type: 'guardians', count }, plan.node + (owned ? 10 : 0), saving && this.archetype !== 'node');
    }

    for (let slot = 0; slot < own.active.sabotage.length; slot++) {
      const id = own.active.sabotage[slot], variant = CATALOG.sabotage[id];
      const command = { type: 'use', family: 'sabotage', slot };
      // Target visible active tools, never the rival's reserved replacement.
      if (variant.targeted) command.targetFamily = incoming.length && this.archetype === 'defense' ? 'rockets' : shieldCapacity(enemy) > 100 ? 'shields' : 'rockets';
      if (variant.slotTargeted) {
        command.targetSlot = enemy.active[command.targetFamily].reduce((best, active, index, list) =>
          this.variantScore(command.targetFamily, active, enemy, own, state) > this.variantScore(command.targetFamily, list[best], enemy, own, state) ? index : best, 0);
      }
      const effectExists = enemy.effects.some(effect => effect.kind === variant.effect && (!variant.targeted || effect.family === command.targetFamily));
      if (effectExists || (id === 'disrupt' && shieldCapacity(enemy) === 0) || (id === 'production' && enemy.level === 0) ||
          (id === 'friction' && (enemy.level === match.config.incomeLevels.length - 1 || state.time > 200)) ||
          (id === 'ambush' && !owned) || (id === 'reconfigure' && !enemy.pending)) continue;
      const launchReady = own.active.rockets.some((rocket, index) => own.cooldowns.rockets[index] <= 2);
      add(command, plan.sabotage + this.variantScore('sabotage', id, own, enemy, state) / 3 + (id === 'disrupt' && launchReady ? 15 : 0), saving);
    }

    for (let slot = 0; slot < own.active.rockets.length; slot++) {
      const id = own.active.rockets[slot], variant = CATALOG.rockets[id];
      if (state.time + variant.travel > match.config.duration) continue;
      const score = plan.attack + this.variantScore('rockets', id, own, enemy, state) / 3 +
        Math.min(15, variant.damage * variant.shots / variant.cost * 8) + (enemy.core <= variant.damage * variant.shots ? 20 : 0);
      add({ type: 'use', family: 'rockets', slot }, score, saving);
    }

    // Change only for a visible improvement. The engine retains cooldowns and enforces one swap per family.
    if (!own.pending && state.time >= 45 && state.time < match.config.duration - match.config.swapDuration - 15) {
      for (const family of ['rockets', 'shields', 'sabotage']) {
        if (own.changed[family] || !own.reserve[family].length || (family === 'shields' && incoming.length)) continue;
        for (const variant of own.reserve[family]) {
          for (let slot = 0; slot < own.active[family].length; slot++) {
            const pendingSwapDiscount = id => family === 'sabotage' && id === 'reconfigure' &&
              (!enemy.pending || enemy.pending.remaining <= match.config.swapDuration) ? -70 : 0;
            const gain = this.variantScore(family, variant, own, enemy, state) + pendingSwapDiscount(variant) -
              this.variantScore(family, own.active[family][slot], own, enemy, state) - pendingSwapDiscount(own.active[family][slot]);
            if (gain >= 12) add({ type: 'swap', family, slot, variant }, plan.swap + gain / 2);
          }
        }
      }
    }
    options.sort((a, b) => b.score - a.score);
    for (const { command } of options) if (match.dispatch(this.player, command).ok) return;
  }
}

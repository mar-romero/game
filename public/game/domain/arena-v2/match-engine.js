import { BALANCE, BONUSES, CATALOG, FAMILIES, LIST_COUNTS, SLOT_COUNTS, defaultLoadout } from './balance.js';

const clone = value => JSON.parse(JSON.stringify(value));
const validPlayer = index => index === 0 || index === 1;

// incomingBans contains the opponent's bans against THIS loadout.
export function resolveLoadout(loadout, incomingBans = {}, unlocks = null) {
  if (!loadout || !Object.hasOwn(BONUSES, loadout.bonus)) throw new Error('Bonus inválido.');
  if (unlocks && (!Array.isArray(unlocks.bonuses) || !unlocks.bonuses.includes(loadout.bonus))) throw new Error('Bonus no investigado.');
  const resolved = { bonus: loadout.bonus, candidates: {}, active: {}, reserve: {} };
  for (const family of FAMILIES) {
    const list = loadout.candidates?.[family];
    if (!Array.isArray(list) || list.length !== LIST_COUNTS[family] || new Set(list).size !== list.length) {
      throw new Error(`Lista inválida: ${family}.`);
    }
    if (list.some(id => !Object.hasOwn(CATALOG[family], id) || (unlocks && !unlocks[family]?.includes(id)))) {
      throw new Error(`Opción no investigada o desconocida: ${family}.`);
    }
    const ban = incomingBans[family];
    if (ban != null && !Object.hasOwn(CATALOG[family], ban)) throw new Error(`Bloqueo inválido: ${family}.`);
    const available = list.filter(id => id !== ban).slice(0, 3);
    const slots = SLOT_COUNTS[family] + (BONUSES[loadout.bonus].extraFamily === family ? 1 : 0);
    resolved.candidates[family] = available;
    resolved.active[family] = available.slice(0, slots);
    resolved.reserve[family] = available.slice(slots);
  }
  return resolved;
}

function validateConfig(config) {
  for (const key of ['duration', 'tick', 'coreHP', 'swapCost', 'swapDuration', 'nodeControlSeconds', 'guardianTravel', 'guardianCooldown', 'guardianCost', 'factoryCost']) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) throw new Error(`Configuración inválida: ${key}.`);
  }
  for (const key of ['startingEnergy', 'nodeEnergyCap', 'startingCredits', 'factoryIncome', 'maxShield']) {
    if (!Number.isFinite(config[key]) || config[key] < 0) throw new Error(`Configuración inválida: ${key}.`);
  }
  for (const key of ['maxFactories', 'maxGuardiansPerSend']) {
    if (!Number.isInteger(config[key]) || config[key] < 1) throw new Error(`Configuración inválida: ${key}.`);
  }
  if (!Array.isArray(config.incomeLevels) || !config.incomeLevels.length || config.incomeLevels.some(n => !Number.isFinite(n) || n < 0) ||
      !Array.isArray(config.upgradeCosts) || config.upgradeCosts.length !== config.incomeLevels.length - 1 || config.upgradeCosts.some(n => !Number.isFinite(n) || n <= 0)) {
    throw new Error('Niveles económicos inválidos.');
  }
}

export class ArenaMatch {
  constructor({ loadouts = [defaultLoadout(), defaultLoadout()], bans = [{}, {}], unlocks = [null, null], config = {} } = {}) {
    if (loadouts.length !== 2 || bans.length !== 2 || unlocks.length !== 2) throw new Error('Se requieren dos jugadores.');
    this.config = clone({ ...BALANCE, ...config });
    validateConfig(this.config);
    this.accumulator = 0;
    this.sequence = 0;
    this.state = {
      version: 2, time: 0, status: 'playing', winner: null, reason: null,
      node: { owner: null, guardians: 0 }, flights: [], events: [],
      players: loadouts.map((loadout, index) => {
        const resolved = resolveLoadout(loadout, bans[1 - index], unlocks[index]);
        return {
          ...resolved,
          core: this.config.coreHP, credits: this.config.startingCredits + (resolved.bonus === 'treasury' ? 80 : 0), energy: this.config.startingEnergy,
          extracted: 0, controlSeconds: 0, level: 0, factories: 1, peacefulSeconds: 0,
          changed: Object.fromEntries(FAMILIES.map(f => [f, false])),
          cooldowns: Object.fromEntries(FAMILIES.map(f => [f, Array(resolved.active[f].length).fill(0)])),
          pending: null, shields: [], effects: [], guardianCooldown: 0,
          reserveBonusUsed: false, emergencyArmed: false, emergencyUsed: false,
        };
      }),
    };
  }

  snapshot(viewer = null) {
    if (viewer !== null && !validPlayer(viewer)) throw new Error('Jugador inválido.');
    const copy = clone(this.state);
    if (viewer !== null) {
      // Announce the family, reveal destination only when the replacement finishes.
      const opponent = copy.players[1 - viewer];
      if (opponent.pending) delete opponent.pending.variant;
      delete opponent.reserve;
      delete opponent.candidates;
    }
    return copy;
  }

  _event(type, player, detail) {
    this.state.events.push({ id: ++this.sequence, time: this.state.time, type, player, detail });
    if (this.state.events.length > 100) this.state.events.shift();
  }

  income(index) {
    const p = this.state.players[index];
    let multiplier = p.bonus === 'expansion' && this.state.time < 90 ? 1.2 : 1;
    if (p.bonus === 'sustained') multiplier = 1.15;
    if (p.bonus === 'compound') multiplier += Math.min(0.35, p.peacefulSeconds * 0.0012);
    for (const effect of p.effects) if (effect.kind === 'income') multiplier *= 1 - effect.penalty;
    const industrial = p.effects.find(effect => effect.kind === 'factoryIncome');
    return (this.config.incomeLevels[p.level] + (p.factories - 1) * this.config.factoryIncome * (industrial ? 1 - industrial.penalty : 1)) * multiplier;
  }

  quote(index, command) {
    if (!validPlayer(index) || !command || typeof command !== 'object') return { ok: false, error: 'Comando inválido.' };
    const p = this.state.players[index], c = this.config;
    if (this.state.status !== 'playing') return { ok: false, error: 'La partida terminó.' };
    let credits = 0, energy = 0;
    switch (command.type) {
      case 'use': {
        const { family, slot } = command;
        if (!FAMILIES.includes(family) || !Number.isInteger(slot) || !p.active[family][slot]) return { ok: false, error: 'Acción inválida.' };
        if (p.cooldowns[family][slot] > 0) return { ok: false, error: 'Acción recargando.' };
        const variant = CATALOG[family][p.active[family][slot]];
        if (variant.emergencyThreshold && (p.emergencyArmed || p.emergencyUsed)) return { ok: false, error: 'Emergencia ya armada o consumida.' };
        if (family === 'sabotage') {
          const enemy = this.state.players[1 - index];
          if (variant.effect === 'swapDelay' && !enemy.pending) return { ok: false, error: 'El rival no está reconfigurando.' };
          if (variant.targeted && !FAMILIES.includes(command.targetFamily)) return { ok: false, error: 'Elegí una familia objetivo.' };
          if (variant.slotTargeted && (!['rockets', 'shields'].includes(command.targetFamily) || !Number.isInteger(command.targetSlot) || !enemy.active[command.targetFamily][command.targetSlot])) return { ok: false, error: 'Espacio objetivo inválido.' };
        }
        const surcharge = p.effects.find(effect => effect.kind === 'nextAction' && effect.family === family);
        credits = variant.cost * (surcharge ? 1 + surcharge.penalty : 1);
        break;
      }
      case 'swap': {
        const { family, slot, variant } = command;
        if (!FAMILIES.includes(family) || !Number.isInteger(slot) || !p.active[family][slot] || !p.reserve[family].includes(variant)) return { ok: false, error: 'Reemplazo inválido.' };
        if (p.changed[family] || p.pending) return { ok: false, error: 'Familia ya cambiada o cambio en curso.' };
        energy = c.swapCost;
        break;
      }
      case 'upgrade':
        if (p.level >= c.incomeLevels.length - 1) return { ok: false, error: 'Economía al máximo.' };
        credits = c.upgradeCosts[p.level] * (p.bonus === 'efficiency' ? 0.88 : 1);
        break;
      case 'factory':
        if (p.factories >= c.maxFactories) return { ok: false, error: 'Máximo de fábricas.' };
        credits = c.factoryCost * (p.bonus === 'efficiency' ? 0.88 : 1);
        const friction = p.effects.find(effect => effect.kind === 'nextFactory');
        if (friction) credits *= 1 + friction.penalty;
        break;
      case 'guardians':
        if (!Number.isInteger(command.count) || command.count < 1 || command.count > c.maxGuardiansPerSend) return { ok: false, error: 'Cantidad de guardianes inválida.' };
        if (p.guardianCooldown > 0) return { ok: false, error: 'Guardianes recargando.' };
        credits = c.guardianCost * command.count * (p.bonus === 'logistics' ? 0.75 : 1);
        break;
      default: return { ok: false, error: 'Comando desconocido.' };
    }
    if (p.credits + 1e-9 < credits) return { ok: false, error: 'Faltan Créditos.', credits, energy };
    if (p.energy + 1e-9 < energy) return { ok: false, error: 'Falta Energía.', credits, energy };
    return { ok: true, credits, energy };
  }

  dispatch(index, command) {
    const result = this.quote(index, command);
    if (!result.ok) return result;
    const p = this.state.players[index];
    p.credits = Math.max(0, p.credits - result.credits);
    p.energy = Math.max(0, p.energy - result.energy);
    if (command.type === 'upgrade') p.level++;
    else if (command.type === 'factory') {
      p.factories++;
      p.effects = p.effects.filter(effect => effect.kind !== 'nextFactory');
    }
    else if (command.type === 'swap') {
      p.changed[command.family] = true;
      p.pending = { family: command.family, slot: command.slot, variant: command.variant, remaining: this.config.swapDuration };
      this._event('swap-start', index, { family: command.family });
    } else if (command.type === 'guardians') {
      p.guardianCooldown = this.config.guardianCooldown;
      const ambush = p.effects.find(effect => effect.kind === 'nextGuardian');
      const disruption = p.effects.find(effect => effect.kind === 'guardianDelay');
      this.state.flights.push({ id: ++this.sequence, kind: 'guardians', player: index, count: command.count, at: this.state.time + this.config.guardianTravel + (ambush?.delay ?? 0) + (disruption?.delay ?? 0) });
      p.effects = p.effects.filter(effect => effect.kind !== 'nextGuardian');
    } else {
      const { family, slot } = command;
      const id = p.active[family][slot], variant = CATALOG[family][id];
      const weakness = p.effects.find(effect => effect.kind === 'precision' && effect.family === family && effect.slot === slot);
      const power = weakness ? 1 - weakness.penalty : 1;
      p.effects = p.effects.filter(effect => effect.kind !== 'nextAction' || effect.family !== family);
      p.cooldowns[family][slot] = variant.cooldown;
      if (family === 'rockets') {
        const delay = p.effects.find(effect => effect.kind === 'rocketDelay');
        for (let shot = 0; shot < variant.shots; shot++) {
          this.state.flights.push({ id: ++this.sequence, kind: 'rocket', player: index, variant: id, damage: variant.damage * power, bypass: variant.bypass, at: this.state.time + variant.travel + (delay?.delay ?? 0) + shot * (variant.spacing ?? 0.6) });
        }
      } else if (family === 'shields') {
        const delay = p.effects.find(effect => effect.kind === 'shieldDelay');
        const deployment = { id: ++this.sequence, kind: 'shield', player: index, variant: id, power, at: this.state.time + variant.delay + (delay?.delay ?? 0) };
        if (variant.emergencyThreshold) { p.emergencyArmed = true; p.emergencyPower = power; }
        else if (deployment.at === this.state.time) this._arrive(deployment);
        else this.state.flights.push(deployment);
      } else {
        this._sabotage(index, variant, command);
      }
      this._event('action', index, { family, variant: id });
    }
    this._emergency(index);
    return result;
  }

  _effect(player, effect) {
    player.effects = player.effects.filter(old => old.kind !== effect.kind || old.family !== effect.family || old.slot !== effect.slot);
    player.effects.push(effect);
  }

  _sabotage(index, variant, command) {
    const enemy = this.state.players[1 - index];
    if (variant.effect === 'shields') {
      for (const shield of enemy.shields) { shield.weakening = variant.penalty; shield.weakenedFor = variant.duration; }
    } else if (variant.effect === 'swapDelay') {
      enemy.pending.remaining += variant.delay;
    } else {
      this._effect(enemy, { kind: variant.effect, penalty: variant.penalty ?? 0, delay: variant.delay ?? 0, remaining: variant.duration ?? null,
        ...(variant.targeted ? { family: command.targetFamily } : {}), ...(variant.slotTargeted ? { slot: command.targetSlot } : {}) });
    }
  }

  _emergency(index) {
    const p = this.state.players[index];
    if (p.bonus === 'emergency' && !p.reserveBonusUsed && p.credits <= 35) {
      p.reserveBonusUsed = true; p.credits += 100;
      this._event('bonus', index, { bonus: p.bonus });
    }
    const variant = CATALOG.shields.emergency;
    if (p.emergencyArmed && p.core > 0 && p.core <= this.config.coreHP * variant.emergencyThreshold) {
      p.emergencyArmed = false; p.emergencyUsed = true;
      this._arrive({ id: ++this.sequence, kind: 'shield', player: index, variant: 'emergency', power: p.emergencyPower });
      this._event('emergency-shield', index, {});
    }
  }

  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3600) throw new Error('Tiempo inválido; máximo 3600 s por llamada.');
    this.accumulator += seconds;
    while (this.accumulator + 1e-9 >= this.config.tick && this.state.status === 'playing') {
      this.accumulator = Math.max(0, this.accumulator - this.config.tick);
      this._tick(Math.min(this.config.tick, this.config.duration - this.state.time));
    }
    return this.snapshot();
  }

  _tick(dt) {
    const s = this.state;
    for (let index = 0; index < 2; index++) {
      const p = s.players[index];
      p.credits += this.income(index) * dt;
      p.peacefulSeconds += dt;
      for (const family of FAMILIES) {
        const slow = p.effects.find(effect => effect.kind === 'cooldown' && effect.family === family);
        p.cooldowns[family] = p.cooldowns[family].map(n => Math.max(0, n - dt * (slow ? 1 - slow.penalty : 1)));
      }
      p.guardianCooldown = Math.max(0, p.guardianCooldown - dt);
      p.effects.forEach(effect => { if (effect.remaining !== null) effect.remaining -= dt; });
      p.effects = p.effects.filter(effect => effect.remaining === null || effect.remaining > 1e-9);
      p.shields.forEach(shield => {
        shield.remaining -= dt; shield.sinceHit += dt;
        shield.weakenedFor = Math.max(0, shield.weakenedFor - dt);
        if (shield.weakenedFor === 0) shield.weakening = 0;
        const variant = CATALOG.shields[shield.variant];
        if (variant.regen && shield.sinceHit >= variant.regenWait && shield.capacity > 0 && shield.remaining > 0) {
          const room = Math.max(0, this.config.maxShield - p.shields.reduce((sum, item) => sum + item.capacity, 0));
          shield.capacity += Math.min(variant.regen * dt, Math.max(0, shield.maxCapacity - shield.capacity), room);
        }
      });
      p.shields = p.shields.filter(shield => shield.remaining > 1e-9 && shield.capacity > 1e-9);
      if (p.pending) {
        p.pending.remaining -= dt;
        if (p.pending.remaining <= 1e-9) {
          const { family, slot, variant } = p.pending;
          p.active[family][slot] = variant;
          p.reserve[family] = [];
          p.pending = null;
          this._event('swap-complete', index, { family, variant });
        }
      }
      if (s.node.owner === index) {
        p.controlSeconds += dt;
        const target = Math.min(this.config.nodeEnergyCap, p.controlSeconds / this.config.nodeControlSeconds * this.config.nodeEnergyCap);
        p.energy += target - p.extracted;
        p.extracted = target;
      }
      this._emergency(index);
    }
    s.time = Math.min(this.config.duration, Number((s.time + dt).toFixed(9)));
    const due = s.flights.filter(flight => flight.at <= s.time + 1e-9).sort((a, b) => a.at - b.at || a.id - b.id);
    s.flights = s.flights.filter(flight => flight.at > s.time + 1e-9);
    // Resolve all impacts due in this tick before evaluating victory (allows a draw).
    for (const flight of due) this._arrive(flight);
    if (s.players.some(p => p.core <= 0)) this._finish('core');
    else if (s.time + 1e-9 >= this.config.duration) this._finish('timeout');
  }

  _arrive(flight) {
    const s = this.state, p = s.players[flight.player];
    if (flight.kind === 'guardians') {
      const node = s.node;
      if (node.owner === null || node.owner === flight.player) {
        node.owner = flight.player;
        node.guardians += flight.count;
      } else if (flight.count === node.guardians) {
        node.owner = null; node.guardians = 0;
      } else if (flight.count > node.guardians) {
        node.owner = flight.player; node.guardians = flight.count - node.guardians;
      } else node.guardians -= flight.count;
      this._event('node', flight.player, clone(node));
    } else if (flight.kind === 'shield') {
      const variant = CATALOG.shields[flight.variant];
      const capacity = Math.max(0, Math.min(variant.capacity * (flight.power ?? 1), this.config.maxShield - p.shields.reduce((total, shield) => total + shield.capacity, 0)));
      if (capacity > 0) p.shields.push({ variant: flight.variant, capacity, maxCapacity: capacity, reduction: variant.reduction,
        remaining: variant.duration, sinceHit: 0, weakening: 0, weakenedFor: 0 });
    } else {
      const enemy = s.players[1 - flight.player];
      const variant = CATALOG.rockets[flight.variant];
      const shields = enemy.shields.filter(shield => shield.capacity > 1e-9 && shield.remaining > 1e-9);
      const totalDamage = flight.damage * (!shields.length ? variant.exposedMultiplier ?? 1 : 1);
      const protection = shields.reduce((best, shield) => Math.max(best, CATALOG.shields[shield.variant].bypassReduction ?? 0), 0);
      const direct = totalDamage * flight.bypass * (1 - protection);
      let damage = totalDamage - direct;
      for (const shield of enemy.shields) {
        if (damage <= 0) break;
        if (shield.capacity <= 1e-9 || shield.remaining <= 1e-9) continue;
        const defense = CATALOG.shields[shield.variant];
        const reduction = variant.shots > 1 ? Math.max(shield.reduction, defense.multiReduction ?? 0) : shield.reduction;
        const depletion = (1 - reduction) * (variant.shieldMultiplier ?? 1) * (defense.capacityMultiplier ?? 1) / (1 - shield.weakening);
        const absorbed = Math.min(damage, shield.capacity / depletion);
        shield.capacity = Math.max(0, shield.capacity - absorbed * depletion);
        shield.sinceHit = 0;
        damage -= absorbed;
        if (defense.reflect) {
          const reflected = absorbed * defense.reflect;
          p.core = Math.max(0, p.core - reflected); p.peacefulSeconds = 0;
          this._event('reflection', 1 - flight.player, { coreDamage: reflected });
        }
      }
      const coreDamage = Math.max(0, damage + direct);
      enemy.core = Math.max(0, enemy.core - coreDamage);
      if (coreDamage > 0) enemy.peacefulSeconds = 0;
      for (const [kind, delay] of [['shieldDelay', variant.shieldDelay], ['guardianDelay', variant.guardianDelay]]) {
        if (!delay) continue;
        // Repeated impacts refresh the effect; they do not repeatedly delay the same flights while it is active.
        if (!enemy.effects.some(effect => effect.kind === kind)) {
          for (const pending of s.flights) if (pending.player === 1 - flight.player && pending.kind === (kind === 'shieldDelay' ? 'shield' : 'guardians')) pending.at += delay;
        }
        this._effect(enemy, { kind, delay, remaining: variant.effectDuration });
      }
      this._emergency(1 - flight.player);
      this._emergency(flight.player);
      this._event('impact', flight.player, { variant: flight.variant, coreDamage });
    }
  }

  _finish(reason) {
    const s = this.state, [a, b] = s.players;
    s.status = 'finished'; s.reason = reason;
    s.winner = a.core === b.core ? null : a.core > b.core ? 0 : 1;
    this._event('finished', s.winner, { reason });
  }
}

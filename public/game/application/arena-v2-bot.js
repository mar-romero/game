import { CATALOG } from '../domain/arena-v2/balance.js';

// Local practice opponent. Seed and elapsed simulation time are injected.
export class ArenaPracticeBot {
  constructor(seed = 1, player = 1) {
    this.seed = (Number(seed) >>> 0) || 1;
    this.player = player;
    this.nextThink = 0;
  }

  random() {
    let x = this.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  think(match) {
    const state = match.snapshot(this.player);
    if (state.status !== 'playing' || state.time + 1e-9 < this.nextThink) return;
    this.nextThink = state.time + 1;
    const p = state.players[this.player];
    const act = command => match.dispatch(this.player, command).ok;
    const emergencySlot = p.active.shields.indexOf('emergency');
    if (emergencySlot !== -1 && !p.emergencyArmed && !p.emergencyUsed && act({ type: 'use', family: 'shields', slot: emergencySlot })) return;
    const incoming = state.flights.some(f => f.kind === 'rocket' && f.player !== this.player && f.at - state.time < 5);
    if (incoming && p.shields.reduce((sum, shield) => sum + shield.capacity, 0) < 120) {
      for (let slot = 0; slot < p.active.shields.length; slot++) if (act({ type: 'use', family: 'shields', slot })) return;
    }
    if (state.time > 90 && !p.pending && p.energy + 1e-9 >= match.config.swapCost) {
      const order = incoming ? ['shields', 'rockets', 'sabotage'] : ['rockets', 'sabotage', 'shields'];
      const family = order.find(f => !p.changed[f] && p.reserve[f].length);
      if (family && act({ type: 'swap', family, slot: 0, variant: p.reserve[family][0] })) return;
    }
    if (state.time > 15 && state.time < 240 && state.node.owner !== this.player && p.extracted < match.config.nodeEnergyCap) {
      const count = Math.min(match.config.maxGuardiansPerSend, state.node.guardians + 1);
      if (act({ type: 'guardians', count })) return;
    }
    if (state.time < 120 && p.level < 2 && this.random() < 0.6 && act({ type: 'upgrade' })) return;
    if (this.random() < 0.2) {
      for (let slot = 0; slot < p.active.sabotage.length; slot++) {
        const variant = CATALOG.sabotage[p.active.sabotage[slot]];
        const command = { type: 'use', family: 'sabotage', slot };
        if (variant.targeted) command.targetFamily = incoming ? 'rockets' : 'shields';
        if (variant.slotTargeted) command.targetSlot = 0;
        if (act(command)) return;
      }
    }
    const slot = Math.floor(this.random() * p.active.rockets.length);
    if (act({ type: 'use', family: 'rockets', slot })) return;
    if (state.time < 100 && p.factories < match.config.maxFactories) act({ type: 'factory' });
  }
}

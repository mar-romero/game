// Provisional starting balance; independent of the legacy Arena configuration.
function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  return Object.freeze(value);
}
export const BALANCE = freeze({
  duration: 300, tick: 0.1, coreHP: 1000, startingCredits: 240,
  startingEnergy: 100, swapCost: 40, swapDuration: 5,
  nodeEnergyCap: 20, nodeControlSeconds: 180, guardianCost: 65,
  guardianTravel: 8, guardianCooldown: 8, maxGuardiansPerSend: 5,
  incomeLevels: [9, 15, 24, 38], upgradeCosts: [165, 360, 720],
  factoryCost: 180, factoryIncome: 3, maxFactories: 3, maxShield: 470,
});

export const FAMILIES = Object.freeze(['rockets', 'shields', 'sabotage']);
export const SLOT_COUNTS = Object.freeze({ rockets: 2, shields: 2, sabotage: 1 });
export const LIST_COUNTS = Object.freeze({ rockets: 4, shields: 4, sabotage: 3 });
export const CATALOG = freeze({
  rockets: {
    fast: { name: 'Rastreador', cost: 110, cooldown: 10, damage: 120, travel: 4, shots: 1, bypass: 0, detail: 'Llega en 4 s; 120 de daño.' },
    heavy: { name: 'Asedio', cost: 275, cooldown: 18, damage: 300, travel: 10, shots: 1, bypass: 0, detail: '300 de daño; viaja 10 s.' },
    burst: { name: 'Ráfaga', cost: 190, cooldown: 14, damage: 75, travel: 6, shots: 3, bypass: 0, detail: 'Tres impactos separados.' },
    piercing: { name: 'Perforante', cost: 205, cooldown: 16, damage: 170, travel: 8, shots: 1, bypass: 0.45, detail: '45% del daño atraviesa escudos.' },
    breaker: { name: 'Rompeescudos', cost: 165, cooldown: 16, damage: 90, travel: 7, shots: 1, bypass: 0, shieldMultiplier: 2.5, detail: '90 al núcleo; consume 2,5 veces más capacidad de escudo.' },
    emp: { name: 'Pulso EMP', cost: 135, cooldown: 22, damage: 35, travel: 5, shots: 1, bypass: 0, shieldDelay: 3, effectDuration: 6, detail: '35 de daño; retrasa 3 s escudos en activación y los iniciados durante 6 s.' },
    vector: { name: 'Doble vector', cost: 225, cooldown: 17, damage: 125, travel: 6, shots: 2, spacing: 2, bypass: 0, detail: 'Dos impactos de 125 separados por 2 s.' },
    exposed: { name: 'Carga de núcleo', cost: 195, cooldown: 18, damage: 140, travel: 8, shots: 1, bypass: 0, exposedMultiplier: 1.8, detail: '140 de daño; 252 si llega sin escudos activos.' },
    economical: { name: 'Cohete económico', cost: 60, cooldown: 19, damage: 70, travel: 7, shots: 1, bypass: 0, detail: '70 de daño por 60 Créditos; recarga 19 s.' },
    node: { name: 'Disruptor de nodo', cost: 125, cooldown: 24, damage: 40, travel: 6, shots: 1, bypass: 0, guardianDelay: 3, effectDuration: 8, detail: '40 de daño; retrasa 3 s guardianes en tránsito y los enviados durante 8 s.' },
  },
  shields: {
    quick: { name: 'Carga rápida', cost: 90, cooldown: 12, capacity: 145, duration: 12, delay: 0, reduction: 0, detail: '145 de capacidad inmediata por 12 s.' },
    heavy: { name: 'Barrera pesada', cost: 210, cooldown: 22, capacity: 330, duration: 24, delay: 4, reduction: 0, detail: '330 de capacidad; activa en 4 s.' },
    interceptor: { name: 'Interceptor', cost: 140, cooldown: 18, capacity: 160, duration: 18, delay: 1, reduction: 0.25, detail: 'Reduce cada impacto absorbido un 25%.' },
    sustained: { name: 'Sostenido', cost: 155, cooldown: 20, capacity: 210, duration: 35, delay: 2, reduction: 0, detail: 'Duración larga; capacidad intermedia.' },
    antiburst: { name: 'Antirráfaga', cost: 155, cooldown: 19, capacity: 180, duration: 20, delay: 1, reduction: 0, multiReduction: 0.45, detail: '180 de capacidad; reduce 45% los impactos de cohetes múltiples.' },
    antipiercing: { name: 'Antiperforante', cost: 150, cooldown: 20, capacity: 170, duration: 18, delay: 1, reduction: 0, bypassReduction: 0.7, detail: '170 de capacidad; devuelve al escudo 70% del daño perforante.' },
    regenerative: { name: 'Reactor regenerativo', cost: 165, cooldown: 23, capacity: 170, duration: 30, delay: 2, reduction: 0, regen: 8, regenWait: 3, detail: '170 de capacidad; regenera 8/s tras 3 s sin impactos, hasta su capacidad inicial.' },
    reflection: { name: 'Escudo reflejo', cost: 175, cooldown: 22, capacity: 155, duration: 18, delay: 2, reduction: 0, reflect: 0.2, capacityMultiplier: 1.2, detail: 'Devuelve 20% del daño absorbido al núcleo rival; consume capacidad 20% más rápido.' },
    reinforced: { name: 'Cobertura reforzada', cost: 220, cooldown: 24, capacity: 210, duration: 8, delay: 0, reduction: 0.5, detail: '210 de capacidad; reduce cada impacto 50%, dura solo 8 s.' },
    emergency: { name: 'Escudo de emergencia', cost: 115, cooldown: 1, capacity: 180, duration: 15, delay: 0, reduction: 0, emergencyThreshold: 0.35, detail: 'Pagás para armarlo una vez; se activa automáticamente al llegar a 35% de vida o menos.' },
  },
  sabotage: {
    disrupt: { name: 'Interferencia de escudos', cost: 90, cooldown: 32, duration: 10, penalty: 0.25, effect: 'shields', detail: 'Reduce 25% la capacidad efectiva de escudos ya activos durante 10 s.' },
    economy: { name: 'Bloqueo económico', cost: 115, cooldown: 32, duration: 12, penalty: 0.30, effect: 'income', detail: 'Reduce ingresos enemigos un 30% por 12 s.' },
    production: { name: 'Freno industrial', cost: 100, cooldown: 32, duration: 12, penalty: 0.60, effect: 'factoryIncome', detail: 'Reduce 60% los ingresos de fábricas adicionales durante 12 s.' },
    cooldown: { name: 'Interferencia de recargas', cost: 120, cooldown: 32, duration: 10, penalty: 0.50, effect: 'cooldown', targeted: true, detail: 'Recargas de una familia elegida avanzan a la mitad durante 10 s.' },
    launch: { name: 'Retraso de lanzamiento', cost: 100, cooldown: 30, duration: 12, delay: 3, effect: 'rocketDelay', detail: 'Los cohetes lanzados durante 12 s tardan 3 s más; no afecta los ya lanzados.' },
    ambush: { name: 'Emboscada al nodo', cost: 95, cooldown: 30, delay: 6, effect: 'nextGuardian', detail: 'Retrasa 6 s el próximo envío de guardianes; no quita control del nodo.' },
    friction: { name: 'Fricción de fábrica', cost: 90, cooldown: 32, penalty: 0.35, effect: 'nextFactory', detail: 'La próxima fábrica rival cuesta 35% más; se consume con esa compra.' },
    supplies: { name: 'Corte de suministros', cost: 85, cooldown: 30, duration: 15, penalty: 0.4, effect: 'nextAction', targeted: true, detail: 'La próxima acción de la familia elegida cuesta 40% más, por hasta 15 s.' },
    reconfigure: { name: 'Interferencia de reconfiguración', cost: 95, cooldown: 28, delay: 4, effect: 'swapDelay', detail: 'Añade 4 s a un cambio rival en curso; sin cambio en curso no se puede usar.' },
    precision: { name: 'Sabotaje de precisión', cost: 110, cooldown: 32, duration: 12, penalty: 0.35, effect: 'precision', targeted: true, slotTargeted: true, detail: 'Reduce 35% la potencia de un cohete o defensa del rival durante 12 s.' },
  },
});

export const BONUSES = freeze({
  sustained: { name: 'Rendimiento sostenido', detail: '+15% ingresos toda la partida.' },
  expansion: { name: 'Expansión', detail: '+20% ingresos durante los primeros 90 s.' },
  efficiency: { name: 'Eficiencia', detail: 'Construcciones y mejoras económicas cuestan 12% menos.' },
  compound: { name: 'Compuesto', detail: '+0,12% ingresos por segundo sin daño al núcleo, hasta +35%.' },
  treasury: { name: 'Tesorería', detail: '+80 Créditos iniciales.' },
  logistics: { name: 'Logística', detail: 'Guardianes cuestan 25% menos.' },
  emergency: { name: 'Reserva de emergencia', detail: 'Una vez, recibís 100 Créditos al quedar con 35 o menos.' },
  rocketsSlot: { name: 'Espacio extra de cohetes', extraFamily: 'rockets', detail: '3 cohetes activos; si ocupan todas las opciones disponibles, no queda reserva para cambiar.' },
  shieldsSlot: { name: 'Espacio extra de defensa', extraFamily: 'shields', detail: '3 defensas activas; si ocupan todas las opciones disponibles, no queda reserva para cambiar.' },
  sabotageSlot: { name: 'Espacio extra de sabotaje', extraFamily: 'sabotage', detail: '2 sabotajes activos; si ocupan todas las opciones disponibles, no queda reserva para cambiar.' },
});

export function defaultLoadout(bonus = 'expansion') {
  return { bonus, candidates: Object.fromEntries(FAMILIES.map(f => [f, Object.keys(CATALOG[f]).slice(0, LIST_COUNTS[f])])) };
}

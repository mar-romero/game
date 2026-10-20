/*
 * Arena balance data shared by the browser runtime.
 * Keep this file free of DOM, storage, and platform APIs.
 *
 * The legacy Arena script reads the compatibility namespace below. New code
 * should depend on this domain data through an adapter instead of globals.
 */
(function attachArenaConfig(root) {
  const config = {
    GAME_CONFIG: {
      matchDuration: 240,
      coreHP: 700,
      startingResources: 240,
      economicLevels: [9, 15, 24, 38],
      economicUpgradeCosts: [0, 165, 360, 720],
      factoryCost: 105,
      attackCosts: { small: 110, large: 275 },
      attackDamage: { small: 120, large: 300 },
      attackTravel: { small: 6, large: 10 },
      heavyAttackCooldown: 18,
      heavyCommitDuration: 9,
      heavyDefenseCostMult: 1.25,
      defenseCosts: { small: 90, large: 210 },
      defenseCapacity: { small: 145, large: 330 },
      shieldDuration: 24,
      maxShield: 470,
      sabotageCost: 90,
      sabotageDuration: 10,
      sabotagePenalty: 0.30,
      sabotageCooldown: 32,
      territoryCaptureCost: 130,
      territoryTravel: 7.5,
      territoryBonus: 0.18,
      territoryCooldown: 26,
      specializationCost: 130,
      specializationUnlockLevel: 2,
      overdriveEnabled: true,
      overdriveCost: 65,
      overdriveDuration: 12,
      overdriveIncomeBonus: 0.50,
      overdriveCoreVulnerability: 0.40,
      overdriveCooldown: 52,
      scanCost: 55,
      scanDuration: 11,
      scanCooldown: 29,
      botThinkInterval: 0.95,
      sampleInterval: 5,
      tick: 0.20,
      batchMatches: 100,
      gridSize: 5,
    },
    CIVILIZATIONS: {
      forge: { name: 'FORJA', summary: 'Mejoras económicas -7% · ataques +8% costo', description: 'Edificios más baratos en la Megafábrica; economía más barata, ataques más caros en Arena.', ecoCost: 0.93, attackCost: 1.08, defenseCost: 1, defenseHP: 1, sabotageCost: 1 },
      bastion: { name: 'BASTIÓN', summary: 'Escudos +14% · mejoras económicas +6% costo', description: 'Más producción en la Megafábrica; escudos más resistentes y economía más cara en Arena.', ecoCost: 1.10, attackCost: 1, defenseCost: 1, defenseHP: 1.2, sabotageCost: 1 },
      swarm: { name: 'ENJAMBRE', summary: 'Ataques -12% · defensas +12% costo', description: 'Contratos más rápidos en la Megafábrica; ataques baratos y defensas caras en Arena.', ecoCost: 1, attackCost: 0.88, defenseCost: 1.12, defenseHP: 1, sabotageCost: 1 },
      nexus: { name: 'NEXO', summary: 'Sabotaje -26% · ataques +4% costo', description: 'Investigación más barata en la Megafábrica; sabotaje barato y ataques algo más caros en Arena.', ecoCost: 1, attackCost: 1.08, defenseCost: 1, defenseHP: 1, sabotageCost: 0.80 },
    },
    SPECIALIZATIONS: {
      specIndustry: { name: 'INDUSTRIA', detail: '+16% ingreso · ataques +10% costo', incomeMult: 1.16, attackCost: 1.10, attackDamage: 1, sabotageDuration: 0, territoryBonus: 0, captureCost: 1 },
      specArsenal: { name: 'ARSENAL', detail: '+18% daño · -10% ingreso', incomeMult: 0.90, attackCost: 0.96, attackDamage: 1.18, sabotageDuration: 0, territoryBonus: 0, captureCost: 1.08 },
      specControl: { name: 'CONTROL', detail: 'Nodo +7% · captura -15% · sabotaje +5 s', incomeMult: 0.94, attackCost: 1.03, attackDamage: 1, sabotageDuration: 5, territoryBonus: 0.07, captureCost: 0.85 },
    },
    BOTS: {
      GREEDY: 'GREEDY — maximiza economía',
      RUSHER: 'RUSHER — ataca temprano',
      TURTLE: 'TURTLE — defensa y escalado',
      TEMPO: 'TEMPO — castiga inversiones',
      ADAPTIVE: 'ADAPTIVE — responde al rival',
      RANDOM: 'RANDOM — control experimental',
      BALANCED: 'BALANCED — estrategia mixta',
      HOARDER: 'HOARDER — stress test de acumulación',
      SABOTEUR: 'SABOTEUR — guerra económica',
    },
  };

  root.FactoryWars = root.FactoryWars || {};
  root.FactoryWars.Config = config;
})(window);

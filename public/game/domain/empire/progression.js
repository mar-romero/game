/* Pure Empire scoring, costs, research gates, contracts, and mastery rules. */
(function attachEmpireProgression(root) {
  const catalog = root.FactoryWars.EmpireCatalog;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function industrialScore(state) {
    const levels = Object.values(state.buildings).reduce((total, level) => total + level, 0);
    const legacyResearch = state.research.filter(key => !catalog.RESEARCH[key]?.category).length;
    const arenaResearch = state.research.length - legacyResearch;
    return Math.floor(Math.sqrt(state.lifetimeProduction + 1) * 9
      + levels * 75
      + state.contractsCompleted * 55
      + legacyResearch * 90
      + arenaResearch * 25
      + state.prestigeCount * 250);
  }

  function prestigeProgress(state) {
    const levels = Object.values(state.buildings).reduce((total, level) => total + level, 0);
    const buildings = clamp(levels / 20, 0, 1);
    const production = clamp(state.cycleProduction / 12000, 0, 1);
    const contracts = clamp(state.contractsCompleted / 6, 0, 1);
    const research = clamp(state.research.length / 4, 0, 1);
    return Math.floor((buildings * 0.3 + production * 0.3 + contracts * 0.2 + research * 0.2) * 100);
  }

  function buildingCost(state, key) {
    const building = catalog.BUILDINGS[key];
    const level = state.buildings[key];
    const base = building.base * Math.pow(building.growth, level - 1);
    const civilizationDiscount = state.currentCiv === 'forge' ? 0.90 : 1;
    return Math.round(base * civilizationDiscount);
  }

  function researchCountForBranch(state, branch) {
    return catalog.researchCountForBranch(state.research, branch);
  }

  function researchCost(state, key) {
    const path = catalog.researchPathInfo(key);
    const count = path ? researchCountForBranch(state, path.branch) : 0;
    const tierCosts = [90, 135, 190, 255];
    let cost = path ? tierCosts[Math.min(3, count)] : catalog.RESEARCH[key].cost;
    if (state.currentCiv === 'nexus') cost *= 0.9;
    if (state.research.includes('archive')) cost *= 0.95;
    return Math.round(cost);
  }

  function isDoctrine(key) {
    return ['missile_breaker', 'missile_siege', 'missile_fast'].includes(key);
  }

  function civMastery(state, civilization) {
    return Math.min(10, (state.civLegacies[civilization] || 0) + (state.loyalty[civilization] || 0));
  }

  function contractSpec(state) {
    const completed = state.contractsCompleted;
    return {
      name: ['Convoy industrial', 'Suministro de frontera', 'Paquete de investigación'][completed % 3],
      inputs: { energy: 90 + 25 * completed, steel: 55 + 18 * completed, credits: 65 + 22 * completed },
      reward: 95 + 28 * completed,
      intelReward: 12 + Math.min(18, Math.floor(completed * 1.5)),
      seconds: (48 + Math.min(72, completed * 7)) * (state.currentCiv === 'swarm' ? 0.9 : 1),
    };
  }

  function contractMissing(state, contract) {
    const inputs = contract.inputs || { [contract.resource]: contract.need };
    return Object.entries(inputs).map(([key, need]) => ({
      key,
      need,
      missing: Math.max(0, need - (Number(state[key]) || 0)),
    }));
  }

  root.FactoryWars.EmpireProgression = {
    industrialScore,
    prestigeProgress,
    buildingCost,
    researchCost,
    isDoctrine,
    civMastery,
    contractSpec,
    contractMissing,
  };
})(window);

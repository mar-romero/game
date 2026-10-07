/* Pure Megafactory production rules. The browser controller supplies state. */
(function attachEmpireEconomy(root) {
  function legacyEfficiency(state) {
    const prestige = state.prestigeCount || 0;
    return 1
      + Math.min(prestige, 10) * 0.01
      + Math.min(Math.max(prestige - 10, 0), 10) * 0.005
      + Math.max(prestige - 20, 0) * 0.0025;
  }

  function civilizationProductionMultiplier(state) {
    return state.currentCiv === 'bastion' ? 1.08 : 1;
  }

  function researchProductionMultiplier(state) {
    return state.research.includes('logistics') ? 1.08 : 1;
  }

  function productionRates(state) {
    const multiplier = legacyEfficiency(state)
      * civilizationProductionMultiplier(state)
      * researchProductionMultiplier(state);
    return {
      energy: 0.75 * state.buildings.generator * multiplier,
      steel: 0.42 * state.buildings.refinery * multiplier,
      intel: 0.04 * state.buildings.lab * multiplier,
      credits: 0.18 * state.buildings.automation * multiplier,
    };
  }

  function buildingGain(state, key) {
    const multiplier = legacyEfficiency(state)
      * civilizationProductionMultiplier(state)
      * researchProductionMultiplier(state);
    const rates = { generator: 0.75, refinery: 0.42, lab: 0.018, automation: 0.18 };
    const resources = { generator: 'energy', refinery: 'steel', lab: 'intel', automation: 'credits' };
    const rate = rates[key];
    const level = state.buildings[key];
    return {
      resource: resources[key],
      gain: rate * multiplier,
      current: rate * level * multiplier,
      next: rate * (level + 1) * multiplier,
    };
  }

  root.FactoryWars = root.FactoryWars || {};
  root.FactoryWars.EmpireEconomy = {
    legacyEfficiency,
    civilizationProductionMultiplier,
    researchProductionMultiplier,
    productionRates,
    buildingGain,
  };
})(window);

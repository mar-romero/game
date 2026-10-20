/* Pure Megafactory production rules. The browser controller supplies state. */
(function attachEmpireEconomy(root) {
  const buildingRates = Object.freeze({ generator: 0.75, refinery: 0.42, lab: 0.04, automation: 0.18 });
  const buildingResources = Object.freeze({ generator: 'energy', refinery: 'steel', lab: 'intel', automation: 'credits' });

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
      energy: buildingRates.generator * state.buildings.generator * multiplier,
      steel: buildingRates.refinery * state.buildings.refinery * multiplier,
      intel: buildingRates.lab * state.buildings.lab * multiplier,
      credits: buildingRates.automation * state.buildings.automation * multiplier,
    };
  }

  function buildingGain(state, key) {
    const multiplier = legacyEfficiency(state)
      * civilizationProductionMultiplier(state)
      * researchProductionMultiplier(state);
    const rate = buildingRates[key];
    const level = state.buildings[key];
    return {
      resource: buildingResources[key],
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

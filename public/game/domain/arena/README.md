# Arena domain

`match-engine.js` contains the `Match` state machine, legal actions, resource costs, production income, combat travel/resolution, bot policies, timeouts and match reports. `industrial-modules.js` owns the module catalog used during Arena matches. These files have no DOM or storage calls; the engine reads balance data and deterministic randomness from sibling domain modules.

For compatibility with the current web scripts, the file publishes `FactoryWars.Match` and `window.Match`. The remaining browser adapters still extend `Match.prototype`; replace those extensions with explicit simulation systems before removing the compatibility export.

---
name: gameplay-domain
description: Trace Factory Wars gameplay rules, progression, bots, and compatibility before changing domain behavior.
---

# Gameplay domain

Use for match rules, Arena actions, bots, Megafactory economy/progression, civilizations, rewards, and gameplay bugs.

1. Read `docs/ARCHITECTURE.md` and the relevant domain README. Treat `public/game/domain/arena/match-engine.js` and `public/game/domain/empire/` as domain sources, while following adapters that extend behavior.
2. Trace the complete active path from page/script loading through controller/runtime to persisted or rendered outcome. Script order and classic-script globals are compatibility contracts.
3. Preserve deterministic seeded behavior, valid state transitions, save compatibility, and separation of balance changes from extraction/refactoring.
4. Select the actual check based on the affected surface. Do not treat `analytics/balance_simulation.py` as the runtime engine; identify when a simulator is approximate.
5. For unclear legacy behavior, characterize it before refactoring. For a clear domain regression, prefer a failing behavioral test before implementation.

Report concrete files, invariants, edge cases, checks, and unknowns. A recommendation does not substitute for implementation, review, or verification.

---
name: gameplay-domain
description: Trace Factory Wars gameplay rules, progression, bots, and compatibility before changing domain behavior.
---

# Gameplay domain

Use for match rules, Arena actions, bots, Megafactory economy/progression, civilizations, rewards, and gameplay bugs.

1. Read `docs/ARCHITECTURE.md` and the relevant domain README. Treat `public/game/domain/arena-v2/` and `public/game/domain/factory-v2/` as the active web rules; Unity gameplay currently has a separate C# implementation. Consult `archive/v1/public/` only for server compatibility.
2. Trace the complete active path from page/script loading through controller/runtime to persisted or rendered outcome. Script order and classic-script globals are compatibility contracts.
3. Preserve deterministic seeded behavior, valid state transitions, save compatibility, and separation of balance changes from extraction/refactoring.
4. Select the actual check based on the affected surface. Historical V1 simulations are in `archive/analytics-v1/`; do not treat them as the active runtime engine.
5. For unclear legacy behavior, characterize it before refactoring. For a clear domain regression, prefer a failing behavioral test before implementation.

Report concrete files, invariants, edge cases, checks, and unknowns. A recommendation does not substitute for implementation, review, or verification.

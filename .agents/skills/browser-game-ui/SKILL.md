---
name: browser-game-ui
description: Change and review the browser game UI while preserving gameplay input, script ordering, and viewport behavior.
---

# Browser game UI

Use for Arena/Megafactory layout, HUD, controls, CSS, canvas/DOM, responsive behavior, and accessibility.

1. Read `docs/ARCHITECTURE.md`, `docs/GAME_FLOW.md`, and `docs/FILE_CONVENTIONS.md` for the affected screen.
2. Trace the owning HTML page, script load order, runtime selectors, event handlers, and styles. Preserve public URLs and iframe contracts.
3. Keep gameplay controls reachable at the actual play surface and account for narrow screens, safe areas, overlays, focus, and pointer/touch input where relevant.
4. Separate presentation-only edits from gameplay state changes. If selectors or event wiring change, check all callers and avoid duplicate IDs/listeners.
5. Choose a visual/manual check when no reliable automated browser check exists; state exactly what was and was not observed.

Do not claim visual verification from reading CSS. Report changed viewport/state coverage and remaining interaction risks.

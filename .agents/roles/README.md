# Roles

Contratos provider-neutral; los perfiles invocables para Codex están en `.codex/agents/`.

- Flujo general: explorer, planner, test-designer, implementer, reviewer, verifier y security-reviewer.
- Especialistas de solo lectura: docs-researcher, gameplay-specialist, web-game-ui-specialist, supabase-specialist y balance-specialist.
- El router agrega especialistas por señales de dominio; no reemplazan al implementer ni al reviewer general.
- Al delegar, invocá el nombre exacto configurado en `.codex/config.toml` y pasa `preferred_model` y `reasoning_effort` desde `harness/model-routing.json`. Leé las skills asociadas en `.agents/skills/`.

Contratos de roles provider-neutral: explorer, planner, test-designer, implementer, reviewer, verifier y security-reviewer. Son guías de responsabilidades, no ejecutables ni agentes de proveedor registrados.

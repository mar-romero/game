# Especialistas del juego

El hook `UserPromptSubmit` y `python scripts/harness_orchestrator.py route "pedido"` seleccionan skills y perfiles cuando detectan el área afectada. El resultado es una recomendación para el coordinador; no ejecuta subagentes automáticamente. El coordinador lee las skills indicadas y delega al nombre exacto configurado en `.codex/config.toml`, pasando el modelo y razonamiento recomendados por el route.

| Señal | Perfil invocable | Skill | Modelo base |
| --- | --- | --- | --- |
| reglas, Arena, economía, bots, progresión | `gameplay_specialist` | `gameplay-domain` | `gpt-6-astra`, high |
| HUD, UI, canvas, controles, CSS, mapa | `web_game_ui_specialist` | `browser-game-ui` | `gpt-6-astra`, high |
| Supabase, SQL, auth, RLS, migraciones, saves | `supabase_specialist` | `supabase-data` | `gpt-6-astra`, high |
| balance, tuning, semillas, simulaciones | `balance_specialist` | `game-balance` | `gpt-6-astra`, high |

Los perfiles son de solo lectura y aportan contexto de dominio. Para cambios, `implementer` sigue siendo el escritor único; `reviewer` revisa el diff independientemente. Riesgo, TDD, revisión, verificación y aprobación humana siguen `AGENTS.md` y `harness/manifest.yaml`.

Invocación manual:

```powershell
python scripts/harness_orchestrator.py route "ajustar el HUD del Arena"
```

Después, pedile al coordinador que delegue en `web_game_ui_specialist` (o seleccioná ese perfil desde el panel de agentes del cliente) y que lea `.agents/skills/browser-game-ui/SKILL.md`. Para las otras áreas, usá el nombre y la skill de la tabla. Si el runtime no admite subagentes, el coordinador aplica el contrato como checklist local e informa que no hubo delegación independiente.

# Especialistas del juego

El hook `UserPromptSubmit` y `python scripts/harness_orchestrator.py route "pedido"` seleccionan skills y perfiles cuando detectan el área afectada. El resultado es una recomendación para el coordinador; no ejecuta subagentes automáticamente. El coordinador lee las skills indicadas y delega al nombre exacto configurado en `.codex/config.toml`, pasando el modelo y razonamiento recomendados por el route.

| Señal | Perfil invocable | Skill | Modelo base |
| --- | --- | --- | --- |
| reglas, Arena, economía, bots, progresión | `gameplay_specialist` | `gameplay-domain` | `gpt-6-astra`, high |
| HUD, UI, canvas, controles, CSS, mapa en navegador | `web_game_ui_specialist` | `browser-game-ui` | `gpt-6-astra`, high |
| Unity + gráficos, HUD/Canvas, sprites, materiales, animaciones, cintas o escenas | `unity_graphics_specialist` | `unity-visual-qa` | `gpt-6-astra`, high |
| Supabase, SQL, auth, RLS, migraciones, saves | `supabase_specialist` | `supabase-data` | `gpt-6-astra`, high |
| balance, tuning, semillas, simulaciones | `balance_specialist` | `game-balance` | `gpt-6-astra`, high |

Los perfiles son de solo lectura y aportan contexto de dominio. Para cambios, `implementer` sigue siendo el escritor único; `reviewer` revisa el diff independientemente. Riesgo, TDD, revisión, verificación y aprobación humana siguen `AGENTS.md` y `harness/manifest.yaml`.

El router combina contexto Unity con una señal visual para elegir `unity_graphics_specialist`: guardado o autenticación en Unity por sí solos no lo activan. `HUD` o `Canvas` dentro de un pedido Unity no activan el especialista web; un pedido mixto con señales explícitas web/navegador/CSS/HTML puede activar ambos. Los pedidos UI sin contexto Unity conservan el routing web existente.

En cambios visuales de Unity, la ruta agrega `verifier` y `VERIFY` después de `REVIEW`. Usa `test_after_allowed` si no aplica un modo más exigente; conserva spike, caracterización o TDD requerido para pedidos mixtos con lógica/persistencia y mantiene el riesgo R2/R3 detectado. La skill suma QA visual a esas pruebas: exige compilar la última edición, observar Game/Play en la resolución destino y comprobar consola. Una secuencia o varias muestras deben demostrar las animaciones. El cierre distingue implementación, compilación, revisión y verificación visual; si el editor o la captura no están disponibles, declara la verificación pendiente. Para consultas de solo lectura, el especialista entrega diagnóstico sin exigir implementación, build ni Play.

Invocación manual:

```powershell
python scripts/harness_orchestrator.py route "ajustar el HUD del Arena"
python scripts/harness_orchestrator.py route "Mejorar las animaciones de las cintas en Unity"
```

Después, pedile al coordinador que delegue en `web_game_ui_specialist` (o seleccioná ese perfil desde el panel de agentes del cliente) y que lea `.agents/skills/browser-game-ui/SKILL.md`. Para las otras áreas, usá el nombre y la skill de la tabla. Si el runtime no admite subagentes, el coordinador aplica el contrato como checklist local e informa que no hubo delegación independiente.

Contratos canónicos de Unity: [rol](../.agents/roles/unity-graphics-specialist.md) y [skill](../.agents/skills/unity-visual-qa/SKILL.md). La configuración del perfil se carga cuando el cliente actualiza los agentes del proyecto; si aún no figura en el runtime, se puede pasar el contrato a un rol genérico de solo lectura e informar ese fallback.

# Hooks del harness

Hay dos capas:

- **Codex `UserPromptSubmit`:** `.codex/hooks.json` ejecuta `scripts/harness_orchestrator.py hook`. Lee el prompt y agrega riesgo, RDD/SDD, modo TDD, skills, roles y modelos recomendados al contexto. No edita archivos, invoca modelos ni bloquea pedidos. Si falla, deja una instrucción para usar el workflow manual.
- **Git `pre-commit`:** `.githooks/pre-commit` ejecuta `git diff --cached --check` para detectar whitespace conflictivo. No instala dependencias ni reemplaza tests.

Para activar el hook Git en cada clone:

```powershell
git config core.hooksPath .githooks
```

Para desactivarlo en este checkout: `git config --unset core.hooksPath`.

El hook Codex se carga desde `.codex/` en clientes locales compatibles cuando el proyecto es confiable. Revisá y autorizá la definición con `/hooks` antes de confiarla; cambios en la definición requieren revisar/confíar el nuevo hash.

# Contexto del repositorio Factory Wars

Esta guía resume la organización vigente; no reemplaza `AGENTS.md`, las instrucciones por carpeta ni la inspección de Git.

## Superficies activas

- **Unity 6:** `unity/FactoryWars.Unity6/`. Leer su README antes de cambiar pantallas o integración con el API. `Library/`, `Temp/`, `Logs/`, `UserSettings/`, `Obj/` y builds son locales/regenerables.
- **Megafábrica 3.1 web:** `public/factory-v2.html` y `public/game/domain/factory-v2/`.
- **Arena V2 web:** `public/arena-v2.html`, `public/game/domain/arena-v2/`, `public/game/application/arena-v2-bot.js` y el adaptador web.
- **API y datos:** `server/` y `supabase/`; sus APIs de cuenta, Megafábrica y ranking son usadas por Unity. El runtime online Arena sigue usando reglas V1 archivadas, no Arena V2.
- **Documentación activa:** `docs/ARCHITECTURE.md`, `docs/GAME_FLOW.md`, `docs/FILE_CONVENTIONS.md`, `docs/newPVP.md`, `docs/MEGAFABRICA_V31.md`, `docs/ONLINE_LOCAL_SETUP.md` y `docs/DEPLOY_GITHUB_PAGES.md`.

## Archivo

`archive/v1/public/` preserva la aplicación web V1 que todavía necesita el runtime Arena del servidor. `archive/legacy-v1.6/`, `archive/analytics-v1/`, `archive/docs-v1.6/`, `archive/reference-images/` y `archive/exports/` contienen snapshots y material anterior conservado para consulta; no son rutas activas de la aplicación.

## Invariantes

- No asumir que Arena Unity y Arena V2 web comparten motor: Unity usa una implementación C# separada.
- Arena V2 web hoy es práctica local; sus resultados no son válidos para premios ni ranking.
- Los resultados competitivos y recompensas requieren autoridad de servidor.
- La arquitectura objetivo no equivale a una integración terminada. Confirmar cada flujo desde la UI hasta el dominio y la persistencia.
- Revisar `git status --short` y `git diff` antes de editar. Preservar todos los cambios locales preexistentes.

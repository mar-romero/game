# Contexto del repositorio Factory Wars

Guía de orientación persistente para futuras tareas de agentes. Resume la arquitectura y los contratos documentados; no reemplaza la inspección del código, las instrucciones locales ni la verificación del estado actual.

## Qué es el proyecto

Factory Wars es principalmente un juego web de estrategia con dos ciclos conectados: Megafábrica persistente (recursos, edificios, investigaciones, contratos, civilizaciones y prestigio) y Arena (partidas cortas, bots/PvP, Liga y recompensas). También existe un cliente Unity 6 paralelo, cuyo alcance y conexión a servicios difieren de la web. El sitio público se sirve desde `public/`; las URLs `/` y `/arena.html` son puntos de entrada que deben conservarse.

## Mapa para empezar una tarea

- `AGENTS.md`: instrucciones obligatorias del repo y clasificación de riesgo.
- `docs/AGENT_WORKFLOW.md` y `.agents/skills/harness-mvp/SKILL.md`: flujo proporcional de exploración, especificación, implementación, checks, review y verify.
- `docs/ARCHITECTURE.md`: arquitectura actual, límites y contratos. `docs/GAME_FLOW.md`: flujos del jugador.
- `docs/FILE_CONVENTIONS.md`: ubicación y límites para código nuevo.
- `docs/MIGRATION_PLAN.md`: deuda de migración y criterio de paridad.
- `README.md`: guía para jugadores y configuración online local; no tratar todos sus valores de gameplay como autoridad para reglas sin revisar el código.
- `docs/GAME_SPECIALISTS.md`, `.agents/roles/`, `.codex/agents/`, `harness/manifest.yaml` y `harness/model-routing.json`: routing de áreas y perfiles. Respetar instrucciones vigentes del usuario y del harness sobre delegación.

### Web activa

- `public/index.html`: entrada Megafábrica; carga controladores web y estilos.
- `public/arena.html`: entrada Arena/iframe; orden de sus scripts clásicos síncronos es parte del runtime.
- `public/game/domain/arena/match-engine.js`: reglas base, estado, acciones, bots y resolución de `Match`.
- `public/game/domain/arena-config.js` y `random.js`: configuración de combate y aleatoriedad.
- `public/game/domain/arena/industrial-modules.js`: catálogo de módulos Arena.
- `public/game/domain/empire/catalog.js`, `economy.js`, `progression.js`: datos, producción y reglas puras de progreso del Imperio.
- `public/game/adapters/web/arena-core-runtime.js`: input, UI y coordinación principal de Arena. `arena-production-system.js`, `arena-balance-overrides.js`, `arena-tech.js` y otros puentes son capas de compatibilidad activas; pueden extender `Match.prototype`.
- `public/game/adapters/web/empire-controller.js`: coordina interfaz, estado local y flujos de Megafábrica.
- `public/game/adapters/persistence/arena-online.js`: persistencia/sincronización Arena. El controlador del Imperio también mantiene su propio flujo online.
- `public/game/presentation/styles/`: estilos por área. `public/service-worker.js` y `manifest.webmanifest`: PWA y rutas relativas para alojamiento bajo prefijo.

### Backend y datos

- `supabase/schema.sql` y `supabase/migrations/`: esquema, funciones, políticas y evolución de DB.
- `server/`, `public/online.html`, `docs/ONLINE_LOCAL_SETUP.md`: servidor/API y entorno online local; inspeccionar implementación/configuración vigente antes de cambiar contratos.
- Recompensas competitivas y resultados enviados por cliente no son autoridad confiable: cambios a Liga, pagos/recompensas, persistencia, auth o datos compartidos suelen ser R2/R3 y requieren especificación y pruebas de error/límite acordes.

### Unity

- `unity/FactoryWars.Unity6/`: shell/cliente Unity independiente; consultar su README y código antes de describir cobertura. El README registra vistas FAB/PvP/TOP/Civilizaciones, integración API y limitaciones de validación en Editor.
- No asumir que la Arena Unity ejecuta las reglas `Match` de la web ni que la UI visual equivale a acciones jugables.
- No asumir que Unity reemplazó al cliente web.

## Contratos e invariantes conocidos

- Mantener la lógica pura de dominio libre de DOM, `localStorage`, red, Supabase, Unity SDK o SDKs de plataforma.
- Reglas deterministas y simulaciones deben recibir semilla explícita; el tiempo y almacenamiento pertenecen a límites/adaptadores.
- Mantener compatibilidad de URLs públicas, saves y datos online; cambios de formato necesitan migración/versionado.
- Presentation envía acciones y muestra resultados, no decide legalidad ni recalcula reglas de dominio.
- Separar ajustes de balance de refactors/extracciones; cualquier simulación debe identificar su motor y limitaciones.
- Capas clásicas de Arena cargan en orden síncrono: revisar etiquetas `<script>` de `public/arena.html` antes de mover o renombrar archivos.
- La arquitectura objetivo no equivale al estado terminado: aplicación/puertos y plataformas incluyen carpetas preparadas; algunas reglas siguen en controladores y wrappers. Ver `docs/MIGRATION_PLAN.md`.
- `legacy/v1.6/` es snapshot histórico preservado; no agregarle funciones nuevas.

## Checks y evidencia

No hay un comando raíz único de tests. `tests/README.md` describe intención futura; descubrir comandos existentes en el área tocada y ejecutar el subconjunto pertinente. Simuladores de `analytics/` pueden aproximar balance y no necesariamente ejecutar el motor del navegador. No reportar tests, compilación Unity, review independiente o verify visual que no se haya ejecutado.

## Inicio obligatorio de cada nueva conversación/tarea

1. Leer `AGENTS.md` y la skill pertinente; consultar el route del harness si aplica.
2. Ejecutar `git status --short --branch` y revisar diffs antes de editar. Preservar trabajo local; no atribuir archivos no rastreados al repo base.
3. Leer la documentación y entry points específicos de la zona; esta guía es mapa, no fuente de verdad temporal.
4. Comprobar el código activo, scripts/contratos, instrucciones de subcarpeta, tests y comandos actuales. Para preguntas sobre comportamiento exacto o estado cambiante, investigar antes de responder.
5. Clasificar riesgo, establecer criterio observable y cerrar con hechos verificados separados de inferencias y límites.

## Límite de este contexto

Este resumen se redactó el 2026-10-10 a partir de documentación y un inventario parcial. No es conocimiento exhaustivo ni garantiza que la documentación y el código sigan coincidiendo. El estado Git, versiones, balance, endpoints, servicios y capacidades instaladas pueden cambiar; verificar en el momento de la tarea. En la inspección inicial había cambios locales en `unity/FactoryWars.Unity6/Assets/Scripts/FactoryWarsEmpireView.cs` y `FactoryWarsMobileApp.cs`, además de recursos sin seguimiento y directorios generados de Unity. Ese inventario es histórico: no asumir que siga vigente ni descartarlo sin inspección.

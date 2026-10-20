# Mapa de pantallas y línea base

**Fecha de referencia:** 2026-10-09

**Base:** `main` actualizado, incorporado a `codex/sprint-ux-ui-mobile-first`.

**Alcance:** inventario previo a la tarea 2; no cambia HTML, CSS, JavaScript ni reglas.

## Referencias y vistas actuales

Las imágenes son mockups de composición, no una especificación literal de contenido o controles.

| Referencia | Vista / estado actual | Archivos y elementos activos | Acoplamientos y riesgos |
| --- | --- | --- | --- |
| [`imageMenuPVP.png`](../image/imageMenuPVP.png) | **Imperio**: `#home`, vista inicial del shell. | `public/index.html`; `empire-controller.js` actualiza progreso, recursos y accesos; `empire.css`. | `#home` y sus ganchos `.hero` se consultan desde el controlador. La guía inicial se inserta después de `#home .hero`. |
| [`imageMenu.png`](../image/imageMenu.png) | **Megafábrica**: `#factory`. | `public/index.html`; `#factoryBuildings`, `#contractBox`, `#researchList`, `#prodText`, `#factoryCoach`; controlador del Imperio; `empire.css`. | Los botones se generan con `data-build`, `data-branch`, `data-research` y `data-equip`; conservar esos atributos o actualizar sus listeners. |
| [`imageMenuArena.png`](../image/imageMenuArena.png) | **Arena · preparación**: `#arena` contiene `#arenaFrame`; la preparación vive en `#setup` dentro de `arena.html`. | `public/index.html`, `public/arena.html`, `empire-controller.js`, `arena-core-runtime.js`; `arena.css` y `arena-runtime-overrides.css`. | Es un estado del iframe, no un séptimo `data-view`. El shell asigna `./arena.html` al iframe al abrir Arena. |
| [`imagePVP.png`](../image/imagePVP.png) | **Arena · partida**: estado `#game` dentro del mismo `arena.html`/`#arenaFrame`. | `arena.html`; `arena-core-runtime.js` maneja `#battleCanvas`, `#gridA`, `#gridB`, `#actions` y `#endPanel`; estilos Arena. | No hay una ruta o vista pública adicional para la partida. Cambiar el ciclo de `#setup` a `#game` o sus selectores puede romper controles y render. |
| [`imageCivilizacion.png`](../image/imageCivilizacion.png) | **Civilizaciones**: `#factions`. | `public/index.html`; `empire-controller.js` renderiza `#civGrid` y `#factionLocal`; `empire.css`. | Se delega el selector `[data-pick]` en `#civGrid`; el ID y atributo sostienen el evento de elección. |
| [`imagePerfil.png`](../image/imagePerfil.png) | **Perfil**: `#profile`. | `public/index.html`; `empire-controller.js` usa `#nicknameInput`, `#saveNickname`, `#legacyGrid`, `#imperialCycle` y botones de reinicio; `empire.css`. | Los botones de reinicio tienen efectos sobre estado local; la referencia visual no autoriza cambiar esa lógica. |
| [`imageRanking.png`](../image/imageRanking.png) | **Rankings**: `#rankings`. | `public/index.html`; al entrar se llama `loadAllRankings()`; contenedores `#leagueSchedule`, `#arenaRank`, `#industrialRank`, `#empireRank`, `#factionRank`; `empire.css`. | Mantener los contenedores consultados y el ID de vista para que la carga al navegar siga ocurriendo. |

Las seis vistas actuales tienen referencia. `imageMenuArena.png` e `imagePVP.png` son dos estados de Arena. La entrada online (`public/online.html`) no pertenece a esas seis vistas y no tiene una referencia clara entre estas imágenes.

## Entradas públicas, navegación y estilos

| Entrada | Uso y composición activa |
| --- | --- |
| `public/index.html` | Entrada principal. Carga `./game/presentation/styles/empire.css`, luego config, catálogo/economía/progresión del Imperio y `empire-controller.js`. Define el shell y las seis secciones `.view`. |
| `public/arena.html` | URL pública estable y documento del iframe. Carga `arena.css`; después configuración/RNG, motor, runtime, capas de compatibilidad y puentes; carga `arena-runtime-overrides.css` después de `arena.css`. Ese orden y las versiones `?v=` participan del runtime y su caché. |
| `public/online.html` | Entrada aparte para cuenta/partidas online; usa `online.css`, `online-client.js` y su propio `#arenaFrame` dentro de `#arenaViewport`. No es una séptima vista del shell de Imperio. |

La navegación principal es `<nav class="nav">` con botones `data-view="home|factory|arena|rankings|factions|profile"`. `setView()` en `empire-controller.js` activa la `.view` cuyo `id` coincide y marca el botón activo. También hay atajos `data-guide-view` insertados por el controlador. `empire.css` dispone actualmente seis columnas de navegación, tres hasta 900 px y dos hasta 560 px; las reglas de recursos y de otras vistas agregan breakpoints propios. Esto describe el punto de partida, no una validación visual en dispositivos.

## Contratos DOM que debe respetar una migración

Los controladores consultan IDs literalmente con `$('<id>')`/`getElementById` y enlazan eventos mediante clases y atributos `data-*`. Cualquier ID o selector usado por los archivos indicados abajo es un contrato local: renombrarlo o quitarlo exige actualizar todos sus consumidores y revisar el flujo.

- **Shell Imperio:** conservar las seis secciones `#home`, `#factory`, `#arena`, `#rankings`, `#factions`, `#profile`, la clase `.view`, `.nav button[data-view]` y la igualdad entre cada valor `data-view` y el ID de sección. El controlador también consulta `#home .hero`, `#home p` y `.nav button`.
- **Bindings del Imperio:** los IDs leídos por `public/game/adapters/web/empire-controller.js` incluyen los estados de cabecera/recursos (`onlineStatus`, `nickname`, `civName`, `rCredits`, `rateCredits`, `rEnergy`, `rateEnergy`, `rSteel`, `rateSteel`, `rIntel`, `rateIntel`, `rDominion`, `rFragments`); fábrica (`prodText`, `factoryCoach`, `factoryBuildings`, `contractBox`, `researchList`); Arena (`openArena`, `leagueArenaCard`, `arenaFrame`); rankings (`leagueSchedule`, `arenaRank`, `industrialRank`, `empireRank`, `factionRank`, `refreshRanks`); civilizaciones (`civGrid`, `factionLocal`); perfil/legado (`nicknameInput`, `saveNickname`, `legacyGrid`, `imperialCycle`, `resetLocal`, `resetLeague`, `resetEverything`); prestigio y progreso (`prestigeBar`, `prestigePct`, `prestigeBtn`, `prestigeModal`, `prestigeChoices`, `closePrestige`, `prestigeCount`, `legacyEff`, `cycleProduction`, `contractCount`, `researchCount`, `warProgressBar`, `warProgress`, `warTier`, `industrialScore`); y `toast`/`holdTooltip`. La lista completa de lecturas está en ese controlador; parte de los controles de Liga se crea dinámicamente dentro de `#leagueArenaCard`.
- **Atributos generados por Imperio:** conservar `[data-build]`, `[data-branch]`, `[data-research]`, `[data-equip]`, `[data-pick]` y `[data-guide-view]`; el controlador instala los listeners sobre esos atributos.
- **Arena embebida:** conservar `#setup`, `#game`, `#mode`, `#learning`, `#civA`, `#civB`, `#startBtn`, `#battleCanvas`, `#gridA`, `#gridB`, `#actions` y `#endPanel`, además de los IDs leídos por `arena-core-runtime.js` y sus puentes. Los controles usan `.act[data-act]`, `.quickcmd[data-quick]`, `.speeds button[data-speed]`, `[data-strategy]`, `[data-module-preview]`, `[data-confirm-module]` y `[data-cancel-module]`. `arena-league-bridge.js` localiza además un botón de `#endPanel` por su texto actual `VOLVER A MEGAFÁBRICA →` para devolver a preparación.
- **Entrada online:** conservar `#arenaViewport`, su `#arenaFrame` y los IDs leídos por `online-client.js`; los eventos delegados usan `[data-action]`, `[data-build-module]` y `[data-special-action]`.

## Contrato del iframe de Arena

En el shell de Imperio, `empire-controller.js` crea el `src` relativo `./arena.html` al entrar a `#arena`. El padre envía al iframe `fw-league-start`, `fw-league-simulate`, `fw-territory-start` y `fw-casual-arm`. El runtime/puente informa `fw-arena-ready`, `fw-league-human-result`, `fw-league-sim-results`, `fw-territory-result` y `fw-free-match-result`; `arena-online.js` también emite `factory-wars-match-synced` con recompensas. Los nombres y datos de esos mensajes se consumen a ambos lados.

La entrada online reutiliza el nombre `#arenaFrame` en otro documento y tiene su propio protocolo: el iframe anuncia `fw-online-arena-ready` y envía `fw-online-action`; el cliente manda `fw-online-state` y `fw-online-action-result`. `online-client.js` valida `event.origin` y `event.source`. No mezclar esos dos propietarios del iframe ni cambiar nombres, origen o momento de carga como ajuste solo visual.

## Riesgos de publicación y pendientes

- El workflow `.github/workflows/main.yml` publica **solo `public/`** en GitHub Pages cuando hay push a `main`. Las páginas y assets web deben seguir bajo esa carpeta, mantener `index.html`/`arena.html` y usar rutas que funcionen bajo un prefijo de repositorio. Las siete referencias viven en `docs/image/`, fuera del artefacto publicado; sirven como documentación, no como URLs públicas del sitio.
- `public/index.html` y `public/arena.html` enlazan scripts/estilos con rutas relativas `./game/...`. `public/online.html` referencia `/online-config.js` desde la raíz del dominio; no hay un `online-config.js` versionado en el checkout. Bajo Pages de proyecto, esa ruta absoluta puede apuntar fuera del prefijo y el archivo no está incluido salvo que el proceso de publicación lo genere. Verificar ese contrato antes de tomar la entrada online como baseline funcional de Pages.
- `arena.html` depende de Three.js y Supabase JS servidos desde CDN. Su disponibilidad no queda cubierta por rutas relativas locales.
- La altura del iframe se fija desde `empire.css` y `arena-runtime-overrides.css`, mientras el documento Arena también define breakpoints y controles táctiles. La composición a 360/390 px requiere verificación integrada; leer CSS no demuestra que el iframe y sus controles no se recorten.
- No hay referencia clara para la experiencia de cuenta/partida online (`online.html`). No se infiere que las referencias de Perfil o Arena describan esa pantalla.

## Verificación de esta línea base

Se inspeccionaron las siete imágenes y se trazaron HTML, estilos, controladores, puentes y workflow de Pages en el checkout. Esta tarea no cambia código de ejecución ni verifica visualmente el juego en navegador; esa comprobación pertenece a las tareas de implementación del sprint.

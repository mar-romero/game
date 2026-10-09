# Arquitectura y guía para desarrolladores

Factory Wars es un juego de estrategia de partidas cortas. El jugador desarrolla una Megafábrica persistente, elige una civilización e investigaciones y usa esos desbloqueos durante combates de Arena. Hay partidas contra bots, simulaciones, Liga local de diez participantes y sincronización opcional con Supabase.

## Primer recorrido por el código

El mapa visual del flujo del jugador y sus dependencias está en [GAME_FLOW.md](GAME_FLOW.md).

1. Abrí `public/index.html`: es la entrada pública de la Megafábrica.
2. Seguí `game/adapters/web/empire-controller.js`: coordina la pantalla, el estado local, investigación, contratos, prestigio y Liga.
3. La Arena aparece en un iframe desde `public/arena.html`, que carga estilos, configuración, aleatoriedad y el runtime.
4. `game/domain/arena/match-engine.js` contiene el estado y las reglas base de `Match`; `game/adapters/web/arena-core-runtime.js` conecta la partida con la interfaz.
5. Los archivos `game/adapters/web/arena-production-system.js`, `arena-balance-overrides.js`, `arena-experience-lab.js` y `arena-league-bridge.js` cargan en ese orden sus capas de compatibilidad. `arena-tech.js` agrega mejoras de fábrica y reglas de guardianes después de definir `Match`.
6. `game/adapters/persistence/arena-online.js` sincroniza perfiles, partidas y recompensas de Arena. `game/adapters/web/empire-controller.js` mantiene su propio flujo de sincronización del Imperio.
7. `game/domain/arena/industrial-modules.js` contiene los datos de módulos de Arena; sus efectos aún se conectan desde adapters.
8. `game/domain/empire/catalog.js` contiene civilizaciones, edificios, investigaciones y rutas; `game/domain/empire/economy.js` calcula producción persistente. El controlador activo usa ambos.
9. `supabase/schema.sql` define tablas, vistas, funciones RPC y políticas. `supabase/migrations/` actualiza bases ya existentes.
10. `analytics/arena_bot_interactions.js` usa el motor de Arena en navegador. `analytics/balance_simulation.py` es otro simulador aproximado; no confundir sus resultados.

El orden de los scripts de `arena.html` es parte del runtime: configuración y aleatoriedad, motor, campaña, control de Arena, sistemas históricos, Liga, tecnología, Supabase/configuración y sincronizador. Los scripts de compatibilidad son clásicos y síncronos para conservar el orden y los nombres globales actuales.

## Estructura activa

```text
public/
  index.html                         Entrada de Megafábrica
  arena.html                         Entrada de Arena; conserva URL para automatización
  game/
    domain/                          Datos y reglas independientes de UI
      arena/match-engine.js          Estado, acciones, bots y resolución de partida
      arena/industrial-modules.js    Catálogo de módulos Arena
      empire/                         Catálogos, producción y progresión de Megafábrica
    application/                     Próxima extracción: casos de uso y sesiones
    ports/                           Próxima extracción: contratos de servicios
    adapters/
      web/                           Controladores, runtime y puente de navegador
      persistence/                   Persistencia/sync existente
      platform/                      Punto futuro para SDKs nativos
    presentation/
      styles/                        CSS por pantalla
      screens/                       Punto futuro para vistas separadas
      components/                    Punto futuro para componentes reutilizables
    platforms/
      web/ mobile/ desktop/ server/  Puntos de composición por plataforma
    shared/                          Código compartido que no es regla de juego
legacy/v1.6/                         Snapshot sin modificar de los 38 archivos versionados
docs/                                Diseño, operaciones y guía de arquitectura
analytics/                           Simulación y reportes de balance
supabase/                            Esquema, vistas, RPC y migraciones
tests/                               Lugar para pruebas automatizadas futuras
```

Las páginas HTML siguen en la raíz de `public/` para que no cambien las URLs usadas por Pages, el iframe y las simulaciones. Los estilos y scripts ya viven bajo `public/game/`, agrupados por responsabilidad. La entrada web incluye una PWA instalable (`public/manifest.webmanifest` y `public/service-worker.js`); el manifest, el service worker y sus assets usan rutas relativas para que funcionen bajo el prefijo de GitHub Pages. Esto comparte la interfaz web en navegador y pantalla de inicio, pero no crea un binario nativo ni una publicación en tiendas. Las carpetas que todavía no tienen implementación están marcadas con una guía `README.md`; son espacios de destino, no funcionalidades ya migradas.

## Dependencias objetivo

```text
platforms (web / mobile / desktop / server)
        ↓
presentation (screens, input, rendering)
        ↓
application (use cases, match/league sessions)
        ↓
domain (rules, state, simulation, balance data)
        ↑
ports (clock, random, storage, identity, network)
        ↑
adapters (browser, local save, Supabase, native SDKs)
```

Las dependencias deben apuntar hacia el dominio. El dominio no debe importar el DOM, `localStorage`, Supabase, Three.js ni SDKs de tiendas. La aplicación coordina casos de uso a través de interfaces; cada plataforma conecta esas interfaces con sus servicios concretos.

## Qué sigue siendo transitorio

- `match-engine.js` es la implementación base del dominio Arena y no usa DOM ni storage. Expone temporalmente `window.Match` para los adaptadores antiguos.
- `empire/economy.js` implementa producción y multiplicadores persistentes; `empire/progression.js` implementa puntuación, prestigio, costos, contratos y maestría como funciones puras. La aplicación todavía llama estas reglas desde un controlador web, y queda extraer las transiciones y flujos restantes.
- `arena-config.js` y `random.js` exponen `window.FactoryWars` como puente porque los adaptadores actuales usan scripts clásicos. Las nuevas reglas no deben agregar más globals.
- Las capas `arena-production-system.js`, `arena-balance-overrides.js` y `arena-tech.js` contienen reglas mezcladas con la interfaz y siguen extendiendo `Match.prototype`; deben convertirse en sistemas explícitos.
- `arena-core-runtime.js` aún combina estado de pantalla, renderizado, input, sonidos, reloj y coordinación de partida.
- `arena-experience-lab.js` y `arena-league-bridge.js` conservan telemetría y mensajes de integración dentro del adaptador web.
- `empire-controller.js` combina estado, reglas y renderizado de la Megafábrica.
- La sincronización online está repartida entre el controlador del Imperio, el sincronizador de Arena y el cliente Supabase. Debe converger en adaptadores de persistencia.
- No hay hoy un build TypeScript, app móvil nativa, app Steam ni servidor autoritativo. La PWA cubre la instalación de la web; Capacitor y las compilaciones nativas siguen reservados para trabajo futuro.

## Contratos que deben guiar el diseño

- **Reglas deterministas:** simulación y bots reciben una semilla explícita; mismos ajustes y semilla deben dar mismo resultado. No usar `Math.random()` dentro de reglas migradas.
- **Tiempo inyectado:** progreso idle y relojes de partida deben depender de un reloj proporcionado, no de llamadas directas a `Date.now()` en el dominio.
- **Estado versionado:** el formato persistido tiene versión y se transforma en el borde del adaptador. Las reglas trabajan con estado válido, no con JSON sin validar.
- **Comandos de aplicación:** la UI pide acciones como `startMatch`, `submitArenaAction`, `resolveLeagueRound`, `upgradeBuilding` y `prestigeEmpire`; no recalcula costos en el renderizado.
- **Autoridad online:** resultados enviados por un cliente no son confiables para premios. Ranked, Liga compartida y recompensas deben validarse o simularse en servidor.
- **Balance separado:** extraer reglas conserva los valores existentes. Ajustes de balance deben ser cambios distintos y citar la simulación usada.
- **Compatibilidad de saves:** cada cambio de formato conserva una migración desde las claves actuales de `localStorage` y los registros Supabase.

Para el procedimiento de creación de archivos, dependencias y revisión de cambios, seguir `docs/FILE_CONVENTIONS.md`. Para el orden de migración y criterios de paridad, ver `docs/MIGRATION_PLAN.md`.


El plan de migración a Android e iOS está en [sprints de migración móvil](sprint/SPRINTS_MIGRACION_MOBILE.md); la tarea y sus criterios de aceptación están en [TAREA_MIGRACION_MOBILE.md](tarea/TAREA_MIGRACION_MOBILE.md).

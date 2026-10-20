# Arquitectura y guía para desarrolladores

Factory Wars mantiene tres superficies activas: el cliente Unity 6, la Megafábrica web 3.1 y Arena web V2. Arena V2 es práctica local contra bot; el servidor conserva matchmaking y ranking del runtime anterior. La web V1 está archivada en `archive/v1/public/` porque el runtime del servidor aún carga esas reglas por compatibilidad. Ver [ARCHIVE_V1.md](ARCHIVE_V1.md).

## Primer recorrido por el código

El mapa visual del flujo del jugador y sus dependencias está en [GAME_FLOW.md](GAME_FLOW.md).

1. Unity abre el cliente móvil desde `unity/FactoryWars.Unity6/`.
2. `public/index.html` permite elegir Megafábrica 3.1 o Arena V2 en navegador.
3. `public/game/adapters/web/factory-v2-controller.js` coordina producción, proyectos, contratos, misiones y prestigio.
4. `public/game/domain/factory-v2/` contiene catálogo, economía incremental, progresión y guardado local de Megafábrica 3.1.
5. `public/game/adapters/web/arena-v2-controller.js` conecta la preparación, los bloqueos, los bonus y el combate local.
6. `public/game/domain/arena-v2/` contiene el motor y balance de Arena V2; `public/game/application/arena-v2-bot.js` implementa el rival de práctica.
7. El README de Unity describe sus pantallas, recursos y límites de integración.
8. El runtime online clásico sigue aislado en `server/src/game/arena-runtime.js` y lee sus reglas V1 desde `archive/v1/public/`.

Las aplicaciones web activas usan módulos ES. El orden clásico de los scripts de Arena V1 se conserva dentro de `archive/v1/public/arena.html`; el servidor V1 sigue cargando esas mismas capas desde allí.

## Estructura activa

```text
public/
  index.html                         Selector de Megafábrica 3.1 y Arena V2
  factory-v2.html                    Megafábrica web 3.1
  arena-v2.html                      Arena V2, práctica local contra bot
  game/
    domain/
      arena-v2/                      Reglas y balance del combate V2
      factory-v2/                    Catálogo, progreso y guardado de fábrica V2
    application/
      arena-v2-bot.js                Rival de práctica reproducible
    ports/                           Próxima extracción: contratos de servicios
    adapters/
      web/                           Controladores, runtime y puente de navegador
      persistence/                   Integraciones históricas; no usadas por V2
      platform/                      Punto futuro para SDKs nativos
    presentation/
      styles/                        CSS por pantalla
      screens/                       Punto futuro para vistas separadas
      components/                    Punto futuro para componentes reutilizables
    platforms/
      web/ mobile/ desktop/ server/  Puntos de composición por plataforma
    shared/                          Código compartido que no es regla de juego
archive/v1/public/                   Aplicación web V1; fuera de lo publicado por Pages
archive/legacy-v1.6/                 Snapshot histórico anterior
docs/                                Diseño, operaciones y guía de arquitectura
archive/analytics-v1/                Simulación y reportes históricos V1
supabase/                            Esquema, vistas, RPC y migraciones
tests/                               Lugar para pruebas automatizadas futuras
```

Las páginas web activas están en la raíz de `public/`. La PWA usa rutas relativas para funcionar bajo el prefijo de GitHub Pages. El archivo V1 queda fuera de `public/`, aunque sus reglas siguen incluidas en el servidor para compatibilidad. Unity es un cliente separado; su código fuente y recursos están bajo `unity/FactoryWars.Unity6/`.

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

## Límites actuales de la web

- `factory-v2-controller.js` sigue coordinando DOM, `localStorage` y el reloj de navegador; las reglas del ciclo están en `factory-v2/factory-engine.js`.
- Arena V2 se ejecuta localmente contra un bot; no conecta cuentas, Liga, partidas online ni recompensas.
- El estado web se guarda únicamente en el navegador. El cliente Unity mantiene una implementación C# separada y no comparte estado ni reglas con estos motores.
- El servidor online conserva las reglas V1 como compatibilidad; la interfaz V1 archivada no forma parte de los archivos públicos de Pages.
- No hay un build TypeScript ni una publicación móvil nativa.

## Contratos que deben guiar el diseño

- **Reglas deterministas:** simulación y bots reciben una semilla explícita; mismos ajustes y semilla deben dar mismo resultado. No usar `Math.random()` dentro de reglas migradas.
- **Tiempo inyectado:** progreso idle y relojes de partida deben depender de un reloj proporcionado, no de llamadas directas a `Date.now()` en el dominio.
- **Estado versionado:** el formato persistido tiene versión y se transforma en el borde del adaptador. Las reglas trabajan con estado válido, no con JSON sin validar.
- **Comandos de aplicación:** la UI pide acciones como `startMatch`, `submitArenaAction`, `resolveLeagueRound`, `upgradeBuilding` y `prestigeEmpire`; no recalcula costos en el renderizado.
- **Autoridad online:** resultados enviados por un cliente no son confiables para premios. Ranked, Liga compartida y recompensas deben validarse o simularse en servidor.
- **Balance separado:** extraer reglas conserva los valores existentes. Ajustes de balance deben ser cambios distintos y citar la simulación usada.
- **Compatibilidad de saves:** cada cambio de formato conserva una migración desde las claves actuales de `localStorage` y los registros Supabase.

Para el procedimiento de creación de archivos, dependencias y revisión de cambios, seguir `docs/FILE_CONVENTIONS.md`. El plan histórico de migración web V1 se conserva en `archive/docs-v1.6/MIGRATION_PLAN.md`.


Las instrucciones vigentes para abrir y compilar el cliente móvil están en [README de Unity](../unity/FactoryWars.Unity6/README.md). Los planes móviles anteriores se conservaron en `archive/docs-v1.6/`.

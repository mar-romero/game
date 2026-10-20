# Megafábrica V3.1 — dominio local

La URL `public/factory-v2.html` y el directorio `factory-v2/` se conservan por compatibilidad. La especificación de rutas, fórmulas, límites, migración y checks está en [MEGAFABRICA_V31.md](../../../../docs/MEGAFABRICA_V31.md).

## Archivos y API

- `catalog.js`: datos industriales e investigaciones importadas del catálogo Arena v2; `SAVE_KEY` compartida y `SCHEMA_VERSION = 2`.
- `factory-engine.js`: `createFactory(now)`, `advanceFactory(state, now)` y `executeCommand(state, command, now)`. Comandos: `chooseRoute`, `setMode`, `upgrade`, `selectProject`, `deliverProject`, `startContract` y `prestige`. Devuelve estados nuevos; un rechazo conserva el estado recibido.
- Consultas: `productionRates`, `buildingCost`, `projectCost`, `projectProgress`, `projectMultiplier`, `contractCost`, `contractReward`, `contractDuration`, `missingResources`, `missions`, `availableResearch`, `canPrestige`, `exportUnlocks`.
- `save-format.js`: `validateState`, `decodeSave`, `encodeSave` y `legacyBackupPlan`. La última decide un destino libre o idéntico para respaldar el JSON V2 mediante lectura inyectada; no escribe en storage.

El dominio recibe un reloj en milisegundos; no importa DOM, navegador, almacenamiento ni red. Producción por ausencia: hasta 4 horas; edificios: hasta nivel 50; prestigios: hasta 100. Repetir avance con la misma fecha no duplica producción ni contratos. Un reloj que retrocede se rechaza.

## Compatibilidad

`decodeSave` convierte esquema 1 a 2 conservando exactamente el progreso. La ruta `legacy` mantiene costos, producción, recompensas, entregas y objetivos V2 hasta su próximo prestigio. El esquema 2 sigue siendo legible sin migración adicional.

El arsenal inicial es 4 cohetes, 4 defensas, 3 sabotajes y el bonus `expansion`. Hay otras 28 investigaciones; no se repiten ni alteran automáticamente estadísticas de combate. Al agotarlas, los prestigios adicionales mejoran solo la industria.

Arena v2 lee `factory-wars.factory-v2.local.v1` mediante `decodeSave` y `exportUnlocks` desde el mismo origen y navegador. Datos inválidos o inaccesibles hacen que Arena use el arsenal inicial sin escribir en la fábrica. Un combate o preparación ya resuelto conserva sus opciones. No hay sincronización con cuentas, servidor, Supabase o Unity.

El controlador guarda una sola transición de prestigio y adopta el estado después de escribir. Respalda el JSON V2 antes de migrarlo, pausa ante error de storage o cambio de otra pestaña y conserva datos corruptos o futuros. La comparación previa de `localStorage` no garantiza exclusión entre escrituras simultáneas.

## Validación

`node tests/factory-v3.test.mjs` ejercita migración fraccional y completa, costos heredados, contratos, modos, series, límites, export Arena y 100 ciclos pagados. `node tests/measure-factory-v31.mjs resultados-v31 100` genera medidas de políticas deterministas. La ejecución y sus resultados deben registrarse por tarea; estos comandos no constituyen evidencia de validación visual.

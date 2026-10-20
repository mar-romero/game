# Migración de arquitectura

## Objetivo

Ordenar Factory Wars en módulos que se entiendan por carpeta, manteniendo el juego actual como referencia y conservando sus reglas, datos guardados y rutas públicas. El mismo dominio debe poder conectarse a web, móvil, Steam, simulador headless y un servidor autoritativo.

## Cambios ya hechos

- Se preservó el estado original de los 38 archivos versionados en `legacy/v1.6/` antes de reorganizar el runtime.
- Se movieron los controladores y recursos web a `public/game/` por responsabilidad. `index.html` y `arena.html` siguen en `public/` para conservar URLs existentes.
- Se descompuso el runtime inline en campaña, controlador de Arena, sistemas de producción, ajustes de balance, telemetría y puente de Liga; se conservó el orden síncrono de carga.
- Se externalizaron las reglas base de `Match` a `game/domain/arena/match-engine.js`. Bots, costes, acciones, estado, tiempo y resolución de combate ya salen de esa implementación.
- Se extrajeron los cálculos de producción del Imperio a `game/domain/empire/economy.js` y el controlador activo los consume.
- Se extrajeron las reglas puras de puntuación, progreso de prestigio, costos, contratos y maestría a `game/domain/empire/progression.js` y el controlador activo las consume.
- Se movieron catálogos de civilizaciones, edificios, investigaciones y módulos construibles a `game/domain/`; los controladores activos los consumen.
- Se extrajeron todas las hojas de estilo inline de Arena a `game/presentation/styles/arena.css`.
- Se movieron el controlador de Imperio, las extensiones de Arena y configuración de Supabase a carpetas por responsabilidad.
- Se movió la sincronización de Arena a `game/adapters/persistence/arena-online.js`.
- Se extrajeron configuración de balance y RNG a `game/domain/arena-config.js` y `game/domain/random.js`; el motor activo ya consume esas implementaciones.
- Se documentaron dependencias, contratos, carpetas y convenciones para nuevos archivos.

## Trabajo requerido para declarar la migración de reglas completa

La reorganización de archivos ya mantiene los puntos de entrada existentes, pero hay reglas que siguen mezcladas con UI. Las etapas de abajo son trabajo pendiente de implementación; no se deben confundir con funcionalidades ya migradas.

1. Separar `Match` en sistemas de economía, cola industrial, ataques, escudos, sabotaje, nodo, bots y fin de partida. Sustituir los wrappers de prototipo por sistemas explícitos en el paso de simulación.
2. Definir estado de Liga e Imperio en dominio y mover sus flujos a casos de uso de `application/`; mantener las pantallas como cliente de comandos.
3. Definir puertos de reloj, almacenamiento, identidad, telemetría y backend. Mover `localStorage` y llamadas Supabase a adaptadores; ahora el RNG de Arena ya se inyecta desde dominio.
4. Añadir migradores de saves y estado Supabase con versión explícita. Comparar juego local, cuenta online y recuperación de versión antigua.
5. Caracterizar reglas y formatos con pruebas de paridad antes de retirar wrappers o cambiar comportamiento.
6. Introducir TypeScript y build de módulos cuando los límites de imports estén listos. Generar el sitio estático desde una carpeta build; mantener `/` y `/arena.html` para Pages y automatizaciones.
7. Conectar web, Capacitor móvil y Steam a la misma aplicación. Validar dispositivos, controles, ciclo de vida y saves.
8. Crear servidor autoritativo para ranked, Liga y recompensas; ningún cliente decide por sí solo premios competitivos.

## Criterio de cierre

Una regla solo se considera migrada cuando existe una implementación única en dominio, los adaptadores la llaman, la paridad con v1.6 está cubierta y los datos guardados antiguos siguen cargando. La UI aún depende de un puente global, y varias capas de reglas siguen aplicándose como wrappers; hasta quitar esas dos dependencias no se declara cerrada la migración modular. El snapshot se mantiene intacto y no recibe nuevas funcionalidades.

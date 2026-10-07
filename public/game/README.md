# Código del juego

Este es el árbol activo de Factory Wars. El juego web carga estos archivos directamente desde `public/`; `index.html` y `arena.html` son las entradas estables. El snapshot anterior está fuera de este árbol, en `legacy/v1.6/`.

- `domain/arena-config.js`: valores de balance de Arena.
- `domain/random.js`: generador pseudoaleatorio determinista.
- `domain/arena/match-engine.js`: estado y reglas base de `Match`.
- `domain/arena/industrial-modules.js`: datos de módulos construibles durante Arena.
- `domain/empire/catalog.js`: civilizaciones, edificios, investigaciones y rutas.
- `domain/empire/economy.js`: producción persistente de la Megafábrica.
- `domain/empire/progression.js`: puntuación, prestigio, costos, contratos y dominio de civilizaciones.
- `adapters/web/`: controladores de interfaz y compatibilidad con scripts clásicos.
- `adapters/persistence/`: sincronización de Arena con Supabase.
- `presentation/styles/`: hojas de estilo por pantalla.
- `application/`, `ports/` y carpetas de plataforma: límites preparados para próximas extracciones; ver el README de cada carpeta.

La guía de dependencias está en [Arquitectura](../../docs/ARCHITECTURE.md). Las convenciones para nuevos archivos están en [FILE_CONVENTIONS.md](../../docs/FILE_CONVENTIONS.md), y las etapas pendientes en [MIGRATION_PLAN.md](../../docs/MIGRATION_PLAN.md).

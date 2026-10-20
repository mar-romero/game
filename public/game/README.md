# Código activo del juego

El sitio web activo carga las pantallas V2 desde `public/`: `../index.html` permite abrir Megafábrica v2 y Arena v2.

- `domain/arena-v2/`: reglas y balance del combate local.
- `domain/factory-v2/`: recursos, producción, prestigio y guardado local.
- `application/arena-v2-bot.js`: rival de práctica.
- `adapters/web/`: controladores de las pantallas activas y registro de la PWA.
- `presentation/styles/`: estilos de Arena y Megafábrica v2.

El juego web V1 está archivado en `../../archive/v1/public/`. Su runtime de servidor se conserva para compatibilidad; el sitio V2 no lo utiliza. Ver [archivo V1](../../docs/ARCHIVE_V1.md).

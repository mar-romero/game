# Adaptadores web

Código que conecta el juego con el navegador: controladores, scripts clásicos, DOM y configuración web. `campaign-lab.js` conserva la campaña visual histórica; `arena-core-runtime.js` coordina la pantalla y la sesión; los archivos `arena-*` contienen extensiones históricas en el orden indicado por `arena.html`; `empire-controller.js` coordina la pantalla de Imperio. El motor base está en `domain/arena/match-engine.js`. No agregues reglas nuevas aquí: las extensiones existentes se reemplazarán por sistemas del dominio.

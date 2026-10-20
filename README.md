# Factory Wars

Factory Wars se concentra en tres superficies activas:

- **Unity 6:** cliente móvil en `unity/FactoryWars.Unity6/`, con pantallas de Megafábrica, Arena y ranking. Consultá su [README](unity/FactoryWars.Unity6/README.md) para conocer qué funciones son locales y cuáles usan el API.
- **Megafábrica 3.1:** progresión industrial web en [`public/factory-v2.html`](public/factory-v2.html), con recursos, proyectos, contratos, misiones, prestigio e investigaciones.
- **Arena V2:** combate web local contra bot en [`public/arena-v2.html`](public/arena-v2.html). El motor y el balance están en `public/game/domain/arena-v2/`.

## Ejecutar la versión web

Desde la raíz del repositorio, ejecutá:

```powershell
python serve.py
```

Después abrí `http://localhost:8000/`. También podés entrar directamente a `/factory-v2.html` o `/arena-v2.html`.

## API online

`server/` conserva la API de cuenta, estado de Megafábrica y temporada/ranking usada por Unity. El runtime online de Arena sigue usando reglas V1; Arena V2 todavía no está conectada a matchmaking, resultados ni premios online. Para levantar el API local, configurar `.env.online` a partir de `.env.online.example` y seguir [la guía de entorno local](docs/ONLINE_LOCAL_SETUP.md).

## Organización

- `unity/FactoryWars.Unity6/`: proyecto Unity y recursos fuente. Las carpetas generadas por el Editor se regeneran y están ignoradas por Git.
- `public/`: páginas web activas y código de Megafábrica 3.1/Arena V2.
- `server/` y `supabase/`: API, autenticación, persistencia y temporada/ranking.
- `docs/`: arquitectura, flujo activo, diseño de Arena V2, Megafábrica 3.1 y operaciones.
- `archive/`: cliente V1 requerido por compatibilidad, snapshots y documentación/artefactos históricos.

La documentación antigua quedó preservada bajo `archive/`; el [mapa de arquitectura](docs/ARCHITECTURE.md) y el [flujo actual](docs/GAME_FLOW.md) describen las rutas vigentes.

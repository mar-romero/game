# Factory Wars · Unity 6 mobile client

This is a parallel, original Unity client shell for the mobile-first direction. It does not replace or modify the current HTML/CSS/JavaScript client. Open this folder as a Unity project with Unity 6.0, create/open a scene, and press Play; the runtime bootstrap creates the vertical Canvas interface. FAB starts with the illustrated 2D island from `Resources/MegafactoryIsland.png`; no procedural 3D world is created.

## Current screens

- **Megafábrica:** FAB starts on the current portrait 2D island and its local V2 save. Tapping a building, its label or the resource HUD plus opens that building's upgrade popup: current/max level, current/next production, cost, live balance, upgrade availability and close. The central hub and bottom island label open Prestige progress, Projects, Contracts, Missions and PvP research over the same island artwork. Building upgrades are accessed from the island, with no producer category in this menu.
- **PvP:** illustrated Megafactory lobby with rocket, shield, sabotage, block, research, bot-practice and ranking entry points. The local match uses two smaller opposing factory islands with a central lane and live combat HUD. Ranked matches and online matchmaking remain unavailable.
- **Ranking:** authenticated server standings (`GET /api/v1/leaderboard`), season ID, your position/points/rating/results, and a real season enrollment button (`POST /api/v1/season/join`). Loading, empty, HTTP error/retry and sign-in states are explicit; it does not display fabricated standings.
- **Civilizaciones:** the existing four catalog entries (`forge`, `bastion`, `swarm`, `nexus`) and their documented bonuses, presented as faction cards. Selection is saved through the server for an online account; without an account it remains a clearly labeled local preview.

There is no Imperio tab. “Megafábrica” is the persistent factory presentation from the requested menu set.

## Build targets

In Unity Hub, install Unity 6.0 and add the Android Build Support module (SDK/NDK/OpenJDK), iOS Build Support (macOS/Xcode is required to produce/sign the iOS app), and WebGL Build Support. In **File → Build Profiles**, create a profile for **Android**, **iOS**, or **Web** (Unity's WebGL target). Set portrait orientation for mobile profiles. The same scene/runtime code is used by each build target; browser and native performance still need device testing.

The project includes a minimal serialized entry scene in `Assets/Scenes/FactoryWarsMobile.unity`; the bootstrap creates the 2D interface at runtime. Web builds need a host configured for Unity's generated files and compression headers; GitHub Pages deployment has not been configured or tested here.

## Integration status

| Existing system | Unity client status |
|---|---|
| `public/game/domain/factory-v2/catalog.js` | Factory and research concepts are represented in the Unity presentation. The JavaScript catalog is not imported or shared as runtime code. |
| Megafactory save, production, upgrades, research, contracts | Megafábrica now signs in to an existing email-linked account, loads server state, advances production on explicit refresh, and sends server-validated building, research, doctrine, contract and civilization commands. Prestige UI is not migrated yet. |
| Arena `Match` rules, bot, actions, rewards | Not ported or connected. The PvP view is a presentation preview; its card icons are not gameplay commands. |
| Supabase identity and Megafábrica HTTP API | Megafábrica UI is wired to email/password sign-in, in-memory token refresh, `GET /api/v1/me`, advance and server-validated commands. |
| Matchmaking | Not connected. The search button still emits `arena.request_matchmaking`; no queue or WebSocket connection exists yet. |
| Leaderboard and season enrollment | Ranking loads `/me` and `/leaderboard` with the signed-in account. Join sends `{}` to `/season/join`; the server chooses civilization from saved Megafábrica state. Successful enrollment reloads standings. |
| Server-authoritative competitive results | Ranking displays existing server results. Unity does not submit matches or generate results/rewards. |

### Arena v2 presentation in Unity

Unity's Arena lobby uses `ArenaMegafactoryMenu.png`: the Megafactory island, rockets ascending above it, a shield dome and a sabotage signal, with real Unity buttons over the lower open area. The battle uses `ArenaMegafactoryBattlefield.png`, with smaller blue and red Megafactories facing each other across the central channel. The lobby routes loadout families to their collection, blocks to block selection, research to the Megafactory research screen, bot practice to the local match, and ranking to the standings. Practice shows the five-minute clock, 1000-point cores, 240 starting Credits, 100 Energy, economic upgrades, rocket travel and impacts, shield capacity, sabotage notices, guardian travel/node control, reconfiguration notices, the combat feed, and a two-order queue with the requested same-type third slot.

This is a lightweight Unity practice loop, not a port of the full `arena-v2/match-engine.js`. It currently exposes a small fixed set of actions and a basic deterministic bot. The ten-option catalogs, draft and bans, all bonus effects, full shield/sabotage variants, guardian group selection, exact bot archetypes, and simultaneous-tick resolution are not implemented in Unity. The lobby's ranked-match option is visibly unavailable; its Ranking action opens season standings and does not start a battle. PvP research unlocks are displayed in Megafactory but are not yet applied to the Unity Arena loadout. No online PvP, official results, rewards, or matchmaking are connected; do not use this local result for ranking.

`FactoryWarsMobileApp.onIntegrationRequested` remains the seam for the unconnected views. Configure the API root URL, Supabase URL, and public key in `Assets/Resources/FactoryWarsApiConfiguration.asset` in the Unity Editor before building; the API root must be the server origin because the adapter adds `/api/v1`. The login UI cannot change these endpoints. Remote URLs must use HTTPS; plain HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1` during local development. Only an existing email/password account can sign in: the client never creates an anonymous account or imports a browser save. A player using an anonymous web account must link it to email before using that account in Unity. Access and refresh tokens stay in memory and are lost when the app process exits, so users must sign in again after restart. Passwords are used only for the sign-in request and are not retained. For an ambiguous Megafactory command result, the UI writes only that pending command, its UUID, and the Supabase user ID to `Application.persistentDataPath`; it is scoped per user and allows a manual retry with the same event ID after restarting. It is not a game save and contains no credentials or resource state. The adapter does not retry automatically. Invalid or incomplete JSON responses are reported as HTTP status 502 so the UI treats them as ambiguous and does not apply partial state. Requests completing after sign-out or an account change are discarded. Megafactory state changes only through successful server responses; the Arena practice loop is separate and exists only in local memory for that session.

No external packages beyond Unity UI (UGUI) are required. UI pictograms use short text labels for font portability. FAB, Arena lobby, and local battle use illustrated Sprites behind interactive built-in UI; navigation toggles the existing procedural world backdrop for Arena. Artwork is an original stylized illustration.

### Ranking flow

1. Sign in under **RANKING** with an existing email/password account and choose a civilization under **CIVILIZACIONES**. FAB uses the separate local V2 save and requires no account.
2. Open **TOP**: the screen reloads your factory profile and the official server standings. Your row is matched by `participant_id == "human:" + session.userId`, never by nickname. The displayed order is the server order; bots are labeled.
3. If you are not enrolled, press **UNIRME A LA TEMPORADA**. The server validates civilization, season state and capacity. If a factory command is awaiting confirmation, resolve it in FAB first.
4. Press **ACTUALIZAR CLASIFICACIÓN** to reload. HTTP/transport errors show a retry action that consults current state, including after an ambiguous enrollment response.

Leaving the tab, reopening it, signing out, or changing account invalidates pending Ranking callbacks. Standings are not cached across visits. Enrollment may complete on the server after leaving the tab; reopening TOP consults its actual result. Unity still needs Play Mode validation for rendering, authentication, successful enrollment, closed/full season errors, network failure/retry, and rapid navigation/sign-out during requests.

## Verification limits

The current menu change compiles with Unity's Roslyn response files. Play Mode rendering and interaction, mobile builds, input, performance, Supabase login, CORS and live API connections still require Unity runtime validation. Compilation and static source inspection do not establish runtime or backend behavior.

### Megafábrica V2 local

FAB y el arranque usan la isla 2D con el guardado local V2. El centro abre las categorías de progreso sobre ese mismo fondo: prestigio, proyectos, contratos, misiones e investigación PvP. Cada una de las cuatro fábricas abre su propia ficha de mejora; el botón se deshabilita si faltan Créditos o se alcanzó el nivel 50 y se actualiza con la producción en curso. Conserva los costos ×1,4, el límite offline de cuatro horas, la entrega progresiva de uno de tres proyectos, los contratos con una orden activa y cobro automático, las tres misiones de ciclo y el prestigio que reinicia recursos/niveles y conserva un nuevo desbloqueo permanente. Hay 28 opciones de investigación: seis cohetes, seis defensas, siete sabotajes y nueve bonus elegibles; cada prestigio permite guardar una opción no repetida, que amplía alternativas sin cambiar estadísticas.

El estado vive en `PlayerPrefs` bajo una clave Unity V2 propia. No lee ni modifica el perfil legado ni el guardado de la web. Si el JSON falta, está dañado o usa una versión desconocida, se conserva y la pantalla ofrece regresar o reiniciar explícitamente solo el guardado Unity V2. Estos desbloqueos se muestran en la colección local; Arena V2 de Unity todavía no los aplica al catálogo de combate. La lógica web completa de Megafábrica V2 no se comparte directamente con C#: esta es una implementación nativa con los mismos precios, recursos, proyectos, contratos, misiones, límite offline e IDs/descripciones del catálogo Arena V2.

# Factory Wars · Unity 6 mobile client

This is a parallel, original Unity client shell for the mobile-first direction. It does not replace or modify the current HTML/CSS/JavaScript client. Open this folder as a Unity project with Unity 6.0, create/open a scene, and press Play; the runtime bootstrap creates the vertical Canvas interface. FAB starts with the illustrated 2D island from `Resources/MegafactoryIsland.png`; no procedural 3D world is created.

## Current screens

- **Megafábrica:** a portrait 9:16 island illustration with four producer level/output labels supplied from the server profile (or `—` placeholders before sign-in). Tapping a producer scrolls to building improvements; tapping the central hub scrolls to research/contracts, and the bottom island label opens account management. Resource HUD and navigation remain live Canvas controls; the image contains no baked numbers or navigation. Detailed account, improvement, research and contract controls remain below the island.
- **PvP:** portrait arena presentation with player/rival towers, river and bridges, match HUD, timer, score, sample card hand, and a matchmaking action seam that reports that no service is connected. Cards and energy are visual only; no match actions or results are sent.
- **Ranking:** authenticated server standings (`GET /api/v1/leaderboard`), season ID, your position/points/rating/results, and a real season enrollment button (`POST /api/v1/season/join`). Loading, empty, HTTP error/retry and sign-in states are explicit; it does not display fabricated standings.
- **Civilizaciones:** the existing four catalog entries (`forge`, `bastion`, `swarm`, `nexus`) and their documented bonuses, presented as faction cards. Selection is saved through the server for an online account; without an account it remains a clearly labeled local preview.

There is no Imperio tab. “Megafábrica” is the persistent factory presentation from the requested menu set.

## Build targets

In Unity Hub, install Unity 6.0 and add the Android Build Support module (SDK/NDK/OpenJDK), iOS Build Support (macOS/Xcode is required to produce/sign the iOS app), and WebGL Build Support. In **File → Build Profiles**, create a profile for **Android**, **iOS**, or **Web** (Unity's WebGL target). Set portrait orientation for mobile profiles. The same scene/runtime code is used by each build target; browser and native performance still need device testing.

The project includes a minimal serialized entry scene in `Assets/Scenes/FactoryWarsMobile.unity`; the bootstrap creates the 2D interface at runtime. Web builds need a host configured for Unity's generated files and compression headers; GitHub Pages deployment has not been configured or tested here.

## Integration status

| Existing system | Unity client status |
|---|---|
| `public/game/domain/empire/catalog.js` | Civilization IDs, labels and stated bonuses are represented in the presentation. The JavaScript catalog is not imported or shared as runtime code. |
| Megafactory save, production, upgrades, research, contracts | Megafábrica now signs in to an existing email-linked account, loads server state, advances production on explicit refresh, and sends server-validated building, research, doctrine, contract and civilization commands. Prestige UI is not migrated yet. |
| Arena `Match` rules, bot, actions, rewards | Not ported or connected. The PvP view is a presentation preview; its card icons are not gameplay commands. |
| Supabase identity and Megafábrica HTTP API | Megafábrica UI is wired to email/password sign-in, in-memory token refresh, `GET /api/v1/me`, advance and server-validated commands. |
| Matchmaking | Not connected. The search button still emits `arena.request_matchmaking`; no queue or WebSocket connection exists yet. |
| Leaderboard and season enrollment | Ranking loads `/me` and `/leaderboard` with the signed-in account. Join sends `{}` to `/season/join`; the server chooses civilization from saved Megafábrica state. Successful enrollment reloads standings. |
| Server-authoritative competitive results | Ranking displays existing server results. Unity does not submit matches or generate results/rewards. |

`FactoryWarsMobileApp.onIntegrationRequested` remains the seam for the unconnected views. Configure the API root URL, Supabase URL, and public key in `Assets/Resources/FactoryWarsApiConfiguration.asset` in the Unity Editor before building; the API root must be the server origin because the adapter adds `/api/v1`. The login UI cannot change these endpoints. Remote URLs must use HTTPS; plain HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1` during local development. Only an existing email/password account can sign in: the client never creates an anonymous account or imports a browser save. A player using an anonymous web account must link it to email before using that account in Unity. Access and refresh tokens stay in memory and are lost when the app process exits, so users must sign in again after restart. Passwords are used only for the sign-in request and are not retained. For an ambiguous command result, the UI writes only that pending command, its UUID, and the Supabase user ID to `Application.persistentDataPath`; it is scoped per user and allows a manual retry with the same event ID after restarting. It is not a game save and contains no credentials or resource state. The adapter does not retry automatically. Invalid or incomplete JSON responses are reported as HTTP status 502 so the UI treats them as ambiguous and does not apply partial state. Requests completing after sign-out or an account change are discarded. No game state is changed locally; successful server responses are the only source for UI state.

No external packages beyond Unity UI (UGUI) are required. UI pictograms use short text labels for font portability. FAB uses one illustrated Sprite behind interactive built-in UI; PvP retains its 2D preview map. The old procedural helpers are not called by the bootstrap or navigation. Artwork is an original stylized illustration.

### Ranking flow

1. Sign in under **FAB** with an existing email/password account and choose a civilization.
2. Open **TOP**: the screen reloads your factory profile and the official server standings. Your row is matched by `participant_id == "human:" + session.userId`, never by nickname. The displayed order is the server order; bots are labeled.
3. If you are not enrolled, press **UNIRME A LA TEMPORADA**. The server validates civilization, season state and capacity. If a factory command is awaiting confirmation, resolve it in FAB first.
4. Press **ACTUALIZAR CLASIFICACIÓN** to reload. HTTP/transport errors show a retry action that consults current state, including after an ambiguous enrollment response.

Leaving the tab, reopening it, signing out, or changing account invalidates pending Ranking callbacks. Standings are not cached across visits. Enrollment may complete on the server after leaving the tab; reopening TOP consults its actual result. Unity still needs Play Mode validation for rendering, authentication, successful enrollment, closed/full season errors, network failure/retry, and rapid navigation/sign-out during requests.

## Verification limits

Unity Hub/Editor and .NET are not installed in the current environment, so this project and the API adapter have not been compiled, opened in Play Mode, or built for Android/iOS/WebGL. The folder and project configuration are provided for the Unity 6 Editor; actual rendering, build profiles, input, performance, Supabase login, CORS, and live API connections remain to be validated there. Static source inspection is not runtime or backend verification.

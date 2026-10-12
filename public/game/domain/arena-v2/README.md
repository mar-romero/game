# Nuevo motor de Arena: estado e integración

Entrada: `public/arena-v2.html`. Es una **práctica local contra bot** con módulos ES: abrirla desde el servidor web del repo, no desde `file://`. Las reglas de este documento están escritas en v2; su funcionamiento completo en navegador y su balance aún necesitan validación. La Arena integrada y la Megafábrica todavía usan el motor anterior.

## Implementado en v2

- Catálogo de 10 cohetes, 10 defensas y 10 sabotajes. Se eligen listas únicas de **4/4/3**, o **5/5/4** con un bonus de reserva familiar y la variante adicional investigada. Tras el bloqueo se conservan como máximo **3 cohetes, 3 defensas y 3 sabotajes** (4 en la familia elegida con bonus). Los candidatos restantes funcionan como reemplazo ante un bloqueo coincidente.
- Cada jugador elige su bonus fijo y prepara un bloqueo por familia contra el otro antes de empezar. Si el bloqueo no coincide con la lista, no elimina nada. Si coincide, la siguiente opción ordenada ocupa su lugar; el motor limita las opciones utilizables a las cantidades anteriores.
- Base activa **2 cohetes / 2 defensas / 1 sabotaje**. Las demás opciones utilizables son reservas. Sin bloqueo coincidente, sabotaje conserva dos reservas; con bloqueo coincidente, una (más una si lleva bonus de reserva). Son acciones reutilizables con recarga, pagadas con Créditos.
- **Un bonus fijo** elegido antes de preparar la lista. Sus diez opciones incluyen economía, guardianes, emergencia y reconfiguración; cada uno se aplica a toda la partida. `Reconfiguración eficiente` cobra 35 Energía por cambio. Para una reserva extra familiar se necesita investigar una quinta variante de cohete/defensa o una cuarta de sabotaje.
- Los activos siempre son **2 cohetes / 2 defensas / 1 sabotaje**. Los bonus familiares agregan una opción utilizable de reserva, no un espacio activo ni un uso extra. Un candidato extra queda como reemplazo si el bloqueo coincide; sin bloqueo se respeta el límite de opciones utilizables.
- 100 Energía inicial, normalmente 40 por cambio (35 con Reconfiguración eficiente), una reconfiguración por familia y una en curso por jugador. Paga y consume el cambio al iniciarlo; dura 5 s. La UI anuncia la familia y oculta el destino rival hasta concluir. La recarga del espacio sigue corriendo; cohetes y escudos ya desplegados mantienen su variante.
- Nodo con hasta +20 Energía **por jugador y partida**, extraídos gradualmente en 180 s de control acumulado. Lo obtenido se conserva al perder control. No entrega otros recursos ni existe un regalo automático a los 4:30.
- Guardianes: 65 Créditos cada uno, viaje de 8 s, recarga de 8 s, hasta 5 por envío. Fuerzas iguales neutralizan el nodo; fuerzas superiores conservan la diferencia. El control requiere disputa para cambiar de dueño.
- Economía: 240 Créditos iniciales, ingresos por niveles 9/15/24/38 por segundo, mejoras de 165/360/720. «Mejorar economía» es la única compra que aumenta esos ingresos. Ataques, defensas, sabotajes, mejoras de economía y guardianes usan los mismos Créditos. No traslada recursos industriales desde la Megafábrica persistente.
- Partidas de 5 minutos: núcleo destruido termina el combate; al agotarse el tiempo gana quien conserva más vida, empate si igualan. Se resuelven los impactos del mismo tick antes de decidir el resultado.
- Seis perfiles seleccionables: Equilibrado, Presión, Economista, Defensor, Control del nodo y Saboteador. Cada uno prioriza bonus y arsenal distintos, y evalúa de otra forma economía, ataques, escudos, sabotajes, guardianes y reconfiguración. Son heurísticas deterministas de práctica; no afirman equivalencia ni balance medido contra humanos.

## Pendiente para PvP integral

| Trabajo | Qué falta |
|---|---|
| Investigaciones de Megafábrica | La práctica ya lee `factory-wars.factory-v2.local.v1` usando `decodeSave` y `exportUnlocks`, filtra el arsenal de ambos jugadores y pasa una copia congelada a `resolveLoadout` y `ArenaMatch`. Faltan integración con el juego principal, migración de guardados anteriores y una autoridad de cuenta/servidor. Investigar amplía opciones con compensaciones, sin aumentar automáticamente sus estadísticas. |
| Humanos y bloqueos online | Matchmaking, identidad, confirmación mutua de listas/bloqueos/bonus y protocolo competitivo de información oculta. Hoy los bloqueos del rival son del bot y la preparación muestra ambas configuraciones. |
| Autoridad y sincronización | Servidor que valide comandos, avance y resultados, además de autenticación, reconexión y sincronización. El estado local no es autoridad competitiva. |
| Premios y Liga | Adaptar resultado, recompensas, eventos del iframe y Liga al nuevo API, con resultados autorizados por servidor. No hay premios en esta práctica. |
| Balance y experiencia | Medir economía, counters y tiempos con semillas y partidas; validar comportamiento, móvil, foco, señales y accesibilidad en navegador. No se asegura extracción al minuto 4 cuando hay disputa. |
| Unity | Conectar este contrato al combate de Unity; esta entrada no lo implementa. |

## Dónde está cada parte

| Archivo | Funciones o datos relevantes |
|---|---|
| `public/arena-v2.html` | Elección de bonus, estilo de rival, listas y bloqueos; carga un único módulo de UI. |
| `balance.js` | `BALANCE`: economía/tiempos; `CATALOG`: 30 variantes; `BONUSES`: 10 bonus; `candidateCountsForBonus`: tamaños 4/4/3 o 5/5/4; `defaultLoadout`: lista según bonus. |
| `match-engine.js` | `resolveLoadout`: listas/bans/slots/reservas; constructor: bonus fijo y estado; `income`/`quote`/`dispatch`: economía y comandos; `_sabotage`/`_effect`: interferencias; `_emergency`: bonus de reserva y defensa automática; `_tick`: tiempo/recargas/nodo/cambios; `_arrive`: impactos/escudos/guardianes; `snapshot`: vista que oculta destino/reservas rivales. |
| `public/game/application/arena-v2-bot.js` | `BOT_ARCHETYPES`: preferencias de draft; `ArenaPracticeBot.think`: políticas de combate con semilla y comandos cotizados. |
| `public/game/adapters/web/arena-v2-controller.js` | `refreshFactoryUnlocks`: lectura validada y opciones elegibles; `usableBonuses`/`resizeCandidates`: requisitos de investigación y tamaños; `renderPreparation`: bonus y listas previos al bloqueo; `renderPreview`: bloqueos; `renderBattle`: acciones, objetivos, reservas, señales; `frame`: avance local. |
| `public/game/presentation/styles/arena-v2.css` | Controles, grillas y presentación adaptable. |
| `docs/newPVP.md` | Acuerdo de producto y diagramas. Este README registra lo que está escrito y las integraciones pendientes. |

### Mapa de líneas del alcance

Los rangos corresponden a esta implementación y pueden desplazarse al editar; los nombres de funciones de arriba son la referencia estable.

| Archivo | Líneas | Contenido |
|---|---|---|
| `balance.js` | 6–17 | Reglas, costos globales y tamaños 4/4/3 y 2/2/1. |
| `balance.js` | 18–55 | Catálogo completo 10/10/10 y valores provisionales. |
| `balance.js` | 57–72 | Diez bonus fijos y listas por defecto. |
| `match-engine.js` | 7–28 | Bloqueos, opciones disponibles, slots y reservas. |
| `match-engine.js` | 47–97 | Creación de partida, bonus fijo, vistas e ingresos. |
| `match-engine.js` | 99–227 | Costos, validación, acciones, cambios, sabotajes y emergencias. |
| `match-engine.js` | 229–355 | Tiempo, nodo, recargas, impactos, defensas y final. |
| `arena-v2-controller.js` | 16–47 | Lectura validada de la fábrica, comparación de opciones, disponibilidad congelable y recuperación con arsenal inicial. |
| `arena-v2-controller.js` | Rangos cambian con ediciones | Bonus antes de preparar, opciones extra, storage, bot elegible y vista de bloqueos con desbloqueos. |
| `arena-v2-controller.js` | 158–294 | Inicio con `prepared.unlocks`, controles de combate, reinicio, objetivos, HUD y avance local; el HUD sigue actualizándose con un selector enfocado y los objetivos se reinician por partida. |
| `arena-v2-bot.js` | 1–53 | Rival de práctica con slots y sabotajes dinámicos. |
| `public/arena-v2.html` | 1–43 | Entrada de práctica, estado de conexión y explicación de las mejoras económicas del combate. |
| `arena-v2.css` | 1–29 | Presentación y grillas adaptables. |
| `docs/newPVP.md` | 1–246 | Diseño acordado y diagramas. |

## Catálogo provisional ejecutable

Los IDs son contrato del prototipo. `fast` representa Rastreador y `heavy` Asedio para conservar los IDs anteriores. **C** significa Créditos; los tiempos están en segundos. Valores completos en `CATALOG`, incluyendo recargas. Los sabotajes con objetivo necesitan `targetFamily`; Precisión además necesita `targetSlot`.

| Cohete ID | Nombre | Costo C | Efecto |
|---|---|---:|---|
| `fast` | Rastreador | 110 | 120 daño; viaje 4; recarga 10. |
| `heavy` | Asedio | 275 | 300 daño; viaje 10; recarga 18. |
| `burst` | Ráfaga | 190 | 3 × 75 daño, separados 0,6; viaje inicial 6; recarga 14. |
| `piercing` | Perforante | 205 | 170 daño, 45% atraviesa; viaje 8; recarga 16. |
| `breaker` | Rompeescudos | 165 | 90 daño, consume 2,5 × capacidad; viaje 7; recarga 16. |
| `emp` | Pulso EMP | 135 | 35 daño, demora escudos 3; efecto 6; viaje 5; recarga 22. |
| `vector` | Doble vector | 225 | 2 × 125 daño separados 2; viaje inicial 6; recarga 17. |
| `exposed` | Carga de núcleo | 195 | 140 daño o 252 sin escudos activos al llegar; viaje 8; recarga 18. |
| `economical` | Cohete económico | 60 | 70 daño; viaje 7; recarga 19. |
| `node` | Disruptor de nodo | 125 | 40 daño, demora guardianes 3; efecto 8; viaje 6; recarga 24. |

EMP/Disruptor demoran tránsitos aún pendientes al impactar y nuevos despliegues/envíos durante su ventana; refrescar la ventana no vuelve a demorar los mismos tránsitos mientras el efecto esté activo. No cancelan acciones ni toman el nodo. Los impactos ya vencidos dentro del mismo tick siguen resolviéndose en orden.

| Defensa ID | Nombre | Costo C | Efecto |
|---|---|---:|---|
| `quick` | Carga rápida | 90 | Capacidad 145; inmediata; duración 12; recarga 12. |
| `heavy` | Barrera pesada | 210 | Capacidad 330; activa en 4; duración 24; recarga 22. |
| `interceptor` | Interceptor | 140 | Capacidad 160; reduce impactos absorbidos 25%; activa en 1; duración/recarga 18. |
| `sustained` | Sostenido | 155 | Capacidad 210; activa en 2; duración 35; recarga 20. |
| `antiburst` | Antirráfaga | 155 | Capacidad 180; reduce impactos múltiples 45%; activa en 1; duración 20; recarga 19. |
| `antipiercing` | Antiperforante | 150 | Capacidad 170; redirige al escudo 70% del daño perforante; activa en 1; duración 18; recarga 20. |
| `regenerative` | Reactor regenerativo | 165 | Capacidad 170; regenera 8/s tras 3 sin impactos hasta capacidad inicial; activa en 2; duración 30; recarga 23. |
| `reflection` | Escudo reflejo | 175 | Capacidad 155; devuelve 20% absorbido al núcleo rival y consume capacidad 20% más rápido; activa en 2; duración 18; recarga 22. |
| `reinforced` | Cobertura reforzada | 220 | Capacidad 210; reduce impactos 50%; inmediata; duración 8; recarga 24. |
| `emergency` | Escudo de emergencia | 115 | Se paga para armar una vez; activa automáticamente al <=35% de vida; capacidad 180; duración 15. No evita un golpe letal. |

La capacidad total desplegada está limitada a 470. Armar Emergencia es la acción pagada; la activación posterior es automática, se conserva aunque se cambie el espacio y no puede volver a armarse. Su recarga declarada de 1 no habilita una segunda carga.

| Sabotaje ID | Nombre | Costo C | Efecto |
|---|---|---:|---|
| `disrupt` | Interferencia de escudos | 90 | Capacidad efectiva -25% por 10 solo en escudos ya presentes; recarga 32. |
| `economy` | Bloqueo económico | 115 | Ingresos -30% por 12; recarga 32. |
| `production` | Freno industrial | 100 | Ingreso adicional por niveles económicos -60% por 12; conserva ingreso base; recarga 32. |
| `cooldown` | Interferencia de recargas | 120 | Familia elegida recarga al 50% por 10; recarga 32. |
| `launch` | Retraso de lanzamiento | 100 | Cohetes lanzados durante 12 viajan 3 más; recarga 30. |
| `ambush` | Emboscada al nodo | 95 | Próximo envío de guardianes demora 6 más, hasta consumirse; recarga 30. |
| `friction` | Fricción económica | 90 | Próxima mejora económica +35% costo, hasta compra exitosa; recarga 32. |
| `supplies` | Corte de suministros | 85 | Próxima acción de familia elegida +40% costo; expira en 15 si no se usa; recarga 30. |
| `reconfigure` | Interferencia de reconfiguración | 95 | Añade 4 a cambio rival en curso; sin cambio se rechaza sin costo; recarga 28. |
| `precision` | Sabotaje de precisión | 110 | Próximos lanzamientos/despliegues de un espacio rival de cohete o defensa tienen -35% potencia por 12; recarga 32. |

Reaplicar el mismo efecto al mismo objetivo refresca su ventana, sin acumular porcentajes. Precisión no modifica acciones ya lanzadas y el objetivo sigue siendo el espacio aunque se reconfigure.

Freno industrial afecta únicamente el incremento de ingreso obtenido por niveles económicos: `base + (ingresoDelNivel - base) * (1 - penalización)`, antes de bonus y otros multiplicadores. Sin mejoras económicas no reduce el ingreso base. Fricción económica se aplica junto al descuento de Eficiencia y solo se consume al comprar una mejora; cotizarla o rechazarla por Créditos insuficientes o nivel máximo conserva el efecto.

| Bonus ID | Nombre | Efecto fijo |
|---|---|---|
| `sustained` | Rendimiento sostenido | +15% ingresos. |
| `expansion` | Reconfiguración eficiente | 35 Energía por cambio en vez de 40. ID histórico conservado para guardados. |
| `efficiency` | Eficiencia | -12% costo de mejoras económicas. |
| `compound` | Compuesto | +0,12% ingresos por segundo sin daño al núcleo, máximo +35%; daño reinicia. |
| `treasury` | Tesorería | +80 Créditos al iniciar. |
| `logistics` | Logística | -25% costo de guardianes. |
| `emergency` | Reserva de emergencia | +100 Créditos una vez al quedar con <=35. |
| `rocketsSlot` | Reserva extra de cohetes | Una alternativa seleccionable/reserva más; 2 activos. Requiere 5 cohetes investigados. |
| `shieldsSlot` | Reserva extra de escudos | Una alternativa seleccionable/reserva más; 2 activos. Requiere 5 escudos investigados. |
| `sabotageSlot` | Reserva extra de sabotaje | Una alternativa seleccionable/reserva más; 1 activo. Requiere 4 sabotajes investigados. |

## API e integración

```js
import { ArenaMatch, resolveLoadout } from './match-engine.js';
import { defaultLoadout } from './balance.js';

const match = new ArenaMatch({
  loadouts: [defaultLoadout('sustained'), defaultLoadout('rocketsSlot')],
  // bans[0] son los bloqueos que jugador 0 aplica AL JUGADOR 1.
  bans: [
    { rockets: 'piercing', shields: 'sustained', sabotage: 'production' },
    { rockets: 'node', shields: 'emergency', sabotage: 'precision' },
  ],
  // null habilita catálogo completo; datos reales deben venir de una autoridad.
  // Para restringir: { rockets:[IDs], shields:[IDs], sabotage:[IDs], bonuses:[IDs] }.
  unlocks: [null, null],
});
match.quote(0, { type: 'use', family: 'rockets', slot: 0 });
match.dispatch(0, { type: 'use', family: 'rockets', slot: 0 });
match.dispatch(0, { type: 'swap', family: 'shields', slot: 1, variant: 'interceptor' });
match.dispatch(0, { type: 'guardians', count: 1 });
match.dispatch(0, { type: 'upgrade' });
// Si el sabotaje equipado lo requiere:
match.quote(0, { type: 'use', family: 'sabotage', slot: 0, targetFamily: 'rockets', targetSlot: 0 });
match.advance(0.1); // Tiempo de simulación en segundos, inyectado por el host.
const playerView = match.snapshot(0);
const authorityView = match.snapshot();
```

`quote` y `dispatch` retornan `{ok, credits, energy}` o `{ok:false,error}`. Un rechazo no consume recursos. Preparación inválida (duplicados, cantidad incorrecta, IDs/bonus no desbloqueados), configuración y tiempo inválidos lanzan error. Bloqueos conocidos fuera de lista son válidos y no tienen efecto; IDs de bloqueo desconocidos se rechazan.

La compra independiente `factory` fue retirada: ese comando se rechaza como desconocido y no modifica el estado. El estado y la configuración ya no incluyen fábricas de combate; los IDs de investigación `production`, `friction` y `efficiency` se conservan para los desbloqueos existentes.

`resolveLoadout(loadout, incomingBans, unlocks)` aplica los bloqueos **entrantes** y el bonus. `loadout` contiene `bonus` y `candidates`. `active` y `reserve` son arrays diferentes; no se gana una acción adicional al cambiar. El campo anterior `economy` pasó a `bonus`: el integrador debe adoptar el contrato nuevo.

`snapshot(viewer)` copia el estado y oculta destino del cambio pendiente y reservas del rival; `snapshot()` es la vista de autoridad completa. `state` y `config` internos pertenecen al host autorizado. No deben exponerse como autoridad a clientes remotos. El dominio usa pasos fijos y tiempo inyectado; mismo estado inicial y secuencia de comandos/tiempo reproducen el resultado. La semilla del bot es explícita.

Para probar, abrir `/arena-v2.html`. Sus desbloqueos proceden del guardado de `/factory-v2.html` en el mismo origen y navegador. Sin save ofrece el arsenal inicial; ante datos inválidos o storage inaccesible avisa y ofrece ese mismo arsenal, sin sobrescribir ni borrar datos de fábrica. El bot usa las mismas opciones elegibles y una semilla explícita. Los bloqueos siguen admitiendo todo el catálogo conocido.

La disponibilidad se lee al abrir, al resolver una nueva preparación y al volver a preparar una partida. `prepared.unlocks` conserva una copia congelada para ambos jugadores; elegir el bonus antes de iniciar usa esas mismas opciones. Un evento `storage` durante una preparación resuelta o partida avisa que la actualización se aplicará a la siguiente preparación; durante preparación sin resolver refresca los selectores solo si cambiaron las opciones disponibles. Los guardados periódicos que solo modifican tiempo o recursos conservan los controles y su foco. Esta conexión amplía alternativas de arsenal y no transporta recursos, premios o estadísticas industriales al combate.

Cambiar únicamente el `src` del iframe desde `arena.html` a `arena-v2.html` selecciona esta **práctica local**, pero no incorpora Liga, mensajes/recompensas del iframe, investigaciones ni sincronización del motor anterior. Para reemplazar la Arena integrada hace falta un adaptador de sesiones que traduzca identidad, listas, bonus y desbloqueos, procese comandos y resultados autorizados, y conecte el resultado con premios/Liga. Volver a la URL anterior revierte la selección del prototipo.

## Checks y límites de evidencia

Para la conexión local de Megafábrica v2 se ejecutó `node --input-type=module --check` sobre el contenido de los controladores `arena-v2-controller.js` y `factory-v2-controller.js`, ambos con código 0. `git diff --check` terminó con código 0; solo avisó la conversión habitual LF/CRLF. Se inspeccionó el diff de los archivos modificados. No se añadieron ni ejecutaron pruebas ni se observó el flujo en navegador en este cambio.

La validación de este cambio incluyó revisión independiente por lectura de fuente, `git diff --check` y chequeo de sintaxis de los módulos modificados. No se ejecutaron pruebas automatizadas, simulaciones de balance ni comprobación visual en navegador. Queda pendiente jugar una partida para confirmar selector/bonus, bloqueos coincidentes y no coincidentes, reservas 2/2/1, energía y guardado real en navegador.

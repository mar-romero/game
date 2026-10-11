# Nuevo motor de Arena: estado e integración

Entrada: `public/arena-v2.html`. Es una **práctica local contra bot** con módulos ES: abrirla desde el servidor web del repo, no desde `file://`. Las reglas de este documento están escritas en v2; su funcionamiento completo en navegador y su balance aún necesitan validación. La Arena integrada y la Megafábrica todavía usan el motor anterior.

## Implementado en v2

- Catálogo de 10 cohetes, 10 defensas y 10 sabotajes. La UI permite elegir y ordenar listas únicas de **4/4/3**. Los costos, efectos y recargas son provisionales.
- Cada jugador prepara un bloqueo del catálogo por familia contra el otro. Si no coincide con su lista, no elimina nada. Se filtra la opción bloqueada y se conservan las primeras tres disponibles. Ejemplo: `A/B/C/D`, bloqueo `B` → `A/C/D`; bloqueo `D` o una opción fuera de lista → `A/B/C`. Sabotaje con bloqueo coincidente conserva sus dos restantes.
- Base activa **2 cohetes / 2 defensas / 1 sabotaje**. Lo que queda disponible alimenta la reserva. Sin bloqueo coincidente, sabotaje conserva dos reservas; con bloqueo coincidente, una. Son acciones reutilizables con recarga, pagadas con Créditos.
- **Un bonus permanente** elegido después de resolver bloqueos y antes de iniciar el reloj. Es inmutable por comandos durante la partida. Los bonus de espacio activan un tipo adicional en una familia; si quedan todas las opciones activas, esa familia no tiene reserva y no puede reconfigurarse. No hay una segunda doctrina económica adicional.
- 100 Energía inicial, 40 por cambio, una reconfiguración por familia y una en curso por jugador. Paga y consume el cambio al iniciarlo; dura 5 s. La UI anuncia la familia y oculta el destino rival hasta concluir. La recarga del espacio sigue corriendo; cohetes y escudos ya desplegados mantienen su variante.
- Nodo con hasta +20 Energía **por jugador y partida**, extraídos gradualmente en 180 s de control acumulado. Lo obtenido se conserva al perder control. No entrega otros recursos ni existe un regalo automático a los 4:30.
- Guardianes: 65 Créditos cada uno, viaje de 8 s, recarga de 8 s, hasta 5 por envío. Fuerzas iguales neutralizan el nodo; fuerzas superiores conservan la diferencia. El control requiere disputa para cambiar de dueño.
- Economía: 240 Créditos iniciales, ingresos por niveles 9/15/24/38 por segundo, mejoras de 165/360/720. Hasta 3 fábricas, 180 Créditos por fábrica adicional y +3 ingresos/s cada una. Ataques, defensas, sabotajes, mejoras, fábricas y guardianes usan la misma economía.
- Partidas de 5 minutos: núcleo destruido termina el combate; al agotarse el tiempo gana quien conserva más vida, empate si igualan. Se resuelven los impactos del mismo tick antes de decidir el resultado.
- Bot con semilla explícita, catálogos y slots dinámicos, objetivos para sabotaje y manejo de emergencia. No demuestra balance ni equivalencia con un rival humano.

## Pendiente para PvP integral

| Trabajo | Qué falta |
|---|---|
| Investigaciones de Megafábrica | Integrar misiones industriales, costos/requisitos y una investigación PvP permanente elegida al prestigiar; conservar esos desbloqueos al reiniciar el ciclo y traducirlos al API `unlocks`. La regla es persistirlos y usarlos para ampliar opciones con compensaciones, no poder bruto. Hoy la práctica habilita todo y no conecta Prestigio. |
| Humanos y bloqueos online | Matchmaking, identidad, confirmación mutua de listas/bloqueos/bonus y protocolo competitivo de información oculta. Hoy los bloqueos del rival son del bot y la preparación muestra ambas configuraciones. |
| Autoridad y sincronización | Servidor que valide comandos, avance y resultados, además de autenticación, reconexión y sincronización. El estado local no es autoridad competitiva. |
| Premios y Liga | Adaptar resultado, recompensas, eventos del iframe y Liga al nuevo API, con resultados autorizados por servidor. No hay premios en esta práctica. |
| Balance y experiencia | Medir economía, counters y tiempos con semillas y partidas; validar comportamiento, móvil, foco, señales y accesibilidad en navegador. No se asegura extracción al minuto 4 cuando hay disputa. |
| Unity | Conectar este contrato al combate de Unity; esta entrada no lo implementa. |

## Dónde está cada parte

| Archivo | Funciones o datos relevantes |
|---|---|
| `public/arena-v2.html` | Preparación, bonus fijo y controles de combate; carga un único módulo de UI. |
| `balance.js` | `BALANCE`: economía/tiempos; `CATALOG`: 30 variantes; `BONUSES`: 10 bonus; `defaultLoadout`: listas 4/4/3 por defecto. |
| `match-engine.js` | `resolveLoadout`: listas/bans/slots/reservas; constructor: bonus fijo y estado; `income`/`quote`/`dispatch`: economía y comandos; `_sabotage`/`_effect`: interferencias; `_emergency`: bonus de reserva y defensa automática; `_tick`: tiempo/recargas/nodo/cambios; `_arrive`: impactos/escudos/guardianes; `snapshot`: vista que oculta destino/reservas rivales. |
| `public/game/application/arena-v2-bot.js` | `ArenaPracticeBot.think`: comandos del bot con semilla y slots variables. |
| `public/game/adapters/web/arena-v2-controller.js` | `renderPreparation`: elegir/ordenar 4/4/3; `renderPreview`: bans y bonus; `bonusChanged`: elección antes del reloj; `renderBattle`: acciones, objetivos, reservas, señales; `frame`: avance local. |
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
| `arena-v2-controller.js` | 24–110 | Preparación 4/4/3, bonus y vista de bloqueos. |
| `arena-v2-controller.js` | 111–246 | Controles de combate, objetivos, HUD y avance local; el HUD sigue actualizándose con un selector enfocado y los objetivos se reinician por partida. |
| `arena-v2-bot.js` | 1–53 | Rival de práctica con slots y sabotajes dinámicos. |
| `public/arena-v2.html` | 1–41 | Entrada de práctica independiente. |
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
| `production` | Freno industrial | 100 | Ingresos de fábricas adicionales -60% por 12; recarga 32. |
| `cooldown` | Interferencia de recargas | 120 | Familia elegida recarga al 50% por 10; recarga 32. |
| `launch` | Retraso de lanzamiento | 100 | Cohetes lanzados durante 12 viajan 3 más; recarga 30. |
| `ambush` | Emboscada al nodo | 95 | Próximo envío de guardianes demora 6 más, hasta consumirse; recarga 30. |
| `friction` | Fricción de fábrica | 90 | Próxima fábrica +35% costo, hasta consumirse; recarga 32. |
| `supplies` | Corte de suministros | 85 | Próxima acción de familia elegida +40% costo; expira en 15 si no se usa; recarga 30. |
| `reconfigure` | Interferencia de reconfiguración | 95 | Añade 4 a cambio rival en curso; sin cambio se rechaza sin costo; recarga 28. |
| `precision` | Sabotaje de precisión | 110 | Próximos lanzamientos/despliegues de un espacio rival de cohete o defensa tienen -35% potencia por 12; recarga 32. |

Reaplicar el mismo efecto al mismo objetivo refresca su ventana, sin acumular porcentajes. Precisión no modifica acciones ya lanzadas y el objetivo sigue siendo el espacio aunque se reconfigure.

| Bonus ID | Nombre | Efecto fijo |
|---|---|---|
| `sustained` | Rendimiento sostenido | +15% ingresos. |
| `expansion` | Expansión | +20% ingresos primeros 90. |
| `efficiency` | Eficiencia | -12% costo de fábricas y mejoras económicas. |
| `compound` | Compuesto | +0,12% ingresos por segundo sin daño al núcleo, máximo +35%; daño reinicia. |
| `treasury` | Tesorería | +80 Créditos al iniciar. |
| `logistics` | Logística | -25% costo de guardianes. |
| `emergency` | Reserva de emergencia | +100 Créditos una vez al quedar con <=35. |
| `rocketsSlot` | Espacio extra de cohetes | 3 activos; sin reserva no hay cambio de cohetes. |
| `shieldsSlot` | Espacio extra de defensa | 3 activas; sin reserva no hay cambio de defensa. |
| `sabotageSlot` | Espacio extra de sabotaje | 2 activos; sin reserva no hay cambio de sabotaje. |

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
match.dispatch(0, { type: 'factory' });
// Si el sabotaje equipado lo requiere:
match.quote(0, { type: 'use', family: 'sabotage', slot: 0, targetFamily: 'rockets', targetSlot: 0 });
match.advance(0.1); // Tiempo de simulación en segundos, inyectado por el host.
const playerView = match.snapshot(0);
const authorityView = match.snapshot();
```

`quote` y `dispatch` retornan `{ok, credits, energy}` o `{ok:false,error}`. Un rechazo no consume recursos. Preparación inválida (duplicados, cantidad incorrecta, IDs/bonus no desbloqueados), configuración y tiempo inválidos lanzan error. Bloqueos conocidos fuera de lista son válidos y no tienen efecto; IDs de bloqueo desconocidos se rechazan.

`resolveLoadout(loadout, incomingBans, unlocks)` aplica los bloqueos **entrantes** y el bonus. `loadout` contiene `bonus` y `candidates`. `active` y `reserve` son arrays diferentes; no se gana una acción adicional al cambiar. El campo anterior `economy` pasó a `bonus`: el integrador debe adoptar el contrato nuevo.

`snapshot(viewer)` copia el estado y oculta destino del cambio pendiente y reservas del rival; `snapshot()` es la vista de autoridad completa. `state` y `config` internos pertenecen al host autorizado. No deben exponerse como autoridad a clientes remotos. El dominio usa pasos fijos y tiempo inyectado; mismo estado inicial y secuencia de comandos/tiempo reproducen el resultado. La semilla del bot es explícita.

Para probar, abrir `/arena-v2.html`. Cambiar únicamente el `src` del iframe desde `arena.html` a `arena-v2.html` selecciona esta **práctica local**, pero no incorpora Liga, mensajes/recompensas del iframe, investigaciones ni sincronización del motor anterior. Para reemplazar la Arena integrada hace falta un adaptador de sesiones que traduzca identidad, listas, bonus y desbloqueos, procese comandos y resultados autorizados, y conecte el resultado con premios/Liga. Volver a la URL anterior revierte la selección del prototipo.

## Checks y límites de evidencia

Se ejecutó `node --input-type=module --check` sobre el contenido de los cuatro módulos JavaScript: los cuatro terminaron con código 0. Se inspeccionaron los archivos y `git diff --no-index --check -- NUL <archivo>` en los ocho archivos del alcance: sin diagnósticos de espacios en blanco; código 1 esperado por ser archivos nuevos diferentes de NUL. No se añadieron ni ejecutaron pruebas automatizadas por el alcance solicitado; no se afirma validación visual ni balance medido. Los escenarios de aceptación a verificar antes de activar PvP real son: bans coincidentes y no coincidentes, listas inválidas, recursos insuficientes sin gasto, bonus único/fijo y extra slots sin reserva, dos cambios con 100 Energía, tercero tras +20 del nodo, conservación de extracción/recargas/tránsitos, ocultación del destino y efectos tácticos con expiración/consumo.

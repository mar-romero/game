# Factory Wars: guia completa para jugadores

> ¿Buscás código? Empezá por [la guía de arquitectura](docs/ARCHITECTURE.md), [convenciones para crear archivos](docs/FILE_CONVENTIONS.md) y [el plan de migración](docs/MIGRATION_PLAN.md). El snapshot del juego previo está en `legacy/v1.6/`.

Para levantar la primera prueba online con API, Liga compartida, bots y PostgreSQL, seguir [ONLINE_LOCAL_SETUP.md](docs/ONLINE_LOCAL_SETUP.md) y abrir `/online.html`.

Factory Wars es un juego web de estrategia con dos ritmos conectados:

1. **Megafabrica:** producís recursos, mejorás edificios, cumplís contratos e investigás.
2. **Arena:** durante una partida de cuatro minutos elegís cómo producir, atacar, defenderte y controlar el mapa.

Al terminar una partida recibís recompensas. En la Liga local algunas vuelven como Créditos e Intel para la Megafábrica. La fábrica produce recursos y desbloquea planos; la civilización aporta una maestría PvP permanente. Los niveles de edificios por sí solos no dan más daño, vida ni recursos iniciales en Ranked.

## Empezar a jugar

1. Abrí **Civilizaciones** y elegí una. La elección queda fija durante el ciclo actual.
2. En **Megafábrica**, mejorá edificios con Créditos para producir más recursos.
3. Usá Energía, Acero o Créditos en contratos. Al completarlos recibís Créditos, Intel y contribución para tu civilización.
4. Gastá Intel en investigaciones. Las doctrinas de misiles cambian el comportamiento de tus cohetes en Arena.
5. Entrá a **Arena** y jugá la fecha actual de la Liga. La fecha avanza cuando termina tu partida.
6. Usá las recompensas para seguir creciendo. Cuando el progreso industrial llegue al 100%, podés hacer Prestigio.

La interfaz muestra el costo, el tiempo y el resultado esperado de muchas acciones. La regla visual general es **pagás → esperás → ganás**.

## Megafábrica y Arena

La **Megafábrica principal** guarda los edificios, recursos e investigaciones persistentes. Arena es el combate: tiene recursos y construcciones temporales que vuelven a empezar en cada partida. La campaña exterior de Chatarra/Datos y su fábrica 3D paralela fueron retiradas porque no compartían progreso ni mejoras con la Megafábrica principal.

## Recursos de la Megafábrica

El estado inicial local tiene 400 Créditos, 220 Energía, 160 Acero y 0 Intel. Cada edificio empieza en nivel 1.

| Recurso | Cómo se consigue | Para qué sirve |
|---|---|---|
| Créditos | Automatización, contratos y recompensas de Liga | Mejorar edificios de la Megafábrica |
| Energía | Generadores | Pagar contratos energéticos |
| Acero | Refinerías | Pagar contratos industriales |
| Intel | Laboratorios, contratos y recompensas de Liga | Comprar investigaciones |
| Dominio | Resultados PvP de la Liga | Progresar en Maestría militar |
| Fragmentos | Algunas recompensas PvP | Se acumulan; todavía no se gastan en esta beta |

La producción base por segundo depende del nivel del edificio:

- Generadores: `0,75 × nivel` de Energía.
- Refinerías: `0,42 × nivel` de Acero.
- Laboratorios: `0,04 × nivel` de Intel.
- Automatización: `0,18 × nivel` de Créditos.

La producción se multiplica por la eficiencia de Legado, el bonus industrial de BASTIÓN y Logística cuando corresponda. Los recursos se acumulan localmente; al volver después de un tiempo, el cálculo de producción offline tiene un tope de cuatro horas por actualización.

### Mejorar edificios

Pagás Créditos para subir un edificio un nivel. El costo crece con el nivel; cada tipo tiene su costo inicial y su multiplicador de crecimiento:

| Edificio | Produce | Costo base | Crecimiento por nivel |
|---|---|---:|---:|
| Generador | Energía | 120 | 1,55× |
| Refinería | Acero | 140 | 1,58× |
| Laboratorio | Intel | 180 | 1,62× |
| Automatización | Créditos | 220 | 1,65× |

FORJA reduce en 10% el costo de estos edificios. Por ejemplo, si una mejora cuesta 1.000 Créditos, con FORJA cuesta 900.

### Contratos

Un contrato consume una cantidad de un recurso y, al terminar, entrega Créditos e Intel. Los tres contratos se alternan: Suministro energético, Lote de acero y Paquete logístico. Sus requisitos y recompensas aumentan a medida que completás contratos; la pantalla muestra el costo y la recompensa de la oferta actual.

Al completar uno recibís además 8 Intel y aportás Operaciones a tu civilización. ENJAMBRE reduce la duración de los contratos en 10%.

## Civilizaciones

Cada civilización da una ventaja en la Megafábrica y otra distinta dentro de Arena.

### Bonus de la Megafábrica principal

| Civilización | Efecto |
|---|---|
| FORJA | Edificios 10% más baratos |
| BASTIÓN | Producción de recursos 8% mayor |
| ENJAMBRE | Contratos 10% más rápidos |
| NEXO | Investigaciones 10% más baratas |

### Bonus de combate configurados en Arena

| Civilización | Efecto en Arena |
|---|---|
| FORJA | Mejoras económicas cuestan 7% menos; ataques cuestan 8% más |
| BASTIÓN | Los escudos tienen 14% más resistencia; mejoras económicas cuestan 6% más |
| ENJAMBRE | Ataques cuestan 12% menos; defensas cuestan 12% más |
| NEXO | Sabotaje cuesta 26% menos; ataques cuestan 4% más |

Los textos breves de PvP que aparecen en algunas tarjetas de civilización pueden no coincidir con estos valores activos del motor de Arena. Esta tabla documenta los multiplicadores usados por el combate.

#### Maestría permanente

Cada punto de maestría suma 0,5 puntos porcentuales al bonus PvP correspondiente, hasta 10 puntos por civilización (+5 puntos porcentuales). En cada Prestigio, la civilización del ciclo que termina recibe +1 Legado. Si continuás con ella, también recibe +1 Lealtad: ganás 2 puntos de maestría. Si migrás, la nueva recibe +0,5 Lealtad y la anterior conserva su Legado.

Ejemplo: repetir FORJA suma 1 punto porcentual a su bonus PvP; migrar a ENJAMBRE suma 0,25 puntos porcentuales a ENJAMBRE. Al máximo, los efectos quedan en FORJA economía -12%, BASTIÓN escudos +19%, ENJAMBRE ataques -17% de costo y NEXO sabotaje -31% de costo. La pantalla de Civilizaciones muestra el bonus efectivo de cada una.

## Investigaciones

La Megafábrica también ofrece 36 investigaciones PvP por especialidad: Economía, Cohetes, Escudos, Sabotaje y Nodo. Se compran con Intel y aparecen durante la partida en **Mejoras de fábrica**. Seleccioná una para construirla: consume recursos, tiempo y un slot industrial, y su efecto dura esa partida. Las familias cubren producción, obra, descuentos y almacenamiento; variantes y capacidad de cohetes; potencia, capacidad, duración, carga y tipos de escudo; sabotajes y contramedidas; y despliegue, reserva, retirada, fortificación e ingresos de guardianes.

El nodo se disputa con oleadas de guardianes. La oleada inicial sugerida es de 100; al llegar, se compara con la guarnición defensora. Las bajas se restan a la fuerza que pierde. Si el atacante supera la defensa, captura con los supervivientes; si hay empate, el dueño actual conserva el nodo. El jugador que lo controla puede mandar refuerzos. El panel PvP permite elegir el tamaño de la oleada y, con la investigación correspondiente, retirarse recuperando parte del costo.

Las investigaciones de la Megafábrica se compran con Intel. Las doctrinas de misiles son tácticas: modifican el tipo de ataque, no el poder base permanente de Ranked. Solo se puede equipar una doctrina de misil a la vez.

| Investigación | Costo base | Efecto |
|---|---:|---|
| Misil: Rompeescudos | 80 Intel | El cohete pesado hace aproximadamente 8% menos daño, pero atraviesa escudos 20% mejor |
| Misil: Asedio | 110 Intel | El cohete pesado hace aproximadamente 10% más daño y tarda 1,5 segundos más en llegar |
| Misil: Impacto rápido | 95 Intel | El cohete rápido llega aproximadamente 22% antes y hace 12% menos daño |
| Plano: Armería II | 120 Intel | Desbloquea Armería II en Arena |
| Plano: Refinería II | 110 Intel | Desbloquea Refinería II en Arena |
| Plano: Escudos II | 110 Intel | Desbloquea Escudos II en Arena |
| Plano: Control II | 100 Intel | Desbloquea Control II en Arena |
| Reconocimiento | 70 Intel | Da información previa del rival; no aumenta estadísticas de combate |
| Logística | 120 Intel | Aumenta 8% la producción de la Megafábrica; no cambia la economía de Arena |
| Archivo tecnológico | 150 Intel | Después de Prestigiar, reduce 5% el costo de investigaciones futuras; se conserva al ascender |

NEXO reduce en 10% el costo de investigación. El Archivo aplica además su descuento cuando corresponde. Las doctrinas de misiles no hacen que todos tus cohetes sean simplemente “más fuertes”: cada una intercambia daño, velocidad o eficacia contra escudos. Los planos de módulos se reinician al Prestigiar; hay que volver a investigarlos, salvo Archivo tecnológico.

## Arena: cómo se juega una partida

Una partida dura hasta cuatro minutos. Cada lado empieza con 300 recursos de Arena y un núcleo de 700 puntos de vida. El hangar ya aparece construido al comenzar. La economía produce 9, 15, 23 o 34 recursos por segundo según el nivel. El objetivo es destruir el núcleo rival o terminar con más vida/control al agotarse el tiempo.

Las acciones principales son:

- **Mejorar economía:** pagás recursos y subís el ingreso por segundo. En la versión actual, las mejoras cuestan 170, 390 y 780 recursos para subir a los niveles siguientes.
- **Fábrica/hangar:** habilita la fabricación de ataques; en la partida actual ya empieza instalado.
- **Cohete rápido:** cuesta recursos, hace 120 de daño base y tarda 6 segundos en llegar.
- **Cohete pesado:** cuesta más, hace 300 de daño base y tarda 10 segundos. Tiene recarga y es especialmente importante contra escudos.
- **Escudos rápidos o pesados:** absorben daño durante un tiempo limitado. Tienen capacidad máxima acumulada.
- **Sabotaje:** reduce temporalmente la producción rival y retrasa su ritmo de fabricación.
- **Capturar el nodo:** cuesta recursos y tiempo de viaje. El dueño obtiene un bonus de producción durante el control.
- **Overdrive:** aumenta temporalmente el ingreso, pero deja al núcleo más vulnerable.
- **Escaneo:** muestra una lectura aproximada del banco y de la intención del rival.

Las cifras base pueden cambiar por civilización, doctrina, módulos, especialización y otros efectos. La Arena muestra el costo y el resultado ajustados antes de ejecutar una acción.

### Especialización durante la partida

Al alcanzar el nivel requerido podés elegir una rama. Cada una tiene un costo y un intercambio:

- **Industria:** más ingreso, pero los ataques cuestan más.
- **Arsenal:** más daño, pero menos ingreso.
- **Control:** mejora el nodo, abarata la captura y extiende el sabotaje.

No existe una opción mejor en todo caso: Industria favorece escalar; Arsenal presiona; Control disputa objetivos y altera el ritmo rival.

### Módulos de fábrica en Arena

Los módulos se construyen durante la partida y ocupan espacios industriales que dependen del nivel económico. Su tiempo de construcción y costo dejan recursos temporalmente comprometidos.

| Módulo | Costo y obra | Efecto principal |
|---|---:|---|
| Armería II | 190 recursos · 7 s | +12% daño y fabricación militar 25% más rápida |
| Refinería II | 180 recursos · 7 s | +14% ingresos durante la partida |
| Escudos II | 175 recursos · 6 s | Mejora escudos, reduce 5% el costo defensivo y acelera 25% su carga |
| Control II | 170 recursos · 6 s | Captura 12% más barata, control 25% más rápido y sabotaje +3 s |
| Armería III: Salvas | 255 recursos · 8 s | Cohete rápido +10% daño y fabricación 30% más rápida; costo +8% |
| Armería III: Asedio | 265 recursos · 9 s | Cohete pesado +30% daño; ataque más lento y con más recarga |
| Refinería III: Compound | 250 recursos · 8 s | Después de 20 s sin daño, ingresos escalan hasta +24% |
| Escudos III: Reactivo | 245 recursos · 8 s | Devuelve recursos al bloquear completamente un ataque |
| Control III: Interferencia | 240 recursos · 8 s | Con el nodo, sabotaje recarga 30% más rápido |

Para usar un módulo II como jugador humano primero necesitás su plano investigado en la Megafábrica. Después, dentro de Arena, el módulo sigue costando recursos y tiempo, y ocupa un slot industrial. Los módulos III requieren haber construido su módulo II correspondiente. Los bots conservan sus árboles de módulos de simulación.

Cada bot prioriza acciones distintas. RUSHER busca presión temprana; GREEDY y HOARDER priorizan economía; TURTLE defiende y escala; TEMPO castiga inversiones; ADAPTIVE responde a lo que observa; SABOTEUR busca interrumpir; BALANCED mezcla planes; RANDOM elige acciones experimentales.

## Recompensas de PvP: qué moneda va a dónde

### Liga local y Megafábrica principal

En el modo local de Liga, el resultado de tu partida entrega:

| Resultado | Créditos | Intel | Fragmentos | Dominio |
|---|---:|---:|---:|---:|
| Victoria | 180 | 12 | 2 | 36 |
| Empate | 100 | 6 | 1 | 14 |
| Derrota | 70 | 4 | 0 | 6 |

Los Créditos sirven para mejorar edificios; el Intel sirve para investigar. El Dominio avanza la Maestría militar: el primer umbral es 120 y los siguientes crecen en 80. En esta versión, el Dominio no se gasta para comprar un edificio concreto. Los Fragmentos se acumulan para un sistema futuro y todavía no se gastan.

### Partidas Arena fuera de Liga

Una partida directa de Arena ya no entrega Chatarra ni Datos de una campaña paralela. Las recompensas persistentes de Créditos, Intel, Fragmentos y Dominio pertenecen a la Liga gestionada por la pantalla Imperio.

## Liga 10

La temporada local tiene 10 participantes: vos y nueve bots:

| Bot | Estilo |
|---|---|
| FerroGreed | GREEDY, prioriza economía |
| Blitz-9 | RUSHER, ataca temprano |
| Aegis | TURTLE, defiende y escala |
| Tempo-X | TEMPO, castiga inversiones |
| Mimic | ADAPTIVE, responde al rival |
| Dice | RANDOM, comportamiento experimental |
| Atlas | BALANCED, estrategia mixta |
| VaultMax | HOARDER, acumula recursos |
| GhostWire | SABOTEUR, guerra económica |

La Liga tiene ocho fechas. Cada jugador disputa una partida por fecha, por lo que termina con ocho. Vos jugás una partida contra una civilización distinta; al terminar, el motor Arena simula las otras cuatro partidas bot contra bot de esa fecha. Después se actualizan los rankings y se abre la fecha siguiente. No se enfrentan jugadores de la misma civilización en la Liga.

La civilización de una Liga queda fija al iniciarla. Cambiar de civilización mediante Prestigio no cambia la temporada ya empezada.

## Prestigio, Legado y cambio de civilización

El progreso hacia Prestigio suma cuatro partes, cada una limitada a su objetivo:

- 30%: niveles de edificios, con objetivo 20 niveles combinados.
- 30%: producción del ciclo, con objetivo 12.000.
- 20%: seis contratos completados.
- 20%: cuatro investigaciones.

Al llegar a 100%, podés continuar con la misma civilización o migrar a otra. La civilización queda bloqueada hasta el próximo Prestigio.

Prestigiar reinicia los edificios al nivel 1, Créditos a 400, Energía a 220, Acero a 160, el progreso de contratos y la investigación del ciclo, salvo Archivo tecnológico. Conservás 35% del Intel y 50% de los Fragmentos. También conservás historial, Legados y lealtad. Cada Prestigio aporta un Legado de tu civilización saliente.

El Legado general mejora la producción industrial: los primeros 10 Prestigios aportan 1% cada uno; del 11 al 20, 0,5%; desde el 21, 0,25%. Por separado, la maestría de cada civilización aplica su bonus PvP permanente según la tabla anterior; no aumenta la vida ni los recursos iniciales.

## Rankings y Guerra de Civilizaciones

La Liga muestra cuatro vistas:

- **Arena:** 3 puntos por victoria, 1 por empate y 0 por derrota; el rating Elo desempata.
- **Industrial:** compara progreso/score de fábrica. Los bots avanzan su fábrica simulada cuando cerrás una fecha.
- **Imperio:** 60% percentil Arena y 40% percentil Industrial.
- **Civilizaciones:** combina contribuciones de PvP, Industria y Operaciones; los contratos aportan Operaciones y el Prestigio aporta Industria.

La ruta `/` sigue siendo la experiencia local: guarda la temporada en el navegador y conserva el adaptador Supabase anterior, que sincroniza desde el cliente. La ruta `/online.html` es la primera versión autoritativa: usa la API Node, Supabase Auth y PostgreSQL para compartir Megafábrica, Arena, partidas y clasificación. El servidor acredita recompensas de Arena y guarda el evento junto con el resultado; las partidas contra bots también recompensan al jugador, pero solo el PvP humano contra humano cambia Elo, puntos y récord competitivo.

## Qué está conectado y qué no

- Los edificios persistentes producen recursos y aumentan el score industrial; no dan directamente vida, daño ni recursos iniciales en Ranked.
- Intel de Megafábrica investiga doctrinas de misiles y planos de módulos. Las doctrinas cambian cohetes; los planos desbloquean opciones que luego se pagan y construyen dentro de Arena.
- Los módulos de Arena afectan solo la partida actual y requieren recursos, tiempo y slots industriales.
- La maestría persistente de la civilización sí ajusta su multiplicador PvP, crece con Prestigio y se limita a 10 puntos por civilización.
- La partida de Liga da Créditos, Intel, Fragmentos, Dominio y contribución PvP para la Megafábrica. La beta autoritativa aplica esas recompensas del lado servidor y las registra como eventos económicos.
- El Dominio sube un contador de Maestría. Aunque un tooltip dice que desbloquea mejoras de guerra, en el código actual no existe todavía una compra/desbloqueo concreto ligado a ese nivel.
- Algunas descripciones de bonus PvP en las tarjetas de civilización están desactualizadas frente a los multiplicadores del motor Arena. Los multiplicadores activos están documentados arriba.
- `/online.html` ejecuta y valida partidas en el servidor; la ruta local `/` mantiene el adaptador anterior cliente-autoritativo. El modo autoritativo funciona en una instancia y aún no está probado para 1.000 conexiones; para escalar horizontalmente hay que agregar coordinación compartida de colas y partidas.

## Probar localmente

En Windows, hacé doble clic en `START_WINDOWS.bat`, o ejecutá desde la carpeta del proyecto:

```powershell
python serve.py
```

Abrí `http://localhost:8000/`.

## Supabase y publicación

Para instalación nueva, ejecutá `supabase/schema.sql`. Si ya tenías el esquema de v1.5.x, ejecutá una vez `supabase/migrations/v160_liga10.sql`. Configurá `public/game/adapters/web/config.js` con la URL del proyecto y la publishable key. Nunca pongas una `service_role` en el navegador.

La guía de despliegue está en [docs/DEPLOY_GITLAB_SUPABASE.md](docs/DEPLOY_GITLAB_SUPABASE.md). El diseño está en [docs/GAME_DESIGN_V15.md](docs/GAME_DESIGN_V15.md) y las reglas de Liga en [docs/V160_LIGA10.md](docs/V160_LIGA10.md).

## Simulación de balance

`analytics/balance_simulation.py` genera `analytics/balance_simulation.json`. Incluye una matriz factorial de nueve estilos de bot, cuatro civilizaciones y niveles 0–2 de cuatro edificios: 2.916 perfiles y 3.188.646 cruces entre civilizaciones. Esa matriz usa una aproximación probabilística para explorar combinaciones; no son millones de partidas ejecutadas por el motor interactivo Arena.

Para probar los enfrentamientos con el motor real de Arena, iniciá primero `python serve.py` y luego ejecutá en otra terminal:

```powershell
node .\analytics\arena_bot_interactions.js --change-note "Describí el cambio probado en esta corrida"
```

El ejecutor usa Edge o Chrome instalado y guarda cada corrida como un archivo nuevo en `analytics/simulations/`; `manifest.json` conserva el historial y nunca se reemplaza una versión anterior. Cada reporte empieza con la nota de cambio, los archivos y reglas modificados, y los escenarios comparados.

La matriz incluye 486 cruces únicos entre civilizaciones y estilos de bot. Por escenario, se juegan 20 partidas por cruce con ambos lados A/B probados. Los escenarios actuales comparan la línea base, edificios de Megafábrica nivel 5 y esa fábrica con cada una de las tres doctrinas de misil. El enlace experimental da +0,5% de reserva inicial por cada nivel de edificio sobre nivel 1, hasta +12%; cuatro edificios nivel 5 equivalen a +8% (300 → 324 recursos). La corrida completa actual contiene 48.600 partidas.

El bonus de reserva es solo experimental y se activa mediante la configuración del simulador; no está habilitado en partidas Ranked. La doctrina se aplica con las reglas actuales de Arena. La simulación usa el motor `Match` real y registra cada resultado agregado para comparar cambios posteriores.

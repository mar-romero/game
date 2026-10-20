# Factory Wars v1.4 — Bot Baseline Report

## Resumen ejecutivo

Se ejecutaron **5,760 partidas headless** usando el motor lógico exacto de **Factory Wars v1.4 Experience Lab**, con paso de simulación de 0,5 s. El diseño cubre los 36 pares de bots, las 16 combinaciones ordenadas de civilizaciones y alterna los lados A/B. Cada matchup de bots tiene **160 partidas**.

El baseline encuentra cuatro señales principales:

1. **GREEDY sigue dominante**: 77.0% global; excluyendo RANDOM queda aproximadamente 73,8%. Supera a todos los bots competitivos y sólo SABOTEUR lo acerca a un matchup razonable (GREEDY 58,1% / SABOTEUR 41,9%).
2. **ENJAMBRE (swarm) está fuerte**: 58.4% global. Contra FORJA llega a 65,1% y contra NEXO a 61,3%.
3. **La defensa excesiva correlaciona con perder en este motor**: los perdedores gastan en promedio 1077 en defensa frente a 612 de los ganadores y desperdician 302 de escudo frente a 86.
4. **Economía + territorio + conversión militar sigue siendo el patrón ganador**: los ganadores terminan con nivel económico 2.47 vs 1.70, control territorial 100s vs 38s y gasto militar 1651 vs 788.

## Salud estratégica automática

| Métrica | Resultado |
|---|---:|
| Strategic Health* | **67.9/100** |
| Balance de lado A/B | 100.0/100 |
| Counterplay proxy | **54.1/100** |
| Diversidad estratégica | 75.3/100 |
| Tempo | 58.1/100 |
| Pacing | 83.5/100 |
| Duración media | **2.91 min (174.6s)** |
| Timeouts | 20.0% |
| Lock-in antes de 1:30 | 12.8% |
| Cambios de liderazgo medios | 2.31 |
| “Comeback” según proxy | 69.8% |

\*Strategic Health es un índice interno de diseño, **no una medida de diversión**.

**Advertencia sobre reversibilidad:** el proxy marca 69.8% de comebacks y por eso su subscore de reversibilidad colapsa a 0. Esto es demasiado alto para tomarlo literalmente: la heurística de probabilidad de victoria está sobre-reaccionando a estados intermedios. Mañana conviene comparar esta señal con la percepción humana antes de recalibrarla.

## Ranking de bots

| Bot | Partidas | Score |
|---|---:|---:|
| GREEDY | 1280 | **77.0%** |
| TURTLE | 1280 | **66.0%** |
| HOARDER | 1280 | **63.9%** |
| SABOTEUR | 1280 | **59.0%** |
| BALANCED | 1280 | **48.1%** |
| ADAPTIVE | 1280 | **47.1%** |
| TEMPO | 1280 | **46.8%** |
| RUSHER | 1280 | **40.5%** |
| RANDOM | 1280 | **1.7%** |

RANDOM funciona como baseline de incompetencia deliberada; no debe usarse para decidir balance competitivo. Excluyéndolo, el orden sigue siendo GREEDY > TURTLE > HOARDER > SABOTEUR > BALANCED > ADAPTIVE > TEMPO > RUSHER.

### Matchups competitivos más problemáticos

| Matchup | Resultado |
|---|---:|
| GREEDY vs RUSHER | **86,9 / 13,1** |
| GREEDY vs TEMPO | **81,2 / 18,8** |
| GREEDY vs HOARDER | **78,8 / 21,2** |
| GREEDY vs BALANCED | **73,8 / 26,2** |
| GREEDY vs ADAPTIVE | **72,5 / 27,5** |
| HOARDER vs ADAPTIVE | **90,6 / 9,4** |
| HOARDER vs TEMPO | **83,1 / 16,9** |
| SABOTEUR vs HOARDER | **81,2 / 18,8** |
| TURTLE vs HOARDER | **80,0 / 20,0** |

Esto indica que todavía hay **hard counters demasiado pronunciados**. Una matriz competitiva saludable puede tener counters, pero tantos 80/20–90/10 hacen que la elección de política pese demasiado frente a la ejecución.

## Civilizaciones

| Civilización | Partidas | Score |
|---|---:|---:|
| SWARM | 2880 | **58.4%** |
| NEXUS | 2880 | **48.6%** |
| BASTION | 2880 | **48.4%** |
| FORGE | 2880 | **44.6%** |

### Matchups de civilización

| Matchup | Resultado |
|---|---:|
| BASTIÓN vs FORJA | 53,2 / 46,8 |
| NEXO vs BASTIÓN | 52,5 / 47,5 |
| ENJAMBRE vs BASTIÓN | **57,1 / 42,9** |
| NEXO vs FORJA | 53,2 / 46,8 |
| ENJAMBRE vs FORJA | **65,1 / 34,9** |
| ENJAMBRE vs NEXO | **61,3 / 38,8** |

La señal más clara es **ENJAMBRE demasiado eficiente**, especialmente contra FORJA. FORJA queda débil en el agregado.

## Ganadores vs perdedores

| Métrica media | Ganador | Perdedor |
|---|---:|---:|
| Inversión económica | 390.9 | 186.9 |
| Gasto militar | 1651.4 | 788.1 |
| Gasto defensivo | 612.4 | 1077.5 |
| Sabotaje | 162.3 | 253.2 |
| Control territorial (s) | 99.8 | 38.4 |
| Daño | 641.4 | 234.4 |
| Escudo desperdiciado | 86.2 | 302.0 |
| Banco máximo | 482.7 | 388.9 |
| Nivel económico | 2.5 | 1.7 |
| Decisiones tácticas | 18.7 | 18.2 |
| Commitments | 7.0 | 3.4 |

La diferencia de **inputs/decisiones tácticas es pequeña**, mientras que la diferencia de **commitments estratégicos** es enorme. Esto apoya la dirección de diseño: el resultado parece depender más de *qué compromisos tomás* que de hacer muchos clicks.

## Qué probar mañana contra la PC

No cambies números antes del test. Usá esta build como baseline fijo y tratá de romperla deliberadamente:

1. **Greed test:** economía temprana + defensa mínima + nodo + ofensiva tardía. Si vuelve a sentirse obviamente correcto, la dominancia de GREEDY también existe para humanos.
2. **Punish test:** jugá TEMPO/RUSHER e intentá castigar una refinería rival apenas empieza. Evaluá si la ventana se ve y si realmente podés explotarla.
3. **Shield test:** cuando pierdas, evitá responder a todo con escudos. El baseline muestra que el exceso defensivo es una trampa fuerte.
4. **Swarm test:** jugá ENJAMBRE y después FORJA con un plan similar. Buscamos si el 58,4% vs 44,6% de bots también se percibe humanamente.
5. **PX Pulse:** respondé la encuesta incluso después de derrotas. Especialmente claridad, mastery, autonomía, challenge, overload y ganas de revancha.

### Hipótesis para validar con humanos

- H1: GREEDY sigue demasiado fuerte, no sólo por la política del bot.
- H2: ENJAMBRE ofrece demasiado valor militar por su coste de oportunidad.
- H3: el jugador entiende que sobredefender es ineficiente sin necesitar conocer las fórmulas.
- H4: las ventanas de castigo de economía son visibles y accionables.
- H5: ~2:55 de duración media se siente suficientemente intensa sin saturación.
- H6: las partidas con 1–3 cambios de liderazgo producen mayor deseo de revancha.

## Decisión recomendada antes de balancear otra vez

**No tocar todavía GREEDY ni ENJAMBRE.** Primero obtené 10–20 partidas humanas con PX Pulse. Si vos también encontrás economía dominante o ENJAMBRE claramente superior, tendremos convergencia entre simulación y experiencia humana y ahí sí conviene nerfear. Si los humanos muestran lo contrario, el problema estará en las políticas de los bots, no necesariamente en las reglas del juego.

---

Baseline generado a partir de Factory Wars v1.4 Experience Lab. Las métricas de bot describen el motor y las políticas actuales; no prueban diversión, retención ni causalidad psicológica.

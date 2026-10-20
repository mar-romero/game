# Selección del ajuste de ramas nativas

Se probaron ramas nativas parametrizadas contra las otras ocho estrategias en tres generaciones de rivales y dos familias de semillas reservadas. Se eligió una rama nueva solo cuando mejoró claramente al campeón actual. Victoria=1, empate=0,5, derrota=0.

| Bot | Nativo | Campeón actual | Rama nativa ajustada | Selección aplicada |
|---|---:|---:|---:|---|
| GREEDY | 50.5% | 89.8% | 50.2% | current + respuesta reactiva |
| RUSHER | 10.2% | 19.7% | 12.3% | current |
| TURTLE | 88.7% | 88.7% | 97.9% | rama nativa ajustada |
| TEMPO | 49.1% | 61.8% | 62.5% | current |
| ADAPTIVE | 25.7% | 43.1% | 27.4% | current |
| RANDOM | 21.0% | 39.8% | 25.2% | current |
| BALANCED | 35.3% | 41.9% | 33.7% | current |
| HOARDER | 10.2% | 66.0% | 59.2% | current |
| SABOTEUR | 70.0% | 70.0% | 87.1% | rama nativa ajustada |

Se promovieron **TURTLE** y **SABOTEUR**, que subieron de 88,7% a 97,9% y de 70,0% a 87,1%, respectivamente, en esta validación. **GREEDY** conserva la reacción adaptativa anterior (89,8%). Los otros seis bots mantienen su campeón actual: sus ramas nativas ajustadas no lo superaron. Las tasas son promedios de varios cruces, no garantías ni intervalos de confianza.

## Parámetros aplicados

- **TURTLE:** crecimiento 1,47; economía hasta 107 s; fábrica desde 77 s; captura desde 55 s; ataque fuerte desde 150 s; los demás umbrales están registrados en el JSON.
- **SABOTEUR:** crecimiento 1,64; economía hasta 150 s; sabotaje desde 33 s; fábrica desde 31 s; captura desde 77 s; ataque desde 129 s.

El motor conserva el flujo y la lógica de cada estrategia; solo los parámetros de las ramas elegidas cambian. El informe completo incluye todos los valores y resultados por rival.

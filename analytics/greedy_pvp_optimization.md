# Optimización acotada de GREEDY en PvP

- Tiempo: **97.74s** (límite: 180s)
- Búsqueda: 800 candidatos, 10 generaciones, 51.200 partidas
- Fitness: 75% tasa media de puntos + 25% tasa del peor rival
- Motor base: sin módulos industriales, doctrinas, overlays web ni bonificaciones persistentes
- Cada cruce usa lados intercambiados y civilizaciones rotativas.

## Validación independiente

| Rival | Partidas | Puntuación de GREEDY optimizado |
|---|---:|---:|
| GREEDY | 40 | 35.0% |
| RUSHER | 40 | 100.0% |
| TURTLE | 40 | 2.5% |
| TEMPO | 40 | 57.5% |
| ADAPTIVE | 40 | 95.0% |
| RANDOM | 40 | 92.5% |
| BALANCED | 40 | 85.0% |
| HOARDER | 40 | 100.0% |
| SABOTEUR | 40 | 5.0% |

## Parámetros encontrados

| Parámetro | Valor |
|---|---:|
| ecoUntil | 100 |
| ecoFactor | 1.95 |
| factoryAfter | 35 |
| defendAfter | 2 |
| defendHP | 30 |
| captureAfter | 73 |
| captureChance | 0.64 |
| attackAfter | 55 |
| largeAfter | 113 |
| largeBank | 321 |
| sabotageAfter | 79 |
| sabotageChance | 0.2 |
| specialization | 0 |

Mejor puntuación media de búsqueda: **73.4%**. Peor cruce en búsqueda: **0.0%**.
La validación usa semillas separadas; los porcentajes son estimaciones y dependen de las políticas actuales de los bots.

# Variantes elegidas para los bots originales

Se eligió por estrategia la versión con mayor puntuación promedio combinando ambas semillas de validación contra la generación optimizada anterior. Victoria = 1, empate = 0,5, derrota = 0. Son estimaciones, no intervalos de confianza.

| Bot | Variante elegida | Media en semilla previa | Media en semilla nueva | Media combinada |
|---|---|---:|---:|---:|
| GREEDY | original | 60.4% | 57.8% | 59.1% |
| RUSHER | fresh | 44.8% | 41.7% | 43.2% |
| TURTLE | original | 100.0% | 100.0% | 100.0% |
| TEMPO | fresh | 56.8% | 58.3% | 57.6% |
| ADAPTIVE | fresh | 47.4% | 45.8% | 46.6% |
| RANDOM | fresh | 55.2% | 51.0% | 53.1% |
| BALANCED | previous | 55.2% | 57.3% | 56.2% |
| HOARDER | fresh | 56.0% | 54.7% | 55.3% |
| SABOTEUR | original | 96.4% | 94.8% | 95.6% |

Las variantes elegidas se aplican en `public/game/domain/arena/match-engine.js`. Las versiones originales se conservan para GREEDY, TURTLE y SABOTEUR porque ganaron en promedio en esta validación. RUSHER y HOARDER tienen diferencias pequeñas frente a la generación anterior; requieren más partidas antes de considerarlas mejoras concluyentes.

## Enfoque para seguir mejorando

- Usar semillas emparejadas y separar entrenamiento, selección y prueba final.
- Aumentar repeticiones para cada rival y calcular intervalos de confianza; evitar promover mejoras menores que el ruido.
- Optimizar por cruce y también por el peor rival, para detectar counters como TURTLE.
- Después, probar políticas que reaccionen a eventos observables del rival en vez de usar solo umbrales de tiempo.
- Incorporar las capas industriales solo en una tanda separada, para distinguir mejora de estrategia base de efectos de módulos.

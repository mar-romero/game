# Validación cruzada entre generaciones de bots PvP

- Tiempo: **90.55s** (máximo: 180s)
- Reoptimización: 900 evaluaciones y 28.800 partidas de búsqueda.
- Validación: 10.368 partidas; mismos rivales, civilizaciones y lados para comparar original, anterior y nuevo.
- Semilla nueva para entrenar; validación en la familia de semilla anterior y otra familia nueva, ambas fuera del entrenamiento.
- Motor base, sin módulos industriales, doctrinas ni bonificaciones persistentes.
- Los candidatos ajustados usan un orden compartido de decisiones parametrizado; no reescriben por separado la lógica nativa de cada estrategia.

| Bot | Anterior · sem. previa | Nuevo · sem. previa | Original · sem. previa | Δ nueva−anterior | Anterior · sem. nueva | Nuevo · sem. nueva | Original · sem. nueva | Δ nueva−anterior |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| GREEDY | 57.3% | 56.2% | 60.4% | -1.0% | 60.4% | 55.2% | 57.8% | -5.2% |
| RUSHER | 44.3% | 44.8% | 0.0% | 0.5% | 41.7% | 41.7% | 0.0% | 0.0% |
| TURTLE | 62.5% | 60.9% | 100.0% | -1.6% | 62.0% | 60.4% | 100.0% | -1.6% |
| TEMPO | 48.4% | 56.8% | 39.1% | 8.3% | 54.2% | 58.3% | 40.1% | 4.2% |
| ADAPTIVE | 44.3% | 47.4% | 15.1% | 3.1% | 44.3% | 45.8% | 19.3% | 1.6% |
| RANDOM | 30.7% | 55.2% | 14.8% | 24.5% | 29.2% | 51.0% | 12.5% | 21.9% |
| BALANCED | 55.2% | 55.2% | 13.0% | 0.0% | 57.3% | 56.8% | 14.1% | -0.5% |
| HOARDER | 57.3% | 56.0% | 2.6% | -1.3% | 52.6% | 54.7% | 1.0% | 2.1% |
| SABOTEUR | 44.8% | 46.9% | 96.4% | 2.1% | 42.2% | 46.6% | 94.8% | 4.4% |

Cambio positivo indica mejor puntuación media de la nueva versión frente a la anterior. Victoria=1, empate=0,5, derrota=0. Son estimaciones; confirmar cruces individuales antes de promover.

## Cruces por bot

### GREEDY

- RUSHER: semilla previa: anterior 66.7%, nueva 62.5%, original 54.2%; semilla nueva: anterior 62.5%, nueva 58.3%, original 50.0%.
- TURTLE: semilla previa: anterior 62.5%, nueva 45.8%, original 75.0%; semilla nueva: anterior 45.8%, nueva 45.8%, original 62.5%.
- TEMPO: semilla previa: anterior 41.7%, nueva 45.8%, original 62.5%; semilla nueva: anterior 66.7%, nueva 58.3%, original 66.7%.
- ADAPTIVE: semilla previa: anterior 54.2%, nueva 50.0%, original 83.3%; semilla nueva: anterior 50.0%, nueva 45.8%, original 70.8%.
- RANDOM: semilla previa: anterior 62.5%, nueva 70.8%, original 29.2%; semilla nueva: anterior 91.7%, nueva 70.8%, original 29.2%.
- BALANCED: semilla previa: anterior 58.3%, nueva 75.0%, original 62.5%; semilla nueva: anterior 37.5%, nueva 41.7%, original 58.3%.
- HOARDER: semilla previa: anterior 58.3%, nueva 45.8%, original 50.0%; semilla nueva: anterior 58.3%, nueva 54.2%, original 75.0%.
- SABOTEUR: semilla previa: anterior 54.2%, nueva 54.2%, original 66.7%; semilla nueva: anterior 70.8%, nueva 66.7%, original 50.0%.

### RUSHER

- GREEDY: semilla previa: anterior 54.2%, nueva 50.0%, original 0.0%; semilla nueva: anterior 33.3%, nueva 25.0%, original 0.0%.
- TURTLE: semilla previa: anterior 33.3%, nueva 20.8%, original 0.0%; semilla nueva: anterior 37.5%, nueva 33.3%, original 0.0%.
- TEMPO: semilla previa: anterior 41.7%, nueva 45.8%, original 0.0%; semilla nueva: anterior 37.5%, nueva 37.5%, original 0.0%.
- ADAPTIVE: semilla previa: anterior 37.5%, nueva 54.2%, original 0.0%; semilla nueva: anterior 50.0%, nueva 58.3%, original 0.0%.
- RANDOM: semilla previa: anterior 70.8%, nueva 70.8%, original 0.0%; semilla nueva: anterior 58.3%, nueva 58.3%, original 0.0%.
- BALANCED: semilla previa: anterior 25.0%, nueva 20.8%, original 0.0%; semilla nueva: anterior 29.2%, nueva 33.3%, original 0.0%.
- HOARDER: semilla previa: anterior 50.0%, nueva 41.7%, original 0.0%; semilla nueva: anterior 37.5%, nueva 37.5%, original 0.0%.
- SABOTEUR: semilla previa: anterior 41.7%, nueva 54.2%, original 0.0%; semilla nueva: anterior 50.0%, nueva 50.0%, original 0.0%.

### TURTLE

- GREEDY: semilla previa: anterior 70.8%, nueva 50.0%, original 100.0%; semilla nueva: anterior 54.2%, nueva 54.2%, original 100.0%.
- RUSHER: semilla previa: anterior 66.7%, nueva 62.5%, original 100.0%; semilla nueva: anterior 50.0%, nueva 58.3%, original 100.0%.
- TEMPO: semilla previa: anterior 62.5%, nueva 54.2%, original 100.0%; semilla nueva: anterior 66.7%, nueva 54.2%, original 100.0%.
- ADAPTIVE: semilla previa: anterior 58.3%, nueva 54.2%, original 100.0%; semilla nueva: anterior 62.5%, nueva 70.8%, original 100.0%.
- RANDOM: semilla previa: anterior 66.7%, nueva 75.0%, original 100.0%; semilla nueva: anterior 79.2%, nueva 70.8%, original 100.0%.
- BALANCED: semilla previa: anterior 54.2%, nueva 58.3%, original 100.0%; semilla nueva: anterior 41.7%, nueva 54.2%, original 100.0%.
- HOARDER: semilla previa: anterior 62.5%, nueva 50.0%, original 100.0%; semilla nueva: anterior 70.8%, nueva 54.2%, original 100.0%.
- SABOTEUR: semilla previa: anterior 58.3%, nueva 83.3%, original 100.0%; semilla nueva: anterior 70.8%, nueva 66.7%, original 100.0%.

### TEMPO

- GREEDY: semilla previa: anterior 45.8%, nueva 45.8%, original 45.8%; semilla nueva: anterior 54.2%, nueva 62.5%, original 45.8%.
- RUSHER: semilla previa: anterior 54.2%, nueva 66.7%, original 41.7%; semilla nueva: anterior 45.8%, nueva 66.7%, original 33.3%.
- TURTLE: semilla previa: anterior 37.5%, nueva 58.3%, original 33.3%; semilla nueva: anterior 37.5%, nueva 41.7%, original 37.5%.
- ADAPTIVE: semilla previa: anterior 58.3%, nueva 50.0%, original 45.8%; semilla nueva: anterior 62.5%, nueva 62.5%, original 45.8%.
- RANDOM: semilla previa: anterior 58.3%, nueva 70.8%, original 41.7%; semilla nueva: anterior 62.5%, nueva 75.0%, original 37.5%.
- BALANCED: semilla previa: anterior 45.8%, nueva 58.3%, original 16.7%; semilla nueva: anterior 50.0%, nueva 33.3%, original 29.2%.
- HOARDER: semilla previa: anterior 20.8%, nueva 41.7%, original 45.8%; semilla nueva: anterior 54.2%, nueva 45.8%, original 41.7%.
- SABOTEUR: semilla previa: anterior 66.7%, nueva 62.5%, original 41.7%; semilla nueva: anterior 66.7%, nueva 79.2%, original 50.0%.

### ADAPTIVE

- GREEDY: semilla previa: anterior 29.2%, nueva 45.8%, original 12.5%; semilla nueva: anterior 33.3%, nueva 29.2%, original 16.7%.
- RUSHER: semilla previa: anterior 41.7%, nueva 37.5%, original 20.8%; semilla nueva: anterior 45.8%, nueva 70.8%, original 16.7%.
- TURTLE: semilla previa: anterior 37.5%, nueva 33.3%, original 12.5%; semilla nueva: anterior 41.7%, nueva 33.3%, original 16.7%.
- TEMPO: semilla previa: anterior 54.2%, nueva 50.0%, original 8.3%; semilla nueva: anterior 37.5%, nueva 41.7%, original 16.7%.
- RANDOM: semilla previa: anterior 54.2%, nueva 62.5%, original 20.8%; semilla nueva: anterior 41.7%, nueva 62.5%, original 29.2%.
- BALANCED: semilla previa: anterior 41.7%, nueva 37.5%, original 20.8%; semilla nueva: anterior 45.8%, nueva 45.8%, original 16.7%.
- HOARDER: semilla previa: anterior 41.7%, nueva 50.0%, original 16.7%; semilla nueva: anterior 50.0%, nueva 29.2%, original 20.8%.
- SABOTEUR: semilla previa: anterior 54.2%, nueva 62.5%, original 8.3%; semilla nueva: anterior 58.3%, nueva 54.2%, original 20.8%.

### RANDOM

- GREEDY: semilla previa: anterior 16.7%, nueva 54.2%, original 14.6%; semilla nueva: anterior 25.0%, nueva 41.7%, original 4.2%.
- RUSHER: semilla previa: anterior 25.0%, nueva 54.2%, original 12.5%; semilla nueva: anterior 41.7%, nueva 54.2%, original 16.7%.
- TURTLE: semilla previa: anterior 29.2%, nueva 50.0%, original 20.8%; semilla nueva: anterior 29.2%, nueva 45.8%, original 4.2%.
- TEMPO: semilla previa: anterior 37.5%, nueva 66.7%, original 8.3%; semilla nueva: anterior 29.2%, nueva 54.2%, original 16.7%.
- ADAPTIVE: semilla previa: anterior 37.5%, nueva 37.5%, original 16.7%; semilla nueva: anterior 37.5%, nueva 50.0%, original 8.3%.
- BALANCED: semilla previa: anterior 16.7%, nueva 54.2%, original 12.5%; semilla nueva: anterior 16.7%, nueva 41.7%, original 4.2%.
- HOARDER: semilla previa: anterior 37.5%, nueva 50.0%, original 12.5%; semilla nueva: anterior 20.8%, nueva 62.5%, original 20.8%.
- SABOTEUR: semilla previa: anterior 45.8%, nueva 75.0%, original 20.8%; semilla nueva: anterior 33.3%, nueva 58.3%, original 25.0%.

### BALANCED

- GREEDY: semilla previa: anterior 45.8%, nueva 50.0%, original 8.3%; semilla nueva: anterior 41.7%, nueva 41.7%, original 8.3%.
- RUSHER: semilla previa: anterior 62.5%, nueva 62.5%, original 25.0%; semilla nueva: anterior 62.5%, nueva 62.5%, original 20.8%.
- TURTLE: semilla previa: anterior 45.8%, nueva 45.8%, original 8.3%; semilla nueva: anterior 37.5%, nueva 37.5%, original 8.3%.
- TEMPO: semilla previa: anterior 50.0%, nueva 50.0%, original 0.0%; semilla nueva: anterior 45.8%, nueva 45.8%, original 8.3%.
- ADAPTIVE: semilla previa: anterior 58.3%, nueva 54.2%, original 0.0%; semilla nueva: anterior 62.5%, nueva 58.3%, original 8.3%.
- RANDOM: semilla previa: anterior 79.2%, nueva 79.2%, original 12.5%; semilla nueva: anterior 83.3%, nueva 83.3%, original 25.0%.
- HOARDER: semilla previa: anterior 50.0%, nueva 50.0%, original 16.7%; semilla nueva: anterior 54.2%, nueva 54.2%, original 12.5%.
- SABOTEUR: semilla previa: anterior 50.0%, nueva 50.0%, original 33.3%; semilla nueva: anterior 70.8%, nueva 70.8%, original 20.8%.

### HOARDER

- GREEDY: semilla previa: anterior 50.0%, nueva 41.7%, original 0.0%; semilla nueva: anterior 45.8%, nueva 50.0%, original 0.0%.
- RUSHER: semilla previa: anterior 58.3%, nueva 52.1%, original 16.7%; semilla nueva: anterior 58.3%, nueva 54.2%, original 8.3%.
- TURTLE: semilla previa: anterior 41.7%, nueva 37.5%, original 0.0%; semilla nueva: anterior 29.2%, nueva 45.8%, original 0.0%.
- TEMPO: semilla previa: anterior 58.3%, nueva 58.3%, original 0.0%; semilla nueva: anterior 50.0%, nueva 50.0%, original 0.0%.
- ADAPTIVE: semilla previa: anterior 50.0%, nueva 58.3%, original 0.0%; semilla nueva: anterior 45.8%, nueva 41.7%, original 0.0%.
- RANDOM: semilla previa: anterior 75.0%, nueva 83.3%, original 4.2%; semilla nueva: anterior 75.0%, nueva 79.2%, original 0.0%.
- BALANCED: semilla previa: anterior 70.8%, nueva 58.3%, original 0.0%; semilla nueva: anterior 29.2%, nueva 50.0%, original 0.0%.
- SABOTEUR: semilla previa: anterior 54.2%, nueva 58.3%, original 0.0%; semilla nueva: anterior 87.5%, nueva 66.7%, original 0.0%.

### SABOTEUR

- GREEDY: semilla previa: anterior 33.3%, nueva 41.7%, original 95.8%; semilla nueva: anterior 37.5%, nueva 37.5%, original 87.5%.
- RUSHER: semilla previa: anterior 58.3%, nueva 58.3%, original 100.0%; semilla nueva: anterior 54.2%, nueva 58.3%, original 100.0%.
- TURTLE: semilla previa: anterior 37.5%, nueva 37.5%, original 79.2%; semilla nueva: anterior 25.0%, nueva 39.6%, original 87.5%.
- TEMPO: semilla previa: anterior 50.0%, nueva 50.0%, original 95.8%; semilla nueva: anterior 45.8%, nueva 41.7%, original 91.7%.
- ADAPTIVE: semilla previa: anterior 45.8%, nueva 41.7%, original 100.0%; semilla nueva: anterior 37.5%, nueva 45.8%, original 100.0%.
- RANDOM: semilla previa: anterior 62.5%, nueva 58.3%, original 100.0%; semilla nueva: anterior 75.0%, nueva 75.0%, original 100.0%.
- BALANCED: semilla previa: anterior 37.5%, nueva 54.2%, original 100.0%; semilla nueva: anterior 33.3%, nueva 37.5%, original 100.0%.
- HOARDER: semilla previa: anterior 33.3%, nueva 33.3%, original 100.0%; semilla nueva: anterior 29.2%, nueva 37.5%, original 91.7%.

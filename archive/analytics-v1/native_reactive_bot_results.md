# Optimización reactiva preservando la lógica nativa

- Tiempo: **91.76s** (límite 180s).
- Búsqueda: 432 evaluaciones, 27.648 partidas.
- Validación: 13.824 partidas.
- Cada rival se probó con su política nativa y con la generación calibrada anterior; dos familias de semillas separadas.
- La política nueva solo agrega una respuesta cuando la política nativa no ejecuta una acción. Observa ataques en vuelo, mejoras económicas y defensas recientes.

| Bot | Nueva vs nativa | Nueva vs gen. previa | Cambio vs nativa | Cambio vs previa |
|---|---:|---:|---:|---:|
| GREEDY | 89.5% | 53.9% | 35.5% | 35.5% |
| RUSHER | 14.8% | 28.1% | 0.6% | -13.3% |
| TURTLE | 88.2% | 90.8% | -2.6% | -2.6% |
| TEMPO | 51.7% | 68.9% | -6.3% | -17.3% |
| ADAPTIVE | 30.5% | 48.3% | -1.4% | -17.9% |
| RANDOM | 23.4% | 44.2% | -2.0% | -20.8% |
| BALANCED | 40.1% | 48.6% | 2.3% | -8.5% |
| HOARDER | 16.2% | 65.0% | 5.3% | -48.8% |
| SABOTEUR | 71.8% | 70.5% | 1.3% | 1.3% |

Las cifras son puntuación por partida (victoria=1, empate=0,5, derrota=0), no estimaciones con significación estadística. Para elegir una versión final también se revisan los cruces individuales y el peor rival.

## Parámetros elegidos

- **GREEDY:** reactWindow=24, dangerThreshold=42, economyDelay=31, economyPunishChance=0.87, counterAttackChance=0.32, captureAfter=80, captureChance=0.6, largeAttackBank=410, sabotageAfterDefenseChance=0.68.
- **RUSHER:** reactWindow=32, dangerThreshold=51, economyDelay=3, economyPunishChance=0.47, counterAttackChance=0.41, captureAfter=30, captureChance=0.28, largeAttackBank=385, sabotageAfterDefenseChance=0.11.
- **TURTLE:** reactWindow=11, dangerThreshold=163, economyDelay=17, economyPunishChance=0.55, counterAttackChance=0.8, captureAfter=40, captureChance=0.5, largeAttackBank=416, sabotageAfterDefenseChance=0.73.
- **TEMPO:** reactWindow=30, dangerThreshold=139, economyDelay=30, economyPunishChance=0.41, counterAttackChance=0.29, captureAfter=88, captureChance=0.57, largeAttackBank=660, sabotageAfterDefenseChance=0.64.
- **ADAPTIVE:** reactWindow=29, dangerThreshold=83, economyDelay=2, economyPunishChance=0.89, counterAttackChance=0.34, captureAfter=18, captureChance=0.76, largeAttackBank=290, sabotageAfterDefenseChance=0.15.
- **RANDOM:** reactWindow=24, dangerThreshold=26, economyDelay=23, economyPunishChance=0.24, counterAttackChance=0.62, captureAfter=69, captureChance=0.45, largeAttackBank=384, sabotageAfterDefenseChance=0.49.
- **BALANCED:** reactWindow=38, dangerThreshold=176, economyDelay=6, economyPunishChance=0.78, counterAttackChance=0.64, captureAfter=37, captureChance=0.86, largeAttackBank=303, sabotageAfterDefenseChance=0.43.
- **HOARDER:** reactWindow=37, dangerThreshold=135, economyDelay=16, economyPunishChance=0.79, counterAttackChance=0.27, captureAfter=69, captureChance=0.71, largeAttackBank=645, sabotageAfterDefenseChance=0.5.
- **SABOTEUR:** reactWindow=11, dangerThreshold=67, economyDelay=8, economyPunishChance=0.2, counterAttackChance=0.29, captureAfter=48, captureChance=0.63, largeAttackBank=286, sabotageAfterDefenseChance=0.21.


## Cruces detallados

### GREEDY

- RUSHER: native/previous: nativa 0.0%, previa 0.0%, reactiva 100.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 100.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 100.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 100.0%.
- TURTLE: native/previous: nativa 75.0%, previa 75.0%, reactiva 75.0%; native/fresh: nativa 68.8%, previa 68.8%, reactiva 81.3%; previous/previous: nativa 68.8%, previa 68.8%, reactiva 62.5%; previous/fresh: nativa 68.8%, previa 68.8%, reactiva 62.5%.
- TEMPO: native/previous: nativa 6.3%, previa 6.3%, reactiva 100.0%; native/fresh: nativa 12.5%, previa 12.5%, reactiva 100.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 93.8%; previous/fresh: nativa 12.5%, previa 12.5%, reactiva 75.0%.
- ADAPTIVE: native/previous: nativa 50.0%, previa 50.0%, reactiva 100.0%; native/fresh: nativa 68.8%, previa 68.8%, reactiva 100.0%; previous/previous: nativa 25.0%, previa 25.0%, reactiva 93.8%; previous/fresh: nativa 37.5%, previa 37.5%, reactiva 100.0%.
- RANDOM: native/previous: nativa 75.0%, previa 75.0%, reactiva 93.8%; native/fresh: nativa 56.3%, previa 56.3%, reactiva 93.8%; previous/previous: nativa 50.0%, previa 50.0%, reactiva 93.8%; previous/fresh: nativa 56.3%, previa 56.3%, reactiva 75.0%.
- BALANCED: native/previous: nativa 43.8%, previa 43.8%, reactiva 100.0%; native/fresh: nativa 37.5%, previa 37.5%, reactiva 100.0%; previous/previous: nativa 62.5%, previa 62.5%, reactiva 68.8%; previous/fresh: nativa 68.8%, previa 68.8%, reactiva 87.5%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 93.8%, previa 93.8%, reactiva 68.8%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 62.5%.
- SABOTEUR: native/previous: nativa 100.0%, previa 100.0%, reactiva 93.8%; native/fresh: nativa 87.5%, previa 87.5%, reactiva 93.8%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 93.8%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 93.8%.

### RUSHER

- GREEDY: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%.
- TURTLE: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- TEMPO: native/previous: nativa 0.0%, previa 18.8%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 18.8%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 12.5%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 6.3%, reactiva 0.0%.
- ADAPTIVE: native/previous: nativa 0.0%, previa 56.3%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 50.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 18.8%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- RANDOM: native/previous: nativa 25.0%, previa 50.0%, reactiva 40.6%; native/fresh: nativa 31.3%, previa 65.6%, reactiva 34.4%; previous/previous: nativa 0.0%, previa 12.5%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 12.5%, reactiva 0.0%.
- BALANCED: native/previous: nativa 0.0%, previa 18.8%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 18.8%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- HOARDER: native/previous: nativa 0.0%, previa 71.9%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 68.8%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.

### TURTLE

- GREEDY: native/previous: nativa 37.5%, previa 37.5%, reactiva 81.3%; native/fresh: nativa 43.8%, previa 43.8%, reactiva 65.6%; previous/previous: nativa 25.0%, previa 25.0%, reactiva 43.8%; previous/fresh: nativa 31.3%, previa 31.3%, reactiva 50.0%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%.
- TEMPO: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 87.5%, previa 87.5%, reactiva 75.0%; previous/fresh: nativa 93.8%, previa 93.8%, reactiva 87.5%.
- ADAPTIVE: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%.
- RANDOM: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 87.5%.
- BALANCED: native/previous: nativa 100.0%, previa 100.0%, reactiva 93.8%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 93.8%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 93.8%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 87.5%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 87.5%.
- SABOTEUR: native/previous: nativa 100.0%, previa 100.0%, reactiva 62.5%; native/fresh: nativa 93.8%, previa 93.8%, reactiva 81.3%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 50.0%; previous/fresh: nativa 93.8%, previa 93.8%, reactiva 81.3%.

### TEMPO

- GREEDY: native/previous: nativa 93.8%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 81.3%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 93.8%, reactiva 100.0%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/fresh: nativa 93.8%, previa 100.0%, reactiva 87.5%.
- TURTLE: native/previous: nativa 0.0%, previa 6.3%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- ADAPTIVE: native/previous: nativa 81.3%, previa 93.8%, reactiva 68.8%; native/fresh: nativa 56.3%, previa 87.5%, reactiva 56.3%; previous/previous: nativa 62.5%, previa 75.0%, reactiva 56.3%; previous/fresh: nativa 75.0%, previa 81.3%, reactiva 31.3%.
- RANDOM: native/previous: nativa 81.3%, previa 100.0%, reactiva 37.5%; native/fresh: nativa 75.0%, previa 93.8%, reactiva 68.8%; previous/previous: nativa 56.3%, previa 93.8%, reactiva 31.3%; previous/fresh: nativa 37.5%, previa 62.5%, reactiva 43.8%.
- BALANCED: native/previous: nativa 100.0%, previa 100.0%, reactiva 90.6%; native/fresh: nativa 96.9%, previa 100.0%, reactiva 75.0%; previous/previous: nativa 62.5%, previa 87.5%, reactiva 68.8%; previous/fresh: nativa 62.5%, previa 87.5%, reactiva 37.5%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 6.3%, previa 25.0%, reactiva 0.0%; previous/fresh: nativa 12.5%, previa 37.5%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 0.0%, previa 12.5%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 31.3%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 37.5%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 18.8%, reactiva 0.0%.

### ADAPTIVE

- GREEDY: native/previous: nativa 31.3%, previa 81.3%, reactiva 43.8%; native/fresh: nativa 25.0%, previa 81.3%, reactiva 31.3%; previous/previous: nativa 25.0%, previa 93.8%, reactiva 31.3%; previous/fresh: nativa 50.0%, previa 81.3%, reactiva 50.0%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 43.8%, previa 87.5%, reactiva 37.5%; previous/fresh: nativa 50.0%, previa 75.0%, reactiva 43.8%.
- TURTLE: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- TEMPO: native/previous: nativa 25.0%, previa 18.8%, reactiva 18.8%; native/fresh: nativa 12.5%, previa 25.0%, reactiva 12.5%; previous/previous: nativa 6.3%, previa 18.8%, reactiva 12.5%; previous/fresh: nativa 12.5%, previa 25.0%, reactiva 25.0%.
- RANDOM: native/previous: nativa 75.0%, previa 81.3%, reactiva 56.3%; native/fresh: nativa 37.5%, previa 62.5%, reactiva 50.0%; previous/previous: nativa 37.5%, previa 62.5%, reactiva 25.0%; previous/fresh: nativa 31.3%, previa 62.5%, reactiva 25.0%.
- BALANCED: native/previous: nativa 43.8%, previa 78.1%, reactiva 43.8%; native/fresh: nativa 37.5%, previa 68.8%, reactiva 31.3%; previous/previous: nativa 31.3%, previa 50.0%, reactiva 12.5%; previous/fresh: nativa 25.0%, previa 50.0%, reactiva 18.8%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 6.3%, previa 6.3%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 6.3%, reactiva 6.3%; previous/previous: nativa 6.3%, previa 12.5%, reactiva 0.0%; previous/fresh: nativa 6.3%, previa 18.8%, reactiva 0.0%.

### RANDOM

- GREEDY: native/previous: nativa 37.5%, previa 31.3%, reactiva 37.5%; native/fresh: nativa 37.5%, previa 50.0%, reactiva 43.8%; previous/previous: nativa 43.8%, previa 50.0%, reactiva 31.3%; previous/fresh: nativa 37.5%, previa 50.0%, reactiva 43.8%.
- RUSHER: native/previous: nativa 68.8%, previa 100.0%, reactiva 68.8%; native/fresh: nativa 62.5%, previa 100.0%, reactiva 62.5%; previous/previous: nativa 68.8%, previa 93.8%, reactiva 68.8%; previous/fresh: nativa 68.8%, previa 81.3%, reactiva 65.6%.
- TURTLE: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- TEMPO: native/previous: nativa 43.8%, previa 50.0%, reactiva 25.0%; native/fresh: nativa 25.0%, previa 50.0%, reactiva 25.0%; previous/previous: nativa 12.5%, previa 25.0%, reactiva 0.0%; previous/fresh: nativa 12.5%, previa 18.8%, reactiva 6.3%.
- ADAPTIVE: native/previous: nativa 25.0%, previa 81.3%, reactiva 25.0%; native/fresh: nativa 31.3%, previa 75.0%, reactiva 31.3%; previous/previous: nativa 31.3%, previa 56.3%, reactiva 18.8%; previous/fresh: nativa 12.5%, previa 50.0%, reactiva 6.3%.
- BALANCED: native/previous: nativa 37.5%, previa 56.3%, reactiva 43.8%; native/fresh: nativa 12.5%, previa 75.0%, reactiva 25.0%; previous/previous: nativa 18.8%, previa 25.0%, reactiva 12.5%; previous/fresh: nativa 12.5%, previa 37.5%, reactiva 6.3%.
- HOARDER: native/previous: nativa 50.0%, previa 96.9%, reactiva 46.9%; native/fresh: nativa 56.3%, previa 100.0%, reactiva 56.3%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 0.0%, previa 12.5%, reactiva 0.0%; native/fresh: nativa 6.3%, previa 12.5%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 12.5%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 25.0%, reactiva 0.0%.

### BALANCED

- GREEDY: native/previous: nativa 62.5%, previa 62.5%, reactiva 56.3%; native/fresh: nativa 43.8%, previa 62.5%, reactiva 62.5%; previous/previous: nativa 62.5%, previa 56.3%, reactiva 68.8%; previous/fresh: nativa 68.8%, previa 37.5%, reactiva 75.0%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 93.8%, previa 100.0%, reactiva 87.5%; previous/fresh: nativa 81.3%, previa 93.8%, reactiva 93.8%.
- TURTLE: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- TEMPO: native/previous: nativa 0.0%, previa 37.5%, reactiva 18.8%; native/fresh: nativa 6.3%, previa 43.8%, reactiva 25.0%; previous/previous: nativa 0.0%, previa 25.0%, reactiva 12.5%; previous/fresh: nativa 0.0%, previa 43.8%, reactiva 6.3%.
- ADAPTIVE: native/previous: nativa 75.0%, previa 93.8%, reactiva 62.5%; native/fresh: nativa 62.5%, previa 75.0%, reactiva 56.3%; previous/previous: nativa 31.3%, previa 62.5%, reactiva 18.8%; previous/fresh: nativa 37.5%, previa 68.8%, reactiva 37.5%.
- RANDOM: native/previous: nativa 75.0%, previa 93.8%, reactiva 62.5%; native/fresh: nativa 50.0%, previa 68.8%, reactiva 40.6%; previous/previous: nativa 31.3%, previa 62.5%, reactiva 18.8%; previous/fresh: nativa 28.1%, previa 50.0%, reactiva 50.0%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 0.0%, previa 6.3%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 6.3%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 0.0%, previa 0.0%, reactiva 18.8%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 6.3%; previous/previous: nativa 0.0%, previa 6.3%, reactiva 6.3%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.

### HOARDER

- GREEDY: native/previous: nativa 0.0%, previa 0.0%, reactiva 50.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 50.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 43.8%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 50.0%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 25.0%, previa 100.0%, reactiva 25.0%; previous/fresh: nativa 25.0%, previa 100.0%, reactiva 18.8%.
- TURTLE: native/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 0.0%, reactiva 0.0%.
- TEMPO: native/previous: nativa 6.3%, previa 100.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 100.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 56.3%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 56.3%, reactiva 0.0%.
- ADAPTIVE: native/previous: nativa 0.0%, previa 100.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 100.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 100.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 100.0%, reactiva 0.0%.
- RANDOM: native/previous: nativa 50.0%, previa 100.0%, reactiva 37.5%; native/fresh: nativa 43.8%, previa 100.0%, reactiva 43.8%; previous/previous: nativa 0.0%, previa 100.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 100.0%, reactiva 0.0%.
- BALANCED: native/previous: nativa 0.0%, previa 100.0%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 100.0%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 87.5%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 62.5%, reactiva 0.0%.
- SABOTEUR: native/previous: nativa 0.0%, previa 56.3%, reactiva 0.0%; native/fresh: nativa 0.0%, previa 43.8%, reactiva 0.0%; previous/previous: nativa 0.0%, previa 50.0%, reactiva 0.0%; previous/fresh: nativa 0.0%, previa 68.8%, reactiva 0.0%.

### SABOTEUR

- GREEDY: native/previous: nativa 0.0%, previa 0.0%, reactiva 12.5%; native/fresh: nativa 6.3%, previa 6.3%, reactiva 37.5%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 43.8%; previous/fresh: nativa 12.5%, previa 12.5%, reactiva 31.3%.
- RUSHER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 93.8%, previa 93.8%, reactiva 100.0%; previous/fresh: nativa 93.8%, previa 93.8%, reactiva 100.0%.
- TURTLE: native/previous: nativa 18.8%, previa 18.8%, reactiva 25.0%; native/fresh: nativa 6.3%, previa 6.3%, reactiva 28.1%; previous/previous: nativa 0.0%, previa 0.0%, reactiva 31.3%; previous/fresh: nativa 6.3%, previa 6.3%, reactiva 37.5%.
- TEMPO: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 93.8%; previous/previous: nativa 62.5%, previa 62.5%, reactiva 62.5%; previous/fresh: nativa 75.0%, previa 75.0%, reactiva 68.8%.
- ADAPTIVE: native/previous: nativa 100.0%, previa 100.0%, reactiva 93.8%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 87.5%; previous/previous: nativa 93.8%, previa 93.8%, reactiva 93.8%; previous/fresh: nativa 100.0%, previa 100.0%, reactiva 93.8%.
- RANDOM: native/previous: nativa 100.0%, previa 100.0%, reactiva 87.5%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 93.8%, previa 93.8%, reactiva 43.8%; previous/fresh: nativa 87.5%, previa 87.5%, reactiva 62.5%.
- BALANCED: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 100.0%, previa 100.0%, reactiva 81.3%; previous/fresh: nativa 93.8%, previa 93.8%, reactiva 81.3%.
- HOARDER: native/previous: nativa 100.0%, previa 100.0%, reactiva 100.0%; native/fresh: nativa 100.0%, previa 100.0%, reactiva 100.0%; previous/previous: nativa 68.8%, previa 68.8%, reactiva 43.8%; previous/fresh: nativa 43.8%, previa 43.8%, reactiva 56.3%.

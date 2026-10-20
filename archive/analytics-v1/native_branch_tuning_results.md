# Ajuste de ramas nativas por estrategia

- Tiempo: **101.94s** (límite: 180s).
- Búsqueda: 360 evaluaciones, 34.560 partidas.
- Validación reservada: 20.736 partidas en dos familias de semillas.
- Cada candidato conserva el orden nativo del bot y solo modifica los parámetros de su estrategia.
- Rivales: las otras ocho estrategias en tres estados: nativo, calibrado anterior y versión actual.
- Puntuación: victoria=1, empate=0,5, derrota=0; fitness de búsqueda combina media y peor rival.

| Bot | Nativo | Calibrado previo | Actual | Ramas nativas ajustadas | Δ vs actual |
|---|---:|---:|---:|---:|---:|
| GREEDY | 50.5% | 50.5% | 89.8% | 50.2% | -39.6% |
| RUSHER | 10.2% | 19.7% | 19.7% | 12.3% | -7.4% |
| TURTLE | 88.7% | 88.7% | 88.7% | 97.9% | 9.2% |
| TEMPO | 49.1% | 61.8% | 61.8% | 62.5% | 0.7% |
| ADAPTIVE | 25.7% | 43.1% | 43.1% | 27.4% | -15.6% |
| RANDOM | 21.0% | 39.8% | 39.8% | 25.2% | -14.6% |
| BALANCED | 35.3% | 41.9% | 41.9% | 33.7% | -8.2% |
| HOARDER | 10.2% | 66.0% | 66.0% | 59.2% | -6.8% |
| SABOTEUR | 70.0% | 70.0% | 70.0% | 87.1% | 17.1% |

Las mejoras pequeñas requieren más partidas para confirmarse. Antes de aplicarlas se revisa también el peor cruce y el resultado en ambas semillas.

## Parámetros por bot

### GREEDY

- Mejor promedio de búsqueda: 59.4%; peor rival: 0.0%.
- Parámetros: greedyGrowth=1.96, greedyEcoUntil=140, greedyFactoryAfter=70, greedyCaptureAfter=74, greedyCaptureChance=0.45, greedyAttackAfter=125, greedySabotageAfter=121, greedySabotageChance=0.45, greedyLateAttackAfter=160.
- Validación por rival:
  - RUSHER: nativo 0.0%, calibrado 0.0%, actual 100.0%, ajustado 0.0%.
  - TURTLE: nativo 77.8%, calibrado 77.8%, actual 76.4%, ajustado 75.0%.
  - TEMPO: nativo 8.3%, calibrado 8.3%, actual 90.3%, ajustado 1.4%.
  - ADAPTIVE: nativo 36.1%, calibrado 36.1%, actual 97.2%, ajustado 36.1%.
  - RANDOM: nativo 45.8%, calibrado 45.8%, actual 87.5%, ajustado 45.8%.
  - BALANCED: nativo 43.1%, calibrado 43.1%, actual 87.5%, ajustado 43.1%.
  - HOARDER: nativo 94.4%, calibrado 94.4%, actual 80.6%, ajustado 100.0%.
  - SABOTEUR: nativo 98.6%, calibrado 98.6%, actual 98.6%, ajustado 100.0%.

### RUSHER

- Mejor promedio de búsqueda: 13.5%; peor rival: 0.0%.
- Parámetros: rusherFactoryAfter=29, rusherDefendHP=465, rusherEcoAfter=30, rusherEcoReserve=147, rusherGrowth=1.42, rusherCaptureShield=198, rusherLargeAfter=149, rusherLargeReserve=246, rusherCaptureAfter=86.
- Validación por rival:
  - GREEDY: nativo 66.7%, calibrado 66.7%, actual 66.7%, ajustado 59.7%.
  - TURTLE: nativo 0.0%, calibrado 0.0%, actual 0.0%, ajustado 0.0%.
  - TEMPO: nativo 0.0%, calibrado 8.3%, actual 8.3%, ajustado 0.0%.
  - ADAPTIVE: nativo 0.0%, calibrado 23.6%, actual 23.6%, ajustado 0.0%.
  - RANDOM: nativo 15.3%, calibrado 30.6%, actual 30.6%, ajustado 20.8%.
  - BALANCED: nativo 0.0%, calibrado 6.9%, actual 6.9%, ajustado 0.0%.
  - HOARDER: nativo 0.0%, calibrado 21.5%, actual 21.5%, ajustado 18.1%.
  - SABOTEUR: nativo 0.0%, calibrado 0.0%, actual 0.0%, ajustado 0.0%.

### TURTLE

- Mejor promedio de búsqueda: 100.0%; peor rival: 100.0%.
- Parámetros: turtleGrowth=1.47, turtleEcoUntil=107, turtleShieldBelow=63, turtleShieldBank=99, turtleShieldAfter=29, turtleFactoryAfter=77, turtleCaptureAfter=55, turtleAttackAfter=150, turtleSabotageAfter=94, turtleSabotageChance=0.59.
- Validación por rival:
  - GREEDY: nativo 27.8%, calibrado 27.8%, actual 27.8%, ajustado 84.7%.
  - RUSHER: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - TEMPO: nativo 94.4%, calibrado 94.4%, actual 94.4%, ajustado 100.0%.
  - ADAPTIVE: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - RANDOM: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - BALANCED: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - HOARDER: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - SABOTEUR: nativo 87.5%, calibrado 87.5%, actual 87.5%, ajustado 98.6%.

### TEMPO

- Mejor promedio de búsqueda: 61.5%; peor rival: 16.7%.
- Parámetros: tempoFactoryAfter=30, tempoPunishEconomyCount=2, tempoGrowth=1.89, tempoEcoUntil=84, tempoCaptureAfter=31, tempoCaptureChance=0.64, tempoAttackAfter=132, tempoSabotageAfter=121, tempoSabotageChance=0.51.
- Validación por rival:
  - GREEDY: nativo 65.3%, calibrado 75.0%, actual 75.0%, ajustado 18.1%.
  - RUSHER: nativo 95.8%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - TURTLE: nativo 0.0%, calibrado 2.8%, actual 2.8%, ajustado 16.7%.
  - ADAPTIVE: nativo 69.4%, calibrado 72.2%, actual 72.2%, ajustado 81.9%.
  - RANDOM: nativo 55.6%, calibrado 84.7%, actual 84.7%, ajustado 90.3%.
  - BALANCED: nativo 70.8%, calibrado 79.2%, actual 79.2%, ajustado 88.9%.
  - HOARDER: nativo 36.1%, calibrado 54.2%, actual 54.2%, ajustado 76.4%.
  - SABOTEUR: nativo 0.0%, calibrado 26.4%, actual 26.4%, ajustado 27.8%.

### ADAPTIVE

- Mejor promedio de búsqueda: 29.2%; peor rival: 0.0%.
- Parámetros: adaptiveDefenseLead=2, adaptiveDefenseGrowth=1.89, adaptiveGrowth=1.27, adaptiveEcoUntil=119, adaptiveFactoryAfter=0, adaptiveCaptureChance=0.39, adaptiveAttackAfter=105, adaptiveLargeAfter=84, adaptiveSabotageChance=0.37.
- Validación por rival:
  - GREEDY: nativo 16.7%, calibrado 47.2%, actual 47.2%, ajustado 13.9%.
  - RUSHER: nativo 63.9%, calibrado 91.7%, actual 91.7%, ajustado 63.9%.
  - TURTLE: nativo 0.0%, calibrado 0.0%, actual 0.0%, ajustado 0.0%.
  - TEMPO: nativo 11.1%, calibrado 26.4%, actual 26.4%, ajustado 16.7%.
  - RANDOM: nativo 43.1%, calibrado 73.6%, actual 73.6%, ajustado 51.4%.
  - BALANCED: nativo 33.3%, calibrado 62.5%, actual 62.5%, ajustado 38.9%.
  - HOARDER: nativo 31.9%, calibrado 33.3%, actual 33.3%, ajustado 29.2%.
  - SABOTEUR: nativo 5.6%, calibrado 9.7%, actual 9.7%, ajustado 5.6%.

### RANDOM

- Mejor promedio de búsqueda: 30.2%; peor rival: 0.0%.
- Parámetros: randomActionChance=0.37.
- Validación por rival:
  - GREEDY: nativo 27.8%, calibrado 47.2%, actual 47.2%, ajustado 8.3%.
  - RUSHER: nativo 54.2%, calibrado 94.4%, actual 94.4%, ajustado 65.3%.
  - TURTLE: nativo 0.0%, calibrado 0.0%, actual 0.0%, ajustado 0.0%.
  - TEMPO: nativo 15.3%, calibrado 34.7%, actual 34.7%, ajustado 20.8%.
  - ADAPTIVE: nativo 30.6%, calibrado 54.2%, actual 54.2%, ajustado 36.8%.
  - BALANCED: nativo 16.7%, calibrado 43.1%, actual 43.1%, ajustado 39.6%.
  - HOARDER: nativo 20.8%, calibrado 33.3%, actual 33.3%, ajustado 27.8%.
  - SABOTEUR: nativo 2.8%, calibrado 11.1%, actual 11.1%, ajustado 2.8%.

### BALANCED

- Mejor promedio de búsqueda: 39.6%; peor rival: 0.0%.
- Parámetros: balancedGrowth=2.27, balancedEcoUntil=154, balancedEcoMaxLevel=2, balancedFactoryAfter=25, balancedCaptureAfter=88, balancedCaptureChance=0.46, balancedAttackAfter=88, balancedLargeReserve=86, balancedSabotageChance=0.09, balancedFallbackGrowth=1.84.
- Validación por rival:
  - GREEDY: nativo 41.7%, calibrado 30.6%, actual 30.6%, ajustado 0.0%.
  - RUSHER: nativo 94.4%, calibrado 95.8%, actual 95.8%, ajustado 95.8%.
  - TURTLE: nativo 0.0%, calibrado 1.4%, actual 1.4%, ajustado 0.0%.
  - TEMPO: nativo 8.3%, calibrado 33.3%, actual 33.3%, ajustado 54.9%.
  - ADAPTIVE: nativo 52.8%, calibrado 69.4%, actual 69.4%, ajustado 36.1%.
  - RANDOM: nativo 52.1%, calibrado 59.0%, actual 59.0%, ajustado 46.5%.
  - HOARDER: nativo 33.3%, calibrado 40.3%, actual 40.3%, ajustado 36.1%.
  - SABOTEUR: nativo 0.0%, calibrado 5.6%, actual 5.6%, ajustado 0.0%.

### HOARDER

- Mejor promedio de búsqueda: 57.3%; peor rival: 0.0%.
- Parámetros: hoarderFactoryAfter=13, hoarderFactoryBank=458, hoarderHoldBank=329, hoarderHoldUntil=138, hoarderEcoMaxLevel=4, hoarderGrowth=2.02, hoarderCaptureAfter=74, hoarderCaptureChance=0.13.
- Validación por rival:
  - GREEDY: nativo 0.0%, calibrado 9.7%, actual 9.7%, ajustado 36.1%.
  - RUSHER: nativo 56.9%, calibrado 100.0%, actual 100.0%, ajustado 72.2%.
  - TURTLE: nativo 0.0%, calibrado 1.4%, actual 1.4%, ajustado 0.0%.
  - TEMPO: nativo 2.8%, calibrado 77.8%, actual 77.8%, ajustado 70.8%.
  - ADAPTIVE: nativo 0.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - RANDOM: nativo 22.2%, calibrado 100.0%, actual 100.0%, ajustado 98.6%.
  - BALANCED: nativo 0.0%, calibrado 86.1%, actual 86.1%, ajustado 86.1%.
  - SABOTEUR: nativo 0.0%, calibrado 52.8%, actual 52.8%, ajustado 9.7%.

### SABOTEUR

- Mejor promedio de búsqueda: 95.8%; peor rival: 83.3%.
- Parámetros: saboteurGrowth=1.64, saboteurEcoUntil=150, saboteurSabotageAfter=33, saboteurFactoryAfter=31, saboteurCaptureAfter=77, saboteurCaptureChance=0.7, saboteurAttackAfter=129.
- Validación por rival:
  - GREEDY: nativo 6.9%, calibrado 6.9%, actual 6.9%, ajustado 72.2%.
  - RUSHER: nativo 100.0%, calibrado 100.0%, actual 100.0%, ajustado 100.0%.
  - TURTLE: nativo 4.2%, calibrado 4.2%, actual 4.2%, ajustado 68.1%.
  - TEMPO: nativo 91.7%, calibrado 91.7%, actual 91.7%, ajustado 79.2%.
  - ADAPTIVE: nativo 97.2%, calibrado 97.2%, actual 97.2%, ajustado 94.4%.
  - RANDOM: nativo 88.9%, calibrado 88.9%, actual 88.9%, ajustado 93.1%.
  - BALANCED: nativo 97.2%, calibrado 97.2%, actual 97.2%, ajustado 94.4%.
  - HOARDER: nativo 73.6%, calibrado 73.6%, actual 73.6%, ajustado 95.1%.

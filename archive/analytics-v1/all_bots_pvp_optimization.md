# Optimización PvP de todas las estrategias

- Tiempo total: **54.13s** (límite: 180s)
- Búsqueda: 900 evaluaciones, 28.800 partidas
- Validación separada: 3.456 partidas adicionales
- Motor base, sin módulos/doctrinas/bonificaciones persistentes; lados alternados y civilizaciones rotativas.
- Cada estrategia se optimiza por separado contra las otras ocho.
- Los candidatos usan el mismo orden de decisiones parametrizado; los bots originales quedan intactos para rivales y comparación base.

| Estrategia | Puntuación media optimizada | Media original | Cambio | Peor rival en validación |
|---|---:|---:|---:|---|
| GREEDY | 65.6% | 53.6% | 12.0% | TURTLE 0.0% |
| RUSHER | 54.2% | 17.2% | 37.0% | TURTLE 0.0% |
| TURTLE | 73.4% | 90.6% | -17.2% | SABOTEUR 8.3% |
| TEMPO | 64.1% | 67.7% | -3.7% | TURTLE 0.0% |
| ADAPTIVE | 57.8% | 45.3% | 12.5% | TURTLE 0.0% |
| RANDOM | 63.5% | 35.9% | 27.6% | TURTLE 0.0% |
| BALANCED | 58.9% | 47.7% | 11.2% | TURTLE 0.0% |
| HOARDER | 56.3% | 18.8% | 37.5% | TURTLE 0.0% |
| SABOTEUR | 65.6% | 76.0% | -10.4% | TURTLE 0.0% |

## Parámetros y cruces

### GREEDY

- Mejor promedio en búsqueda: 75.0%; peor rival en búsqueda: 0.0%.
- Cruces validados: RUSHER 100.0% (base 0.0%); TURTLE 0.0% (base 79.2%); TEMPO 62.5% (base 4.2%); ADAPTIVE 83.3% (base 66.7%); RANDOM 87.5% (base 62.5%); BALANCED 87.5% (base 33.3%); HOARDER 100.0% (base 100.0%); SABOTEUR 4.2% (base 83.3%).
- Parámetros: ecoUntil=138, ecoFactor=1.55, factoryAfter=40, defendAfter=75, defendValue=0, captureAfter=62, captureChance=0.62, attackAfter=85, largeAfter=106, largeBank=230, sabotageAfter=92, sabotageChance=0.53, specialization=0.

### RUSHER

- Mejor promedio en búsqueda: 71.9%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 37.5% (base 100.0%); TURTLE 0.0% (base 0.0%); TEMPO 45.8% (base 0.0%); ADAPTIVE 83.3% (base 0.0%); RANDOM 79.2% (base 37.5%); BALANCED 83.3% (base 0.0%); HOARDER 100.0% (base 0.0%); SABOTEUR 4.2% (base 0.0%).
- Parámetros: ecoUntil=55, ecoFactor=1.27, factoryAfter=46, defendAfter=33, defendValue=212, captureAfter=91, captureChance=0.44, attackAfter=151, largeAfter=146, largeBank=638, sabotageAfter=136, sabotageChance=0.54, specialization=0.

### TURTLE

- Mejor promedio en búsqueda: 78.1%; peor rival en búsqueda: 25.0%.
- Cruces validados: GREEDY 29.2% (base 33.3%); RUSHER 100.0% (base 100.0%); TEMPO 75.0% (base 100.0%); ADAPTIVE 95.8% (base 100.0%); RANDOM 87.5% (base 100.0%); BALANCED 91.7% (base 100.0%); HOARDER 100.0% (base 100.0%); SABOTEUR 8.3% (base 91.7%).
- Parámetros: ecoUntil=130, ecoFactor=1.9, factoryAfter=48, defendAfter=10, defendValue=0, captureAfter=64, captureChance=0.82, attackAfter=139, largeAfter=125, largeBank=350, sabotageAfter=128, sabotageChance=0.5, specialization=0.

### TEMPO

- Mejor promedio en búsqueda: 68.8%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 41.7% (base 100.0%); RUSHER 100.0% (base 100.0%); TURTLE 0.0% (base 0.0%); ADAPTIVE 83.3% (base 79.2%); RANDOM 95.8% (base 66.7%); BALANCED 87.5% (base 95.8%); HOARDER 100.0% (base 100.0%); SABOTEUR 4.2% (base 0.0%).
- Parámetros: ecoUntil=75, ecoFactor=2.08, factoryAfter=37, defendAfter=27, defendValue=84, captureAfter=117, captureChance=0.83, attackAfter=109, largeAfter=121, largeBank=598, sabotageAfter=69, sabotageChance=0.38, specialization=0.

### ADAPTIVE

- Mejor promedio en búsqueda: 68.8%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 33.3% (base 29.2%); RUSHER 100.0% (base 100.0%); TURTLE 0.0% (base 0.0%); TEMPO 45.8% (base 29.2%); RANDOM 91.7% (base 54.2%); BALANCED 87.5% (base 45.8%); HOARDER 100.0% (base 100.0%); SABOTEUR 4.2% (base 4.2%).
- Parámetros: ecoUntil=144, ecoFactor=1.15, factoryAfter=72, defendAfter=65, defendValue=93, captureAfter=49, captureChance=0.21, attackAfter=153, largeAfter=127, largeBank=270, sabotageAfter=60, sabotageChance=0.2, specialization=0.

### RANDOM

- Mejor promedio en búsqueda: 75.0%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 70.8% (base 45.8%); RUSHER 100.0% (base 75.0%); TURTLE 0.0% (base 0.0%); TEMPO 83.3% (base 20.8%); ADAPTIVE 79.2% (base 47.9%); BALANCED 75.0% (base 35.4%); HOARDER 100.0% (base 54.2%); SABOTEUR 0.0% (base 8.3%).
- Parámetros: ecoUntil=110, ecoFactor=1.55, factoryAfter=21, defendAfter=30, defendValue=73, captureAfter=25, captureChance=0.83, attackAfter=58, largeAfter=154, largeBank=300, sabotageAfter=128, sabotageChance=0.33, specialization=0.

### BALANCED

- Mejor promedio en búsqueda: 65.6%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 25.0% (base 58.3%); RUSHER 100.0% (base 100.0%); TURTLE 0.0% (base 0.0%); TEMPO 62.5% (base 4.2%); ADAPTIVE 91.7% (base 54.2%); RANDOM 91.7% (base 64.6%); HOARDER 100.0% (base 100.0%); SABOTEUR 0.0% (base 0.0%).
- Parámetros: ecoUntil=86, ecoFactor=1.53, factoryAfter=56, defendAfter=66, defendValue=58, captureAfter=58, captureChance=0.73, attackAfter=132, largeAfter=147, largeBank=269, sabotageAfter=135, sabotageChance=0.41, specialization=0.

### HOARDER

- Mejor promedio en búsqueda: 68.8%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 37.5% (base 0.0%); RUSHER 100.0% (base 100.0%); TURTLE 0.0% (base 0.0%); TEMPO 50.0% (base 4.2%); ADAPTIVE 83.3% (base 0.0%); RANDOM 95.8% (base 45.8%); BALANCED 83.3% (base 0.0%); SABOTEUR 0.0% (base 0.0%).
- Parámetros: ecoUntil=165, ecoFactor=1.7, factoryAfter=40, defendAfter=65, defendValue=0, captureAfter=75, captureChance=0.4, attackAfter=99, largeAfter=120, largeBank=500, sabotageAfter=114, sabotageChance=0.2, specialization=0.

### SABOTEUR

- Mejor promedio en búsqueda: 81.3%; peor rival en búsqueda: 0.0%.
- Cruces validados: GREEDY 29.2% (base 8.3%); RUSHER 100.0% (base 100.0%); TURTLE 0.0% (base 8.3%); TEMPO 45.8% (base 100.0%); ADAPTIVE 87.5% (base 95.8%); RANDOM 87.5% (base 95.8%); BALANCED 79.2% (base 100.0%); HOARDER 95.8% (base 100.0%).
- Parámetros: ecoUntil=136, ecoFactor=1.31, factoryAfter=78, defendAfter=74, defendValue=204, captureAfter=45, captureChance=0.81, attackAfter=89, largeAfter=117, largeBank=637, sabotageAfter=76, sabotageChance=0.18, specialization=0.

Las tasas son puntuaciones de partidas (victoria=1, empate=0, derrota=0); son estimaciones sujetas a la semilla y al comportamiento actual de los rivales.

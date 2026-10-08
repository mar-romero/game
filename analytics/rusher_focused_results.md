# Optimización enfocada de RUSHER

- Tiempo: **83.85s** (límite: 180s).
- Búsqueda: 256 evaluaciones, 36.864 partidas.
- Validación: 4.608 partidas en dos familias de semillas.
- Rivales: los otros ocho bots, en versiones nativas, calibradas y actuales.
- La candidata mantiene una apertura centrada en fábrica y presión; ajusta sus propias reglas.
- Esta versión quedó instalada como la política de RUSHER en el juego.
- Puntuación: victoria=1, empate=0,5, derrota=0.

| Versión | Media conjunta | Semilla previa | Semilla nueva |
|---|---:|---:|---:|
| Nativa | 9.6% | 9.4% | 9.8% |
| Actual | 18.8% | 18.4% | 19.3% |
| Nueva RUSHER | 56.4% | 57.0% | 55.8% |

## Resultado por rival

- **GREEDY:** nativo 66.7%, actual 66.7%, nueva 67.7%.
- **TURTLE:** nativo 0.0%, actual 0.0%, nueva 0.0%.
- **TEMPO:** nativo 0.0%, actual 6.3%, nueva 87.0%.
- **ADAPTIVE:** nativo 0.0%, actual 23.7%, nueva 93.2%.
- **RANDOM:** nativo 9.9%, actual 23.2%, nueva 57.8%.
- **BALANCED:** nativo 0.0%, actual 6.3%, nueva 80.2%.
- **HOARDER:** nativo 0.0%, actual 24.2%, nueva 21.4%.
- **SABOTEUR:** nativo 0.0%, actual 0.5%, nueva 43.8%.

## Parámetros encontrados

- factoryAfter: 13
- preFactoryEcoUntil: 12
- growthFactor: 1.68
- ecoAfterFactory: 56
- ecoUntil: 137
- ecoMaxLevel: 3
- attackAfter: 90
- largeAfter: 92
- largeBank: 261
- defendHP: 398
- defendThreshold: 10
- captureAfter: 71
- captureChance: 0.44
- captureShield: 272
- counterEcoDelay: 13
- counterEcoChance: 0.79
- sabotageAfter: 61
- sabotageChance: 0.52

La candidata mejora la media frente a la versión actual en ambas familias de semillas y quedó promovida. Tiene counters claros: pierde contra TURTLE en esta validación y su resultado contra HOARDER baja frente a la versión actual. La media agregada no implica que RUSHER sea superior a cada rival.

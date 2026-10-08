# Decisión de despliegue para los bots PvP

La tanda ajustó una respuesta reactiva que se ejecuta solo cuando la estrategia nativa no hizo una acción. Cada cruce se evaluó contra rivales nativos y calibrados previos, con dos familias de semillas no usadas para entrenar. Victoria=1, empate=0,5, derrota=0.

| Bot | Nativo | Calibrado previo | Nativo + reactivo | Decisión aplicada |
|---|---:|---:|---:|---|
| GREEDY | 53.9% | 53.9% | 89.5% | nativa + respuesta reactiva |
| RUSHER | 14.3% | 28.1% | 14.8% | generación calibrada anterior |
| TURTLE | 90.8% | 90.8% | 88.2% | lógica nativa |
| TEMPO | 57.9% | 68.9% | 51.7% | generación calibrada anterior |
| ADAPTIVE | 31.8% | 48.3% | 30.5% | generación calibrada anterior |
| RANDOM | 25.4% | 44.2% | 23.4% | generación calibrada anterior |
| BALANCED | 37.8% | 48.6% | 40.1% | generación calibrada anterior |
| HOARDER | 10.9% | 65.0% | 16.2% | generación calibrada anterior |
| SABOTEUR | 70.5% | 70.5% | 71.8% | lógica nativa |

Se aplicó la variante reactiva de GREEDY: obtuvo una mejora amplia frente a ambas referencias en las dos familias de semillas. Para los demás, el añadido reactivo perdió frente a la versión calibrada existente o la diferencia fue pequeña; no se desplegó para evitar sustituir una versión mejor medida. TURTLE y SABOTEUR siguen con su estrategia nativa.

## Respuesta GREEDY

La extensión toma decisiones cuando ve ataques entrantes, mejoras económicas o defensas recientes del rival. Parámetros: `reactWindow=24`, `dangerThreshold=42`, `economyDelay=31`, `economyPunishChance=0.87`, `counterAttackChance=0.32`, `captureAfter=80`, `captureChance=0.60`, `largeAttackBank=410`, `sabotageAfterDefenseChance=0.68`.

La diferencia de GREEDY es grande en esta tanda (89,5% frente a 53,9%), pero cada rival/estilo y familia de semillas tiene pocas partidas para estimar incertidumbre. Antes de ajustar los otros bots, conviene ampliar especialmente las partidas de validación y optimizar sus ramas nativas en lugar de usar un orden común.

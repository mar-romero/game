# Simulación PvP básico

- Partidas: **2250**
- Estrategias: GREEDY, RUSHER, TURTLE, TEMPO, ADAPTIVE, RANDOM, BALANCED, HOARDER, SABOTEUR
- Repeticiones: 25 por cruce y asignación de lado (mirrored)
- Civilizaciones: forge, bastion, swarm, nexus
- Motor: dominio base, sin extensiones web de módulos/doctrinas
- Configuración: 240s, 700 HP, 240 recursos iniciales

| Bot A | Bot B | J gana | Empates | B gana | Duración media | HP final A/B |
|---|---|---:|---:|---:|---:|---:|
| GREEDY | GREEDY | 27 (54.0%) | 23 | 0 (0.0%) | 240s | 671.5 / 671.5 |
| GREEDY | RUSHER | 0 (0.0%) | 0 | 50 (100.0%) | 65.4s | 0 / 700 |
| GREEDY | TURTLE | 34 (68.0%) | 1 | 15 (30.0%) | 240s | 689.8 / 651.5 |
| GREEDY | TEMPO | 0 (0.0%) | 0 | 50 (100.0%) | 68.1s | 0 / 700 |
| GREEDY | ADAPTIVE | 39 (78.0%) | 0 | 11 (22.0%) | 109.7s | 123.3 / 154 |
| GREEDY | RANDOM | 27 (54.0%) | 0 | 23 (46.0%) | 95.3s | 102.2 / 322 |
| GREEDY | BALANCED | 26 (52.0%) | 0 | 24 (48.0%) | 98.4s | 74.3 / 336 |
| GREEDY | HOARDER | 50 (100.0%) | 0 | 0 (0.0%) | 156.5s | 700 / 39.5 |
| GREEDY | SABOTEUR | 46 (92.0%) | 0 | 4 (8.0%) | 240s | 697.6 / 525.5 |
| RUSHER | RUSHER | 10 (20.0%) | 40 | 0 (0.0%) | 204.4s | 152.3 / 152.3 |
| RUSHER | TURTLE | 0 (0.0%) | 0 | 50 (100.0%) | 136.5s | 0 / 700 |
| RUSHER | TEMPO | 0 (0.0%) | 0 | 50 (100.0%) | 126.2s | 0 / 694.4 |
| RUSHER | ADAPTIVE | 0 (0.0%) | 0 | 50 (100.0%) | 165.9s | 0 / 695.4 |
| RUSHER | RANDOM | 13 (26.0%) | 0 | 37 (74.0%) | 199s | 138.7 / 429.1 |
| RUSHER | BALANCED | 0 (0.0%) | 0 | 50 (100.0%) | 158.4s | 27.5 / 663.7 |
| RUSHER | HOARDER | 0 (0.0%) | 0 | 50 (100.0%) | 230.5s | 66.5 / 678.4 |
| RUSHER | SABOTEUR | 0 (0.0%) | 0 | 50 (100.0%) | 143.2s | 0 / 700 |
| TURTLE | TURTLE | 22 (44.0%) | 28 | 0 (0.0%) | 240s | 665 / 665 |
| TURTLE | TEMPO | 50 (100.0%) | 0 | 0 (0.0%) | 142.6s | 641.3 / 0 |
| TURTLE | ADAPTIVE | 50 (100.0%) | 0 | 0 (0.0%) | 150.2s | 692.8 / 0 |
| TURTLE | RANDOM | 50 (100.0%) | 0 | 0 (0.0%) | 156.8s | 680.5 / 18.2 |
| TURTLE | BALANCED | 50 (100.0%) | 0 | 0 (0.0%) | 142.1s | 700 / 0 |
| TURTLE | HOARDER | 50 (100.0%) | 0 | 0 (0.0%) | 159.4s | 697.4 / 18.7 |
| TURTLE | SABOTEUR | 44 (88.0%) | 0 | 6 (12.0%) | 240s | 690.4 / 548.9 |
| TEMPO | TEMPO | 24 (48.0%) | 26 | 0 (0.0%) | 161.8s | 280 / 280 |
| TEMPO | ADAPTIVE | 36 (72.0%) | 0 | 14 (28.0%) | 220.2s | 573.1 / 361.4 |
| TEMPO | RANDOM | 38 (76.0%) | 0 | 12 (24.0%) | 193.9s | 626.2 / 293.2 |
| TEMPO | BALANCED | 48 (96.0%) | 0 | 2 (4.0%) | 222.2s | 587.8 / 427.2 |
| TEMPO | HOARDER | 50 (100.0%) | 0 | 0 (0.0%) | 212.6s | 700 / 266.9 |
| TEMPO | SABOTEUR | 0 (0.0%) | 0 | 50 (100.0%) | 168s | 20.9 / 566.4 |
| ADAPTIVE | ADAPTIVE | 35 (70.0%) | 15 | 0 (0.0%) | 206.7s | 569.3 / 569.3 |
| ADAPTIVE | RANDOM | 35 (70.0%) | 0 | 15 (30.0%) | 200.1s | 589.8 / 374 |
| ADAPTIVE | BALANCED | 20 (40.0%) | 0 | 30 (60.0%) | 206.7s | 361.1 / 616.4 |
| ADAPTIVE | HOARDER | 50 (100.0%) | 0 | 0 (0.0%) | 214.9s | 700 / 492.8 |
| ADAPTIVE | SABOTEUR | 3 (6.0%) | 0 | 47 (94.0%) | 178.7s | 103.5 / 645.3 |
| RANDOM | RANDOM | 25 (50.0%) | 25 | 0 (0.0%) | 215.9s | 477.5 / 477.5 |
| RANDOM | BALANCED | 21 (42.0%) | 1 | 28 (56.0%) | 201.5s | 359.5 / 583.9 |
| RANDOM | HOARDER | 22 (44.0%) | 1 | 27 (54.0%) | 227.3s | 380.7 / 597.1 |
| RANDOM | SABOTEUR | 1 (2.0%) | 0 | 49 (98.0%) | 188.9s | 102 / 670.9 |
| BALANCED | BALANCED | 23 (46.0%) | 27 | 0 (0.0%) | 231.6s | 486.4 / 486.4 |
| BALANCED | HOARDER | 50 (100.0%) | 0 | 0 (0.0%) | 145.6s | 700 / 36.5 |
| BALANCED | SABOTEUR | 0 (0.0%) | 0 | 50 (100.0%) | 164.2s | 0 / 699.9 |
| HOARDER | HOARDER | 27 (54.0%) | 23 | 0 (0.0%) | 240s | 689.4 / 689.4 |
| HOARDER | SABOTEUR | 0 (0.0%) | 0 | 50 (100.0%) | 165.9s | 18.2 / 700 |
| SABOTEUR | SABOTEUR | 23 (46.0%) | 27 | 0 (0.0%) | 240s | 567.4 / 567.4 |

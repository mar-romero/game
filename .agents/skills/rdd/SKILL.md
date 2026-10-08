---
name: rdd
description: Reduce material product, domain, architecture, or external-contract uncertainty before committing to implementation.
---

# RDD — Research-Driven Discovery

Activá RDD cuando una incógnita tenga probabilidad razonable de cambiar requisitos, arquitectura, seguridad, costo o elección tecnológica. No lo actives para disfrazar una tarea clara como investigación.

1. Escribí la decisión concreta que la investigación debe informar.
2. Separá hechos, inferencias, supuestos y preguntas abiertas.
3. Para hechos externos cambiantes o técnicos, consultá fuentes primarias/autoritativas; registra fecha y enlace. Para comportamiento del repo, inspeccioná código, tests, historial y docs fuente.
4. En discovery de producto identificá usuarios/actores, resultado, contexto, restricciones, alternativas y qué significa éxito.
5. Para dominio complejo, definí vocabulario, actores, entidades, eventos, invariantes y límites; no fuerces DDD si un modelo pequeño basta.
6. Resumí evidencia, incertidumbre restante, opciones y consecuencias/reversibilidad.
7. Volvé a SDD. RDD por sí mismo no autoriza construir producto, adoptar una API ni ejecutar acciones externas.

Si la incertidumbre no se puede resolver con una investigación acotada, presenta la decisión bloqueante al usuario. Evita planillas o dossiers persistentes salvo que la decisión deba sobrevivir a esta conversación y afectar trabajo futuro.

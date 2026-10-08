---
name: harness-mvp
description: Flujo de ingeniería con discovery, especificación, TDD adaptativo, revisión y verificación, sin gestor de tareas ni worktrees.
---

# Harness de ingeniería

El flujo completo está en [`docs/AGENT_WORKFLOW.md`](../../../docs/AGENT_WORKFLOW.md). Usálo de forma proporcional al riesgo: la disciplina debe reducir errores, no producir papeleo.

## Ciclo principal

`PEDIDO → EXPLORAR → RDD (si hace falta) → SDD → BDD/TDD → IMPLEMENTAR → CHECKS → REVIEW → VERIFY → CLOSE`

1. Preservá el pedido original y aclaralo en una frase sin cambiar restricciones.
2. Inspeccioná el estado Git, arquitectura, contratos, flujos, convenciones y checks relevantes.
3. Clasificá riesgo R0–R3 y modo de prueba. Identificá incógnitas que podrían cambiar el diseño.
4. Aplicá RDD solo si hay incertidumbre de dominio, producto, arquitectura o contrato externo. RDD reduce incertidumbre; no equivale a permiso para implementar.
5. Antes de editar, establecé el SDD mínimo: resultado, dentro/fuera de alcance, criterios observables y riesgos. Para R2/R3 agregá escenarios de error, rollback y límites de aprobación.
6. Traducí criterios importantes a escenarios BDD (`Dado/Cuando/Entonces`) y elegí el modo TDD según `.agents/skills/adaptive-tdd/SKILL.md`.
7. Implementá el menor cambio coherente; un solo escritor por conjunto de archivos. No afirmes evidencia RED si no ejecutaste la prueba y falló por la razón esperada.
8. Ejecutá checks deterministas pertinentes, revisá el diff y separá resultado verificado de inferencia.
9. Realizá review independiente cuando esté disponible y autorizada. Verificá el comportamiento pedido, que es distinto de revisar el código.
10. Cerrá con cambios, comandos/resultados, revisión/verify realmente hechos y limitaciones.

## Roles

Los contratos están en `.agents/roles/`. Explorer, planner, test-designer, reviewer, verifier y security-reviewer son roles de solo lectura; implementer es el único escritor. Un archivo de rol no crea una subagente: no delegues ni crees agentes salvo que el usuario o instrucciones aplicables lo pidan explícitamente y la herramienta lo permita. Si no hay revisor independiente, declaralo con claridad.

## Proporcionalidad

- **R0:** change pequeño y diff review; check dirigido si existe.
- **R1:** criterios claros, pruebas/checks pertinentes y review cuando se solicitó o el flujo lo ofrece.
- **R2:** SDD explícito, casos negativos/límite, pruebas pertinentes, reviewer/verifier y seguridad especializada según superficie.
- **R3:** análisis adversarial/seguridad y aprobación humana antes de despliegues, borrados u otros efectos irreversibles.

No crees por rutina IDs, registro de tareas, sprints, worktrees, planning dossiers o handoffs formales. Para una petición acotada, el SDD puede vivir en el plan de trabajo y la conversación; guardá documentación solo si debe persistir para futuras personas/cambios.

---
name: adaptive-tdd
description: Select a testing sequence that fits contract clarity, risk, legacy behavior, and technical uncertainty.
---

# TDD adaptativo

Elegí explícitamente un modo; TDD estricto es valioso cuando el comportamiento se puede expresar con un oráculo estable, pero no simules RED.

| Modo | Secuencia | Cuándo |
| --- | --- | --- |
| `tdd_required` | RED → GREEN → REFACTOR | Regresión/contrato claro con pruebas ejecutables; lógica o riesgo significativos. |
| `characterization_then_tdd` | Caracterización que pasa → RED → GREEN → REFACTOR | Código legado sin contrato fiable; primero congela el comportamiento relevante. |
| `spike_then_tdd` | Spike acotado → decisión/prototipo descartable → prueba RED → GREEN → REFACTOR | Se desconoce un contrato técnico o una capacidad que impide escribir un oráculo correcto. |
| `tdd_preferred` | Test-first si el oráculo es estable; excepción explicada | Cambio normal cuyo contrato es parcialmente visible. |
| `test_after_allowed` | Implementar → prueba/check focalizado | Cambio visual, integración manual difícil o contrato que no puede aislarse primero; define evidencia alternativa. |
| `not_applicable` | Revisión/check documental apropiado | Docs, texto, assets sin comportamiento, configuración declarativa simple. |

## RED → GREEN → REFACTOR

- **RED:** ejecuta la prueba nueva y comprueba que falla por el comportamiento esperado. Una falla de importación, entorno o sintaxis no prueba el defecto.
- **GREEN:** implementa el cambio mínimo que satisface el caso. Evita refactorizar antes de fijar el comportamiento.
- **REFACTOR:** mejora diseño sin cambiar el contrato y vuelve a correr los checks afectados.

Considerá casos felices, valores inválidos, límites, fallo parcial, reintentos, duplicados, orden/concurrencia y regresiones cuando correspondan. No agregues pruebas por cuota; cada prueba debe distinguir al menos un comportamiento relevante. Si no pudiste correr RED, reportalo con honestidad.

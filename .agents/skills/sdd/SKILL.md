---
name: sdd
description: Specify the smallest observable contract that must hold before implementation begins.
---

# SDD — Spec-Driven Development

Antes de cambios no triviales, acordá un contrato pequeño, en el plan o conversación. Para R0 puede bastar una frase.

Incluí:

- **Resultado:** qué podrá hacer el usuario o qué propiedad cambiará.
- **Alcance:** qué cambia y qué queda expresamente fuera.
- **Criterios de aceptación:** observables, verificables y sin contradicción.
- **Escenarios:** principal, negativos y límites relevantes (`Dado/Cuando/Entonces` si aclara comportamiento).
- **Contratos e invariantes:** API/datos/UI/compatibilidad que deben preservarse.
- **Riesgo y reversión:** superficies afectadas, fallos parciales, migración/rollback y decisiones que requieren aprobación.
- **Verificación:** comandos/checks o ejercicio de UI previsto y evidencia esperada.

No inventes requerimientos para completar una plantilla. Si falta una decisión material, preguntá; si el impacto es bajo, explicita la suposición y avanza. Cambios en el criterio durante la implementación requieren actualizar el contrato y volver a revisar pruebas/alcance.

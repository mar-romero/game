---
name: test-strategy
description: Derive useful behavioral oracles and BDD scenarios from acceptance criteria.
---

# Test strategy y BDD

Para cada criterio de aceptación preguntá: qué observaría una persona/otro sistema si se cumple y qué caso cercano debería fallar.

1. Escribí escenarios en lenguaje de producto usando `Dado / Cuando / Entonces` cuando haga más claro el contrato.
2. Identificá el límite correcto: unidad para reglas puras; integración para adaptadores/contratos; UI/API para experiencia observable.
3. Incluí escenarios negativos, límites y fallos parciales según el riesgo. Evitá validar implementación interna si importa el resultado externo.
4. Mantené datos deterministas, aislá estado compartido y evitá depender de red/tiempo real cuando no sea el contrato bajo prueba.
5. Correlacioná cada prueba/check con un criterio. Si un criterio solo permite revisión visual/manual, describe los pasos y limitaciones.

BDD es una forma de expresar escenarios y alinear producto, pruebas e implementación; no exige adoptar un framework BDD.

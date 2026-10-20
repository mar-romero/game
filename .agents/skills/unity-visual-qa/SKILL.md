---
name: unity-visual-qa
description: Diagnosticar y verificar gráficos, UI y animaciones de Unity en Game view con evidencia de la resolución y ejecución activas. Usar con contexto Unity y una necesidad visual; no con guardado, auth o lógica sin cambios gráficos.
---

# Gráficos y verificación visual en Unity

## Aplicación y reparto

Para cambios visuales de Unity, fijar criterios visuales antes de implementar. Usar `test_after_allowed` cuando no haya un contrato que exija otro modo: conservar `spike_then_tdd`, `characterization_then_tdd` o `tdd_required` si el pedido también incluye incertidumbre técnica, legado, lógica, persistencia o riesgo R2/R3. El QA visual se suma a esas pruebas. `unity_graphics_specialist` aporta diagnóstico de solo lectura; `implementer` es el único escritor, `reviewer` revisa código independientemente y `verifier` observa el resultado después de REVIEW. No crear otro rol de QA. Para preguntas o investigación de solo lectura, aplicar únicamente diagnóstico: no exigir build, implementación ni Play.

## Contrato y diagnóstico

1. Confirmar el proyecto, escena/pantalla y arte que realmente están activos; leer sus entry points y jerarquía de Canvas/cámaras. Registrar resolución/aspecto destino y escala del Game view. Una captura del usuario es evidencia del resultado que obtuvo; no atribuirlo a un build viejo sin comprobarlo.
2. Definir qué cambio debe verse a tamaño de juego y qué comportamiento debe mantenerse. Cuando afecte cintas/cajas, incluir alineación sobre la superficie, dirección/velocidad coordinadas, curvas, turnos en uniones y oclusión por puentes/compuertas. No imponer estos criterios a tareas visuales ajenas.
3. Rastrear sprites/materiales, máscaras, capas, coordenadas y reloj de animación. Separar el arte fijo del efecto dinámico. Comparar con el antes cuando haya evidencia disponible y conservar el estilo acordado.

## Evidencia después del cambio

- Compilar después de la última edición relevante y registrar proyecto, comando/acción y resultado. Si la tarea cambia un build distribuido, comprobar ese artefacto; Play en el editor no demuestra el build distribuido.
- Abrir la escena/pantalla correcta en Game/Play con la resolución destino. Observar el efecto pedido y revisar consola/errores de compilación y ejecución. Leer logs no sustituye observar el resultado.
- Para movimiento, observar una secuencia o varias muestras con tiempo entre ellas que permitan comprobar dirección, velocidad y continuidad. Una imagen sola, un diff o una captura anterior al cambio no prueban animación. Revisar el paso por los puntos críticos del contrato durante la secuencia.
- Comprobar legibilidad, contraste e integración al tamaño de juego; usar zoom adicional para diagnosticar alineación y recortes. Registrar rendimiento/coste cuando el efecto agregue elementos, partículas o trabajo por frame, sin afirmar FPS medidos si no se midieron.
- Usar las herramientas de captura/control disponibles y autorizadas. No asumir que hay acceso al escritorio ni sustituir evidencia real con un mockup. Si Unity, la escena o la captura no están disponibles, continuar los checks posibles y reportar la verificación visual pendiente y el impedimento concreto.

## Cierre

Informar por separado: **implementado**, **compilado**, **revisado** y **verificado visualmente**. Marcar cada estado según evidencia real, con escena/resolución, observación y errores encontrados. No llamar terminado visualmente a un cambio cuyo Game view no se observó después de compilar. La skill no autoriza publicar ni modifica permisos de ejecución.

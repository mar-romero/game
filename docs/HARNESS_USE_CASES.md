# Casos de uso del flujo de trabajo

Este catálogo describe cómo debe actuar el harness de Factory Wars según el tipo de pedido. “Todos los casos” se interpreta como todas las familias y combinaciones relevantes; no existe una lista finita de frases que cubra cada redacción posible. El router clasifica señales del texto, pero el coordinador confirma la intención, el área real y el riesgo antes de actuar.

## Recorrido común

1. Preservar la petición y su contexto; determinar si pide respuesta, investigación, documentación, revisión o cambio.
2. Inspeccionar `git status`, cambios existentes, arquitectura, contratos y checks pertinentes antes de editar.
3. Seleccionar riesgo, especialistas, RDD (si una incertidumbre material puede cambiar el diseño), SDD y modo de prueba.
4. Acordar criterios observables. Para cambios no triviales, incluir alcance, límites, riesgos y cómo verificar.
5. Implementar con un único escritor por conjunto de archivos; ejecutar checks pertinentes y revisar el diff.
6. Hacer revisión independiente y verificación observable cuando corresponda. Cerrar declarando lo realizado, los resultados y lo pendiente.

Una etapa que no aplica se omite con una razón breve. El route es orientativo: no delega por sí mismo, no cambia permisos y no reemplaza la inspección humana del contexto.

## Casos por intención

| Caso | Ejemplo | Ruta esperada |
| --- | --- | --- |
| Pregunta o explicación | “¿Cómo funciona el ranking?” | Responder con evidencia del repo. R0, `not_applicable`; no implementar. |
| Lectura o diagnóstico | “¿Dónde se calcula la recompensa?” | Explorar archivos pertinentes y explicar hallazgos. Sin implementer; no cambiar código. |
| Investigación con incertidumbre | “¿Qué arquitectura conviene para las temporadas?” | RDD si la investigación puede cambiar una decisión; consultar fuentes/código pertinentes; presentar opciones e incertidumbres. No implementar sin pedido. |
| Documentación/formato | “Actualiza el README con el comando de arranque” | Cambio documental R0 o riesgo real detectado; `not_applicable`; validar diff/formato. Implementer solo si hay cambio solicitado. |
| Cambio normal | “Agrega una opción al menú” | R1 si es acotado. Explorer, SDD ligero, BDD/`tdd_preferred` (o excepción justificada), implementer, checks y review. |
| Bug o regresión | “El botón no abre la fábrica” | Elevar según impacto; reproducir/aislar, definir oráculo; `tdd_required` si hay contrato probado, caracterización si legado incierto; checks, review y verify. |
| Contrato técnico desconocido | “No sabemos cómo persiste esta versión; probá un prototipo” | RDD/spike acotado; no asumir que el prototipo es producción. Fijar contrato y luego TDD/implementación. |
| Legado sin contrato claro | “Refactoriza el sistema antiguo de misiones” | Caracterizar el comportamiento que debe conservarse; luego prueba y cambio incremental. |
| Revisión/auditoría sin cambios | “Revisa este diff por errores” | Review solo lectura; reportar hallazgos con archivos/evidencia. No arreglar salvo que el usuario lo pida. |
| Pedido mixto | “Ajusta HUD y corrige el guardado de sus preferencias” | Activar rutas UI y persistencia; preservar el riesgo mayor y el modo de prueba más estricto. Separar criterios visuales y datos. |

## Casos de dominio y especialistas

Los especialistas son entradas de solo lectura. Aportan invariantes y diagnóstico; no sustituyen al implementer.

| Área | Ejemplos | Perfil y skill cuando aplican |
| --- | --- | --- |
| Juego, Arena, progresión | Reglas, combate, bots, matchmaking, recompensas | `gameplay_specialist` + `gameplay-domain` |
| Interfaz web | HUD del navegador, HTML/CSS, canvas web, responsive, controles | `web_game_ui_specialist` + `browser-game-ui` |
| Gráficos Unity | Game/Play, Canvas/UGUI, escenas, sprites, materiales, luces, partículas, cintas/cajas | `unity_graphics_specialist` + `unity-visual-qa` |
| Persistencia/backend | Supabase, SQL, migraciones, auth, RLS, RPC, guardados/sync | `supabase_specialist` + `supabase-data` |
| Balance | Tuning, semillas, simulaciones, win rate | `balance_specialist` + `game-balance` |
| Seguridad | Auth, permisos, secretos, vulnerabilidades o R3 | `security_reviewer` + controles de seguridad del repo |

### Casos específicos de Unity y UI

| Caso | Resultado de routing esperado |
| --- | --- |
| Unity visual | Unity specialist y `unity-visual-qa`; los cambios agregan REVIEW y VERIFY visual. |
| Unity Canvas/HUD | Ruta Unity; no activar perfil web por las palabras Canvas/HUD solamente. |
| Unity sin cambio visual (guardado/auth/reglas) | No activar perfil Unity graphics. Mantener especialistas y riesgo de la materia real. |
| UI web | Mantener especialista/skill del navegador; no pedir Game/Play de Unity. |
| Pedido explícito mixto Unity + web | Activar ambos especialistas y sus criterios; no descartar una plataforma por la otra. |
| Consulta visual de Unity | Diagnóstico de solo lectura; no exigir implementar, compilar ni entrar en Play. |
| Animación Unity | Además del build, observar secuencia temporal a resolución destino; comprobar trayectoria, continuidad, oclusión y puntos de unión según el criterio. |
| No hay editor o captura | Completar checks accesibles y declarar “no verificado visualmente”, causa y criterio pendiente. No afirmar aceptación visual. |

## Casos por riesgo

| Riesgo | Situaciones típicas | Controles de cierre |
| --- | --- | --- |
| **R0** | Explicación, docs, formato o cambio declarativo simple | Sin delegación obligatoria; diff/check dirigido. |
| **R1** | Funcionalidad ordinaria, UI o refactor acotado | Criterios, checks propios del área y review independiente cuando el route/flujo lo indica. |
| **R2** | Auth, persistencia, concurrencia, economía, migraciones, datos compartidos o cambio del harness | SDD explícito; errores/límites; test-designer, implementer, reviewer y verifier; especialista de dominio si aplica. |
| **R3** | Seguridad crítica, secretos o efecto irreversible/material | Controles R2 + security reviewer y aprobación humana explícita antes del efecto externo. No ejecutar publicación, despliegue o borrado antes de esa aprobación. |

El nivel se eleva si la exploración descubre mayor impacto. Un pedido visual no rebaja un riesgo de persistencia, auth, economía o seguridad.

## Matriz de modo de prueba

| Modo | Usarlo cuando | Evidencia esperada |
| --- | --- | --- |
| `not_applicable` | Documentación, texto o configuración declarativa sin comportamiento | Diff y validación documental/formato pertinente. |
| `test_after_allowed` | UI/arte o entorno difícil de aislar, sin un modo más estricto aplicable | Check focalizado y evidencia manual/visual declarada. |
| `tdd_preferred` | Cambio normal con oráculo razonablemente estable | Test-first; si se omite, explicar por qué y ejecutar checks relevantes. |
| `tdd_required` | Regresión, bug o contrato claro de riesgo significativo | RED por la razón esperada → GREEN → REFACTOR. |
| `characterization_then_tdd` | Legado cuyo comportamiento relevante no está documentado | Caracterización que pasa → RED → GREEN → REFACTOR. |
| `spike_then_tdd` | Incógnita técnica que impide formular un oráculo | Spike acotado → decisión/contrato → prueba → implementación especificada. |

Los modos de prueba más estrictos prevalecen cuando un pedido visual también toca lógica, persistencia, código legado o riesgo R2/R3. QA visual se agrega al modo correspondiente.

## Casos de ejecución, límites y cierre

- **El route recomienda una skill/perfil:** leer su contrato antes de aplicarlo; pasar modelo/esfuerzo recomendados si se delega. Si el runtime no lo ofrece, heredar modelo principal e informar el fallback.
- **No hay herramienta de subagentes:** el principal sigue el contrato como checklist local y dice que no hubo revisión/delegación independiente.
- **No existe comando único de tests:** descubrir el check real del área; no inventar un comando ni evidencia.
- **No se pudo correr un check:** continuar lo independiente; indicar impedimento, alternativa probada y cobertura pendiente.
- **El diff incluye trabajo preexistente:** preservarlo; no atribuirlo a la tarea ni revertirlo sin instrucción.
- **La petición queda ambigua:** investigar lo que no depende de la decisión; si la alternativa cambia sustancialmente producto, seguridad o coste, pedir la aclaración concreta antes de esa decisión.
- **El usuario pide publicar/subir/mergear/borrar:** preparar primero un resultado revisable. Aplicar R3 y pedir aprobación humana antes del efecto irreversible cuando corresponde; una solicitud no autoriza credenciales o acciones fuera del alcance disponible.
- **Cierre:** separar implementado, checks, review, verify, publicación y limitaciones. No decir “verificado” si solo se leyó el diff o compiló.

## Ejemplos de escenarios observables

**Unity visual:** Dado un cambio de animación compilado, cuando el verifier abre la escena correcta en Game/Play a resolución objetivo y observa una secuencia, entonces puede confirmar movimiento y continuidad o registrar el criterio visual pendiente.

**Persistencia:** Dado un cambio de guardado, cuando se ejecutan los casos de éxito, datos inválidos y fallo/reintento pertinentes, entonces el estado persistido respeta el contrato y no se pierde ni duplica fuera de lo permitido.

**Pedido de solo lectura:** Dado que el usuario pregunta dónde se implementa algo, cuando el coordinador inspecciona el código, entonces responde con rutas/componentes y no invoca un escritor.

**R3:** Dado un cambio que publicaría o eliminaría datos, cuando el trabajo técnico está preparado y revisado, entonces no se realiza el efecto externo hasta obtener aprobación humana explícita.

## Uso rápido

Desde la raíz del repositorio se puede pedir una clasificación orientativa:

```powershell
python scripts/harness_orchestrator.py route "Mejorar las animaciones de las cintas en Unity"
```

Para el flujo completo ver [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md), la política de riesgo en [AGENTS.md](../AGENTS.md) y los perfiles de dominio en [GAME_SPECIALISTS.md](GAME_SPECIALISTS.md).

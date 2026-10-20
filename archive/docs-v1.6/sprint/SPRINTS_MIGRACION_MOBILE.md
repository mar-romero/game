# Plan de sprints: migración móvil

## Objetivo

Publicar Factory Wars para Android y iPhone con una base de código compartida con la web. La estrategia propuesta es **TypeScript + Capacitor**: TypeScript será el lenguaje de la aplicación y Capacitor permitirá empaquetar la experiencia web como aplicaciones nativas, con acceso gradual a funciones del dispositivo. No se propone mantener dos clientes independientes en Kotlin y Swift.

El juego actual está construido principalmente con HTML, CSS y JavaScript. Por eso, la primera prioridad es conservar y ordenar el producto que ya funciona, separar reglas de interfaz y hacer que Arena sea cómoda al tacto. No se reescribe el motor completo antes de medir compatibilidad y paridad.

## Criterios compartidos de salida

- Las reglas de juego y los datos de balance se comparten entre web, Android e iOS.
- Las acciones importantes se pueden completar en pantallas móviles estrechas y con controles táctiles.
- Una interrupción, suspensión o regreso desde segundo plano no duplica acciones ni rompe el estado guardado.
- Los saves existentes se conservan y se pueden migrar de forma versionada.
- Las operaciones competitivas y las recompensas siguen validadas por el servidor.
- Cada sprint entrega una versión ejecutable, evidencia de verificación y una lista de riesgos conocidos.

## Sprints propuestos

### Sprint 0 — Alcance y línea base

**Meta:** acordar el MVP móvil y registrar el estado inicial.

- Confirmar plataformas y dispositivos mínimos a soportar; definir orientación para Megafábrica y Arena.
- Probar las rutas actuales en navegadores móviles y registrar problemas de viewport, rendimiento, audio, red y controles.
- Elegir el flujo del MVP: inicio de sesión/continuación local, Megafábrica, Arena, resultados y sincronización.
- Definir métricas de aceptación, política de privacidad, permisos necesarios y responsables de cuentas de tienda.

**Entregable:** alcance y matriz de dispositivos con incidencias priorizadas. **Salida:** el equipo puede distinguir qué bloquea el MVP de lo que queda para después.

### Sprint 1 — Base TypeScript y límites de plataforma

**Meta:** preparar una transición segura desde JavaScript.

- Añadir TypeScript al proyecto con verificación gradual, sin convertir todos los archivos de una vez.
- Definir compilación, módulos compartidos y convenciones para imports, tipos y configuración.
- Mantener las entradas web actuales y establecer una composición de plataforma separada.
- Identificar dependencias del DOM, `window`, almacenamiento y red dentro de reglas y casos de uso.

**Entregable:** build repetible para web y primer módulo compartido tipado. **Salida:** una regla de dominio puede importarse sin cargar una página ni un SDK móvil.

### Sprint 2 — Dominio y persistencia compartidos

**Meta:** proteger progreso y paridad antes de construir pantallas móviles.

- Extraer reglas y transiciones prioritarias de Megafábrica y Arena a módulos independientes de la interfaz.
- Definir puertos para reloj, aleatoriedad, almacenamiento, identidad y API.
- Versionar el modelo guardado y crear migración desde los saves actuales de `localStorage`.
- Reutilizar la persistencia y sincronización existentes; documentar el comportamiento offline y los conflictos.

**Entregable:** casos de uso compartidos con persistencia versionada. **Salida:** una acción produce el mismo resultado en web y en el entorno móvil de desarrollo.

### Sprint 3 — Shell móvil con Capacitor

**Meta:** arrancar una aplicación instalable en ambas plataformas.

- Incorporar Capacitor al flujo de build web y configurar proyectos Android e iOS.
- Añadir icono, splash, nombre, identificadores de paquete, safe areas y navegación de retorno.
- Resolver ciclo de vida: pausa, reanudación, pérdida de conectividad y recuperación de sesión.
- Guardar credenciales con almacenamiento seguro del sistema solo si el flujo de autenticación lo requiere.
- Mantener permisos al mínimo; no integrar plugins nativos sin un caso de uso aprobado.

**Entregable:** app de desarrollo instalable en Android y simulador de iOS. **Salida:** abre, guarda, se suspende y se reanuda sin perder progreso.

### Sprint 4 — Megafábrica táctil

**Meta:** completar el flujo principal de progreso en móvil.

- Adaptar navegación, tarjetas, tablas y diálogos a pantallas pequeñas y safe areas.
- Asegurar objetivos táctiles, foco, contraste, escalado de texto y accesibilidad básica.
- Implementar estados de carga, error, offline y sincronización sin bloquear acciones locales seguras.
- Validar login/continuación, edificios, contratos, investigaciones y cambio de civilización.

**Entregable:** flujo de Megafábrica utilizable en teléfonos. **Salida:** tareas principales completadas sin zoom ni desplazamiento horizontal accidental.

### Sprint 5 — Arena y controles de combate

**Meta:** adaptar las partidas al formato móvil sin cambiar reglas ni balance.

- Revisar canvas/iframe, escalado, orientación, HUD, selección y legibilidad del mapa.
- Adaptar selección de unidades, construcción, órdenes, habilidades y confirmaciones para toque.
- Prevenir gestos del navegador que interfieran con controles durante el combate.
- Revisar rendimiento, consumo de batería, audio y comportamiento al recibir llamadas o cambiar de app.

**Entregable:** partida completa de Arena en Android y iOS. **Salida:** se puede iniciar, jugar y terminar una partida, y recuperar correctamente el resultado tras una interrupción.

### Sprint 6 — Calidad, seguridad y beta cerrada

**Meta:** reducir fallas en dispositivos reales y preparar distribución de prueba.

- Ejecutar recorridos de regresión en navegadores web, Android físico y iPhone físico.
- Verificar actualización, migración de saves, autenticación, sincronización, expiración de sesión y errores de red.
- Medir tiempos de inicio, fluidez, memoria, batería y tamaño de descarga en equipos representativos.
- Revisar privacidad, contenido, tratamiento de datos, permisos y requisitos vigentes de cada tienda.
- Distribuir una beta cerrada y priorizar fallas por impacto y frecuencia.

**Entregable:** beta con notas de versión y registro de incidencias. **Salida:** no hay defectos críticos de pérdida de progreso, seguridad o bloqueo del juego.

### Sprint 7 — Publicación y operación

**Meta:** lanzar con capacidad de observar y corregir.

- Preparar fichas, capturas, clasificación, enlaces de soporte y declaraciones requeridas por las tiendas.
- Configurar firma, canales de publicación, versionado y procedimiento de rollback o hotfix.
- Publicar gradualmente si las tiendas y el plan de lanzamiento lo permiten.
- Revisar métricas de crashes, rendimiento y sincronización; atender comentarios de jugadores.

**Entregable:** publicación aprobada y guía de operación. **Salida:** el equipo puede monitorear el lanzamiento y responder a incidentes.

## Dependencias y decisiones que pueden cambiar el plan

- La disponibilidad de una Mac y certificados de Apple afecta compilación, firma y publicación de iOS; debe resolverse antes del Sprint 3.
- Si el renderizado actual de Arena o una dependencia web no funciona en WebView, el Sprint 0 debe identificar una alternativa concreta antes de comprometer fechas.
- Notificaciones push, compras integradas, login con proveedores o juego offline amplio quedan fuera del MVP hasta definir su necesidad y sus requisitos de backend/tienda.
- La duración de los sprints y su capacidad se acuerdan con el equipo; este documento define orden y resultados, no fechas asumidas.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Dependencias o scripts globales incompatibles con el empaquetado | Auditar en Sprint 0 y migrar por módulo, conservando entradas web. |
| Controles de Arena incómodos en teléfono | Prototipar temprano y probar partidas reales con jugadores. |
| Pérdida o duplicación de progreso al suspender | Saves versionados, operaciones idempotentes y pruebas de ciclo de vida. |
| Diferencias entre simuladores y dispositivos | Incluir equipos físicos representativos antes de beta. |
| Coste de mantener puentes nativos | Usar APIs web cuando alcancen; introducir plugins Capacitor con necesidad y propietario definidos. |

## Relación con la tarea

La tarea ejecutable y sus criterios de aceptación están en [TAREA_MIGRACION_MOBILE.md](../tarea/TAREA_MIGRACION_MOBILE.md).

# Tarea: preparar la migración móvil de Factory Wars

**Tipo:** iniciativa técnica / épica
**Estado:** propuesta
**Plataformas objetivo:** Android e iOS, manteniendo web
**Plan de entrega:** [sprints de migración móvil](../sprint/SPRINTS_MIGRACION_MOBILE.md)

## Objetivo

Convertir Factory Wars en una aplicación instalable para Android y iPhone con una base de código compartida. Usar **TypeScript como lenguaje común** y **Capacitor como puente de empaquetado móvil**, manteniendo HTML/CSS para la interfaz y compartiendo progresivamente las reglas con la versión web.

TypeScript encaja con el código actual porque parte de la aplicación ya está escrita en JavaScript para navegador. Permite migrar de forma gradual sin obligar a rehacer el motor en otro lenguaje. Capacitor aprovecha la interfaz web existente y permite añadir integración nativa cuando exista una necesidad concreta. Kotlin y Swift seguirán limitados a puentes/plugins que realmente requieran código nativo.

## Alcance

- Auditar compatibilidad móvil de las pantallas, Arena, dependencias, autenticación y persistencia.
- Preparar compilación TypeScript gradual y límites claros entre dominio, aplicación, interfaz y plataforma.
- Compartir reglas y casos de uso entre web, Android e iOS.
- Crear proyectos móviles con Capacitor y resolver safe areas, orientación, ciclo de vida y navegación.
- Adaptar Megafábrica y Arena a interacción táctil y tamaños de pantalla móviles.
- Preservar datos locales existentes, sincronización con servidor y validación autoritativa de partidas/recompensas.
- Verificar funcionamiento en dispositivos Android e iOS reales antes de publicar.
- Preparar una beta cerrada y el proceso de publicación en tiendas.

## Fuera del alcance inicial

- Reescribir la aplicación completa o el motor del juego desde cero.
- Mantener implementaciones distintas de las reglas en Kotlin, Swift y JavaScript/TypeScript.
- Añadir compras integradas, notificaciones push o funciones offline amplias sin definición de producto.
- Cambiar balance, reglas competitivas o economía como parte de la migración de plataforma.

## Criterios de aceptación

1. Una sola implementación TypeScript de las reglas compartidas sirve a las builds web y móviles.
2. Las entradas web existentes siguen funcionando durante la migración.
3. Las builds de desarrollo arrancan en Android e iOS con identidad, icono y safe areas configuradas.
4. Un jugador puede entrar, usar Megafábrica, iniciar y completar una partida de Arena en ambos sistemas.
5. Interfaz y controles funcionan en pantallas objetivo sin zoom obligatorio, controles inaccesibles ni desplazamiento horizontal accidental.
6. Suspender y reanudar la app no duplica una acción ni pierde progreso confirmado.
7. Los saves de las versiones actuales se migran o se rechazan con recuperación clara; nunca se sobrescriben silenciosamente.
8. Los resultados y recompensas online mantienen la validación del servidor y no dependen de confiar en el cliente.
9. Se documentan dispositivos probados, problemas conocidos, procedimiento de build y pasos de publicación.

## Desglose de trabajo

- [ ] Registrar línea base de web y compatibilidad de dependencias.
- [ ] Acordar MVP, matriz de dispositivos, orientación y requisitos de tienda.
- [ ] Configurar TypeScript y compilación incremental.
- [ ] Extraer reglas de dominio y casos de uso prioritarios de Megafábrica y Arena.
- [ ] Definir puertos para reloj, aleatoriedad, almacenamiento, identidad y red.
- [ ] Versionar saves y crear migradores desde el formato actual.
- [ ] Integrar Capacitor y configurar Android/iOS.
- [ ] Adaptar Megafábrica a móvil.
- [ ] Adaptar Arena a táctil, orientación y rendimiento de dispositivos.
- [ ] Verificar continuidad de sesión, ciclo de vida, sincronización y errores offline.
- [ ] Ejecutar regresión en navegadores y dispositivos físicos; registrar resultados.
- [ ] Entregar beta cerrada y preparar checklist de publicación.

## Dependencias

- Acceso a un entorno macOS con Xcode para compilar y firmar iOS.
- Cuentas, certificados y acceso de publicación para las tiendas, antes del lanzamiento.
- Decisión sobre dispositivos mínimos, orientación y autenticación.
- Backend disponible para validar sesiones, partidas competitivas y recompensas.

## Riesgos y mitigaciones

- **Una dependencia web falla en WebView:** detectar en el primer sprint y sustituir o aislar antes de ampliar el alcance.
- **La interfaz de Arena no se adapta a pantallas pequeñas:** crear prototipos táctiles y medir con jugadores antes de cerrar el sprint de Arena.
- **Formato de guardado incompatible:** mantener migradores versionados y respaldo antes de actualizar datos.
- **Trabajo iOS bloqueado por certificados o Mac:** resolver acceso de build y firma en la fase de preparación.
- **Desvío hacia funciones nativas adicionales:** exigir que cada plugin tenga caso de uso, plataforma y responsable definidos.

## Definición de terminado

La iniciativa termina cuando los criterios de aceptación están verificados en Android e iOS, la beta ha completado su ciclo de revisión, el procedimiento de build/publicación está documentado y las incidencias que impiden jugar o conservar progreso están resueltas.

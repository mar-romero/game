# Sprint 1: base mobile-first y hub de Imperio

## Objetivo

Empezar la migración progresiva de la experiencia actual hacia las referencias visuales de `docs/image`, manteniendo Factory Wars como sitio web estático compatible con GitHub Pages y haciendo que la navegación principal funcione primero en teléfonos.

Este sprint cubre el shell de navegación y la pantalla inicial de Imperio. No migra todas las pantallas ni cambia reglas de juego. Por pedido del usuario, esta pasada incluye además la instalación de la misma web como PWA con orientación retrato; no incorpora Capacitor ni builds nativas, que siguen en [el plan de migración móvil](SPRINTS_MIGRACION_MOBILE.md).

## Alcance

- Conservar `public/index.html` y `public/arena.html`, sus URLs públicas, rutas relativas y el contrato del iframe de Arena.
- Reorganizar la navegación para pantallas estrechas y escritorio. En móvil, ofrecer accesos principales a Imperio, Megafábrica y Arena, y agrupar Rankings, Civilizaciones y Perfil en un menú secundario accesible. En escritorio se puede mantener la navegación horizontal actual.
- Aplicar la dirección visual de las referencias: paneles de ciencia ficción, jerarquía clara, recursos visibles, tarjetas de progreso y una acción principal destacada. Los mockups son inspiración de composición; no son especificación literal de contenido ni de controles.
- Adaptar el hub de Imperio como primera pantalla completa de esta migración, con resumen de progreso, atajo a Arena y acceso a las actividades persistentes existentes.
- Mantener intactos estado, balance, persistencia, identificadores DOM y lógica de los controladores salvo ajustes de presentación imprescindibles.

## Tareas

### 1. Mapa de pantallas y línea base

- Relacionar cada referencia con la vista actual: `imageMenuPVP.png` con Imperio, `imageMenu.png` con Megafábrica, `imageMenuArena.png` y `imagePVP.png` con Arena, y las restantes con Civilizaciones, Perfil y Rankings.
- Registrar los puntos de entrada, selectores usados por los controladores, navegación `data-view`, iframe y estilos actuales antes de cambiar el shell.
- Usar las siete imágenes de `docs/image` como material de referencia del sprint.

**Aceptación:** cada vista actual tiene una referencia identificada o queda anotada como pendiente; se conocen los elementos DOM que no se pueden renombrar o quitar sin actualizar sus controladores.

### 2. Esqueleto responsive de la aplicación

- Definir estructura de cabecera móvil, navegación principal, contenido y zona de navegación secundaria.
- En móvil, mantener visibles las acciones más frecuentes sin que la navegación tape contenido ni controles; considerar safe areas y teclado virtual.
- Conservar navegación horizontal en escritorio y diseñar estados activos, foco visible y etiquetas accesibles.
- Mantener el resumen de recursos legible y alcanzable en móvil sin forzar una fila de seis recursos que provoque desbordamiento.

**Aceptación:** se puede navegar a las seis vistas actuales en móvil y escritorio; no hay desplazamiento horizontal de la página en anchos de 360 px o superiores; controles y foco siguen accesibles con teclado y toque.

### 3. Sistema visual mínimo

- Definir variables CSS compartidas para colores, superficies, bordes, espaciado, radios, tipografía y estados de interacción.
- Aplicarlas al shell y a los componentes reutilizados por el hub, sin reescribir todavía todo `empire.css` o `arena.css`.
- Mantener estilos y assets servidos desde `public/` con rutas relativas compatibles con Pages bajo un prefijo de repositorio.

**Aceptación:** cabecera, navegación, tarjetas y botones del hub comparten tokens y estados consistentes; una carga desde la URL de GitHub Pages no depende de rutas absolutas desde `/` ni de un proceso de build nuevo.

### 4. Hub de Imperio

- Reorganizar la vista `home` siguiendo `imageMenuPVP.png`: estado del comandante/progreso, siguiente paso, acceso destacado a Arena y tarjetas compactas de contratos, investigaciones y recompensas/progreso disponible.
- Priorizar lectura vertical y acciones de toque en móvil; conservar el contenido y el orden retrato en escritorio, centrando el hub cuando sobre espacio horizontal.
- Reusar los datos y botones que ya alimentan la vista actual, sin inventar recompensas ni alterar progresión.

**Aceptación:** desde Imperio se entiende el progreso actual y se puede entrar a Arena y abrir Megafábrica; los datos visibles cambian con el estado existente y ningún botón nuevo simula una acción que el juego no soporta.

### 5. Revisión de navegación y regresión visual

- Recorrer las seis vistas desde la navegación y volver a Imperio.
- Verificar el arranque de Arena desde el shell y el funcionamiento del iframe en su URL actual.
- Revisar los estados inicial, con progreso local y con datos todavía cargando, en ventanas estrechas y amplias.

**Aceptación:** no se rompen selectores/eventos existentes, los enlaces conservan su comportamiento, y la página puede abrirse desde la raíz local y desde una ruta de Pages bajo subdirectorio.

## Criterios de salida del sprint

- El shell y el hub de Imperio están adaptados a móvil y escritorio.
- Las seis vistas existentes siguen accesibles y el flujo de Arena conserva sus contratos.
- La URL publicada se puede instalar como PWA cuando el navegador y el sistema lo permiten, con manifest/iconos servidos bajo el prefijo del repositorio.
- No se cambian reglas, balance, formato de guardado ni integración online.
- Se documentan los tamaños y estados revisados, junto con defectos visuales pendientes.
- La implementación sigue siendo estática y publicable desde `public/` en GitHub Pages.

## Escenarios de aceptación

- **Dado** un jugador que abre la URL de Pages desde un teléfono, **cuando** navega entre Imperio, Megafábrica y Arena, **entonces** puede alcanzar las acciones principales sin zoom ni desplazamiento horizontal.
- **Dado** un jugador que abre Rankings, Civilizaciones o Perfil desde el menú secundario, **cuando** vuelve a Imperio, **entonces** la navegación y el estado de la vista funcionan como antes.
- **Dado** un jugador con progreso local, **cuando** abre el nuevo hub, **entonces** los valores y acciones reflejan el estado real guardado y no modifican progreso por el mero renderizado.
- **Dado** el acceso a Arena desde Imperio, **cuando** se inicia la vista, **entonces** `arena.html` carga en el iframe existente y sus controles de partida continúan disponibles.
- **Dado** que un navegador móvil compatible abre la URL HTTPS de Pages, **cuando** el jugador elige instalar/agregar Factory Wars a inicio, **entonces** la web puede abrirse en modo independiente y mantiene la orientación retrato solicitada.

## Fuera de alcance

- Rediseño completo de Megafábrica, partida en Arena, Perfil, Rankings y Civilizaciones; quedan para sprints siguientes.
- Empaquetado nativo con Capacitor, TypeScript, SDKs nativos o publicación en tiendas. La PWA instalable de esta pasada no es una app nativa.
- Cambios de autenticación, economía, PvP, reglas, persistencia o sincronización.
- Publicar o desplegar el sitio como parte de este sprint.

## Secuencia sugerida después de este sprint

1. **Megafábrica:** recursos, edificios, contratos e investigaciones según `imageMenu.png`.
2. **Arena:** preparación y partida con controles táctiles, usando `imageMenuArena.png` e `imagePVP.png` como guía y preservando el motor actual.
3. **Vistas de cuenta y competencia:** Civilizaciones, Perfil y Rankings con `imageCivilizacion.png`, `imagePerfil.png` e `imageRanking.png`.
4. **Pulido transversal:** accesibilidad, rendimiento, estados sin conexión/carga y pruebas en navegadores móviles reales.

## Modo de verificación

Para la implementación, usar `test_after_allowed`: la aceptación depende en parte de interacción y composición visual del sitio. Hacer checks focalizados de navegación/DOM y verificación manual en anchos representativos (360, 390, 768 y 1366 px), registrando navegador, vistas y estados observados. La lectura de CSS por sí sola no cuenta como verificación visual.

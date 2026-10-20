# Archivo de la experiencia web V1

La experiencia web V1 de Megafábrica y Arena está preservada en `archive/v1/public/`, fuera del directorio que GitHub Pages publica. Incluye sus páginas, estilos, controladores, reglas de Arena y economía de Megafábrica. Sus rutas relativas se conservaron para que el archivo mantenga su estructura.

## Experiencia activa

- `public/index.html` ofrece solamente Megafábrica 3.1 y Arena V2.
- `public/factory-v2.html` y `public/arena-v2.html` son las pantallas activas.
- V2 es una práctica local en navegador: no ofrece Liga, cuentas, juego online ni premios de la V1.
- La Megafábrica 3.1 comparte sus investigaciones con Arena V2 en el mismo sitio y navegador.

## Guardados y datos

Los guardados V1 no se migran, editan ni eliminan con este cambio. V2 usa su propia clave de guardado local. Los datos remotos de Supabase tampoco se modifican. Si se vuelve a habilitar V1, sus guardados locales seguirán en el navegador donde se crearon.

## Compatibilidad del servidor

El runtime del servidor aún carga las reglas V1 desde esta carpeta archivada. En despliegues, `server/Dockerfile` copia el archivo y configura `V1_PUBLIC_DIR=/app/archive/v1/public`; en desarrollo se usa `archive/v1/public` desde la raíz del repositorio. `PUBLIC_DIR` sigue indicando qué archivos estáticos sirve el servidor. V2 no usa ese runtime online.

## Alcance

Este archivo contiene la aplicación web V1 y las dependencias de reglas que utiliza el runtime clásico del servidor. El proyecto Unity y sus cambios locales quedan intactos; no se los migró a V2 ni se los archivó. Este cambio tampoco publica, despliega, elimina datos o modifica Supabase.

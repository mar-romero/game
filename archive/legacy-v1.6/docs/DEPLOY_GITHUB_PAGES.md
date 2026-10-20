# Publicar en GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` publica el contenido de `public/` cada vez que se actualiza `main`. Tambien se puede iniciar manualmente desde la pestana **Actions**.

## Activar Pages una vez

En GitHub, abre el repositorio y entra en **Settings > Pages**. En **Build and deployment > Source**, selecciona **GitHub Actions**.

## Subir el proyecto

Desde la carpeta del proyecto, ejecuta:

```powershell
git add .
git commit -m "Publicar Factory Wars en GitHub Pages"
git push origin main
```

Cuando el workflow termine correctamente, GitHub muestra la URL publicada en **Settings > Pages** y en el entorno `github-pages` de la ejecucion del workflow. Cada push posterior a `main` vuelve a publicar el sitio.

## Modo local y Supabase

Con `public/config.js` sin URL ni publishable key de Supabase, el juego funciona en modo local y guarda progreso y partidas en el navegador. Para compartir cuentas, progresos o rankings entre dispositivos, hay que configurar Supabase por separado. No se debe poner una `service_role` en archivos publicos.

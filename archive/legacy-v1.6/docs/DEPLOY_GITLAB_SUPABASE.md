# Actualización v1.6 · Liga 10

Si ya tenías Supabase configurado con v1.5.x, ejecutá primero `supabase/migrations/v160_liga10.sql`. Si creás el proyecto desde cero, `supabase/schema.sql` ya incluye la tabla nueva.

# Publicar Factory Wars v1.5 en GitLab Pages + Supabase

## A. Probar en tu PC
En Windows, doble clic `START_WINDOWS.bat` o ejecutá `python serve.py`. Abrí `http://localhost:8000/`.

## B. Crear Supabase
1. Creá un proyecto en https://supabase.com/.
2. En Authentication habilitá **Anonymous Sign-Ins**.
3. Abrí SQL Editor.
4. Copiá y ejecutá TODO `supabase/schema.sql`.
5. En Project Settings/API copiá Project URL y la publishable key (o anon key si tu panel todavía la muestra con ese nombre).
6. Abrí `public/config.js` y pegá ambos valores. NUNCA pongas `service_role` en el navegador.

Ejemplo:
```js
window.FACTORY_WARS_CONFIG = {
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_...",
  ONLINE_ENABLED: true,
  SEASON: "BETA-IMPERIOS-01",
  VERSION: "1.5-imperios"
};
```

Volvé a ejecutar localmente. Deberías ver `ONLINE` arriba. Jugá una partida Arena y verificá en Supabase las tablas `matches`, `industrial_states` y `faction_contributions`.

## C. Subir a GitLab
1. Creá un proyecto vacío en https://gitlab.com/ (por ejemplo `factory-wars-beta`).
2. Abrí esta carpeta en VS Code y Terminal.
3. Ejecutá:
```powershell
git init
git branch -M main
git add .
git commit -m "Factory Wars v1.5 Imperios"
git remote add origin https://gitlab.com/TU_USUARIO/factory-wars-beta.git
git push -u origin main
```
4. GitLab leerá `.gitlab-ci.yml` y publicará `public/` mediante Pages.
5. Mirá **Build > Pipelines**. Esperá `passed`.
6. Mirá **Deploy > Pages** y copiá la URL activa.

La URL suele tener forma `https://TU_USUARIO.gitlab.io/factory-wars-beta/`, pero usá siempre la URL exacta que muestre GitLab.

## D. Pasárselo a un tester
Mandale solamente la URL de Pages. No necesita Python, VS Code, Git ni cuenta de Supabase. La primera visita crea un usuario anónimo y persiste la sesión en ese navegador.

## E. Limitación importante de Auth anónimo
Si el tester borra datos del navegador, cierra sesión o usa otro dispositivo, puede perder acceso a esa identidad anónima. Antes de premios reales, agregá vinculación de email/OAuth.

## F. Actualizar el juego
Modificá archivos y ejecutá:
```powershell
git add .
git commit -m "Actualizacion Factory Wars"
git push
```
El pipeline vuelve a publicar automáticamente.

## G. Antes de dinero real
No uses estos rankings para repartir dinero. La simulación y el estado industrial todavía se originan en JavaScript del cliente. La fase siguiente debe validar órdenes/replays/resultados en un backend autoritativo y vincular identidad recuperable.

# Entorno local del API para Unity

Esta guía levanta el API que Unity usa para autenticación, Megafábrica de cuenta, temporada y ranking. Arena V2 online todavía no está conectada. La antigua pantalla web `/online.html` y sus pasos multijugador se conservaron en [`archive/docs-v1.6/ONLINE_LOCAL_SETUP_V1.md`](../archive/docs-v1.6/ONLINE_LOCAL_SETUP_V1.md); no forman parte de las pantallas activas.

## Requisitos

- Docker Desktop con WSL 2 habilitado.
- Un proyecto Supabase para Auth con inicio de sesión por email habilitado.
- La URL del proyecto y su clave pública (publishable o anon). Nunca uses `service_role` en Unity.

## Configurar

Desde la raíz, crea el archivo local de entorno y completa los valores indicados:

```powershell
Copy-Item .env.online.example .env.online
notepad .env.online
```

Configura `SUPABASE_URL`, `SUPABASE_ANON_KEY` y una contraseña local segura para PostgreSQL. `.env.online` está excluido de Git. Para el cliente Unity, los campos `apiBaseUrl`, `supabaseUrl` y `supabasePublicKey` se configuran en `unity/FactoryWars.Unity6/Assets/Resources/FactoryWarsApiConfiguration.asset` desde Unity.

## Iniciar y detener

```powershell
docker compose --env-file .env.online -f docker-compose.online.yml up --build
```

El API queda en `http://localhost:8080`. Verifica que `http://localhost:8080/api/v1/health` responda `status: ok` y `database: true`. Configura la URL del API en Unity como `http://localhost:8080` para desarrollo local; las URLs remotas deben usar HTTPS.

Para detenerlo:

```powershell
docker compose --env-file .env.online -f docker-compose.online.yml down
```

El volumen PostgreSQL se conserva al bajar los contenedores. No agregues `-v` si quieres conservar esos datos.

## Alcance actual

El API conserva compatibilidad con el runtime online V1 y ofrece endpoints de cuenta, Megafábrica y temporada/ranking. Arena web V2 es una práctica local contra bot; Arena Unity tiene su propio combate local. Ninguno de los dos está conectado al matchmaking o al resultado autoritativo V2 del servidor.

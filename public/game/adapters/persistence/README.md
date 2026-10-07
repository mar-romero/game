# Adaptadores de persistencia

Destino para saves locales, importación/exportación y sincronización remota. `arena-online.js` sincroniza Arena; todavía usa APIs del navegador y Supabase directamente, por lo que es un adaptador transitorio. El guardado del Imperio sigue dentro de `empire-controller.js` y debe migrarse aquí. Los formatos externos deben convertirse a modelos validados y versionados en este borde.

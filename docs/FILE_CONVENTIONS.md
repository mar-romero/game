# Convenciones para crear archivos

Estas reglas mantienen el árbol comprensible mientras la implementación actual migra. Los nombres describen responsabilidad y comportamiento, no versión ni persona autora.

## Elegir carpeta

| Tipo de cambio | Carpeta |
| --- | --- |
| Regla pura de partida, estado, cálculo o balance | `public/game/domain/` |
| Flujo de jugador que coordina varias reglas | `public/game/application/` |
| Contrato requerido por la aplicación (storage, reloj, identidad) | `public/game/ports/` |
| Código que usa DOM, `window`, `localStorage`, Three.js o eventos web | `public/game/adapters/web/` |
| Guardado, nube o sincronización | `public/game/adapters/persistence/` |
| Integración con SDK móvil, Steam o sistema operativo | `public/game/adapters/platform/` |
| HTML, CSS, input y rendering | `public/game/presentation/` |
| Composition root y configuración de cada build | `public/game/platforms/<web|mobile|desktop|server>/` |
| Código técnico común que no es regla ni plataforma | `public/game/shared/` |
| Pruebas y fixtures | `tests/<unit|integration|fixtures>/` |

Hasta introducir un bundler, `public/game/` es código servido directamente. No muevas scripts a una carpeta fuera de `public/` si `serve.py` o Pages no pueden servirlos. Los HTML públicos `index.html` y `arena.html` conservan las URLs para navegación, Pages e interacción con el simulador.

## Nombres y límites

- Usar un archivo por responsabilidad: `match-economy`, `league-scheduler`, `local-save-adapter`, `arena-screen`.
- No usar `helpers.js`, `misc.js`, `common.js` o `utils.js` para lógica de juego sin un área explícita.
- Dominio y aplicación no leen ni escriben el DOM, storage, red o SDKs.
- Los adaptadores traducen formatos externos a modelos de aplicación/dominio; no definen reglas de combate.
- Presentation envía comandos y representa estado; no decide costos ni legalidad.
- Un cambio de regla debe modificar la implementación activa, no agregar otra capa de monkey patch.
- Si el código toca solo una plataforma, déjalo en su adapter aunque el nombre de la carpeta sea más largo.

## Plantillas de referencia para módulos futuros

Dominio, como módulo puro:

```ts
export type MatchId = string;

export interface MatchState {
  readonly id: MatchId;
  readonly tick: number;
}

export function canPerformAction(state: MatchState): boolean {
  return state.tick >= 0;
}
```

Puerto, propiedad de la aplicación:

```ts
export interface MatchRepository {
  load(id: string): Promise<unknown | null>;
  save(id: string, state: unknown): Promise<void>;
}
```

Caso de uso, con dependencias inyectadas:

```ts
export function createAdvanceMatch(repository: MatchRepository) {
  return async (matchId: string): Promise<void> => {
    const saved = await repository.load(matchId);
    if (!saved) throw new Error(`Match not found: ${matchId}`);
    // Decode, run domain transition, and persist through the port.
  };
}
```

Los tipos de ejemplo son contratos ilustrativos: reemplazarlos por modelos validados y versionados antes de usarlos en producción. El runtime clásico actual usa un namespace global temporal; los módulos nuevos deben usar imports/exports explícitos cuando se active el build de módulos.

## Checklist para cada archivo nuevo

1. ¿El nombre explica qué hace y qué parte del juego posee?
2. ¿Está en la capa correcta según los límites de arriba?
3. ¿Importa solo desde su propia capa o desde capas más internas?
4. ¿Recibe tiempo, RNG y persistencia en vez de consultar globals?
5. ¿Está enlazado desde un composition root y aparece en la guía de arquitectura si es un punto de entrada?
6. ¿Tiene cobertura automatizada apropiada antes de reemplazar reglas activas?

# Cómo se desarrolla Factory Wars

Este mapa muestra el recorrido del jugador y cómo se conectan las partes activas del código. La vista de red es una metáfora para explicar las dependencias y los ciclos de progreso; el juego no usa una red neuronal para decidir las reglas.

## Recorrido de una sesión

```mermaid
flowchart TD
    A[Jugador abre el juego] --> B[public/index.html<br/>Megafábrica]
    B --> C[ empire-controller.js<br/>carga estado y muestra recursos ]
    C --> D{¿Qué quiere hacer?}
    D -->|Construir| E[Validar recursos y costo]
    E -->|Puede pagar| F[Subir nivel de edificio]
    E -->|No puede pagar| C
    F --> G[EmpireEconomy calcula producción]
    G --> C
    D -->|Investigar| H[EmpireCatalog valida investigación]
    H --> I[EmpireProgression calcula costo y progreso]
    I -->|Puede pagar y está habilitada| J[Guardar investigación]
    I -->|Falta recurso o requisito| C
    J --> K[Desbloqueo persistente disponible]
    K --> C
    D -->|Contrato| L[EmpireProgression calcula faltantes y recompensa]
    L -->|Tiene suministros| M[Entregar recursos y recibir recompensa]
    L -->|Faltan suministros| C
    M --> C
    D -->|Jugar Arena| N[arena.html dentro del iframe]
    N --> O[Configuración + RNG + Match]
    O --> P[Runtime web procesa input y dibuja]
    P --> Q{¿La partida terminó?}
    Q -->|No| P
    Q -->|Sí| R[Calcular resultado y recompensa]
    R --> S[Persistencia local / sincronización online]
    S --> T[Actualizar recursos, estadísticas y Liga]
    T --> C
    D -->|Prestigio| U[EmpireProgression calcula avance]
    U -->|Requisitos completos| V[Reiniciar ciclo y conservar legados]
    U -->|Aún no| C
    V --> C
```

## Red de dependencias

Las flechas muestran qué componente aporta datos o decisiones al siguiente. La realimentación Arena → Megafábrica representa las recompensas que permiten nuevas mejoras y partidas.

```mermaid
flowchart LR
    subgraph Presentación
      WEB[Web / HTML]
      UI[Controladores y runtime]
      CSS[Estilos]
      WEB --> UI
      CSS --> WEB
    end

    subgraph Aplicación y dominio
      FLOW[Flujos del jugador<br/>a extraer a application]
      EC[Empire Catalog<br/>datos y requisitos]
      EE[Empire Economy<br/>producción]
      EP[Empire Progression<br/>costos y progreso]
      AC[Arena Config + RNG]
      AM[Match Engine<br/>estado y reglas base]
      IM[Industrial Modules]
      EC --> EP
      EC --> EE
      AC --> AM
      IM --> AM
      FLOW --> EC
      FLOW --> EE
      FLOW --> EP
      FLOW --> AM
    end

    subgraph Adaptadores
      LOCAL[Estado local]
      ONLINE[Supabase / Arena Online]
      PLATFORM[Adaptadores móviles y desktop<br/>futuros]
    end

    UI --> FLOW
    UI --> AM
    UI --> LOCAL
    UI --> ONLINE
    LOCAL --> UI
    ONLINE --> UI
    AM --> UI
    AM --> LOCAL
    AM --> ONLINE
    PLATFORM -. misma aplicación futura .-> FLOW
    PLATFORM -. mismos modelos .-> AM
    AM -. resultado y recompensa .-> EE
```

## Decisiones principales del jugador

| Decisión | Condición | Efecto |
| --- | --- | --- |
| Construir edificio | Recursos suficientes | Aumenta capacidad y producción persistente. |
| Investigar | Intel, requisitos y cupo disponibles | Desbloquea tecnologías para Imperio o Arena. |
| Completar contrato | Reunir los recursos solicitados | Convierte suministros en créditos, intel y progreso. |
| Entrar en Arena | Elegir una partida y civilización | Inicia combate contra bots u otros jugadores según el modo. |
| Elegir acción de combate | Recursos y reglas de partida lo permiten | Cambia economía, defensa, ataque o control del nodo. |
| Subir de prestigio | Completar las metas del ciclo | Reinicia parte del progreso y conserva beneficios de legado. |

## Cómo leerlo para desarrollar

1. Para cambiar una regla persistente, empezar por `public/game/domain/empire/`.
2. Para cambiar una regla de combate base, empezar por `public/game/domain/arena/match-engine.js`.
3. Para cambiar interacción o presentación web, revisar `public/game/adapters/web/` y `public/game/presentation/`.
4. Para cambiar guardado o sincronización, revisar `public/game/adapters/persistence/` y `supabase/`.
5. Antes de añadir una plataforma, conectar su adaptador a las reglas compartidas; no duplicar el motor.

Algunas reglas de Arena y flujos de Imperio todavía viven en controladores/extensiones históricos. La arquitectura objetivo y ese trabajo pendiente están descritos en [ARCHITECTURE.md](ARCHITECTURE.md) y [MIGRATION_PLAN.md](MIGRATION_PLAN.md).

Para ver el ida y vuelta detallado entre Megafábrica, PvP y civilizaciones, abrir [FACTORY_PVP_CIVILIZATIONS.md](FACTORY_PVP_CIVILIZATIONS.md).

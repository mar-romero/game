# Megafábrica V3.1

La pantalla `public/factory-v2.html` conserva su URL e integra la progresión industrial V3.1. Arena v2 consume el mismo guardado local y conserva su catálogo y sus estadísticas de combate.

## Ciclo industrial

El estado inicial contiene 350 Créditos, 100 Energía, 100 Acero y 20 Intel, con los cuatro productores en nivel 1. Cada ciclo nuevo permite elegir una ruta una sola vez:

| Ruta | Mejoras | Contratos | Proyecto | Efecto durante el ciclo |
| --- | ---: | ---: | --- | --- |
| Industrial | 4 | 1 | Cualquiera | Sin bonus adicional |
| Logística | 1 | 4 | Cualquiera | Contratos −20% de duración y +15% de recompensa |
| Científica | 2 | 2 | Centro científico | +30% Intel |
| Prioritaria | 2 | 1, incluyendo uno especial | Cualquiera | +25% Acero y +15% Energía |

Los modos equilibrado, científico, pesado y comercial modifican las prioridades de producción; cambiar de modo exige 60 segundos entre cambios. Los proyectos activan el 20%, 50% y 100% de su bonus al alcanzar respectivamente el 25%, 60% y 100% de materiales totales. Cada recurso debe entregarse completamente para terminar el proyecto.

Hay cinco contratos: urgente, industrial, científico, mayorista y experimental. Solo uno puede estar activo. Completar tres tipos distintos paga una sola vez por ciclo 100 Créditos y 10 Intel, escalados por la eficiencia industrial. Los tipos repetidos no adelantan la serie.

## Progresión y límites

Con `p` prestigios completados, los costos industriales se multiplican por `1.2 ** p` y se redondean hacia arriba. Producción y recompensas usan `1.2 ** p * (1 + 0.35 * (1 - exp(-p / 12)))`. La ventaja relativa frente a los costos se aproxima al 35%; no se agrega un 35% por ciclo.

Los contratos nuevos duran `max(30, ceil(duraciónBase * factorRuta / (1 + 0.045 * p)))` segundos; logística usa `factorRuta = 0.8`. Un contrato ya iniciado conserva su fecha de terminación.

Cada prestigio desbloquea una investigación nueva hasta completar las 28 opciones de Arena (6 cohetes, 6 defensas, 7 sabotajes y 9 bonus). Después se puede prestigiar industrialmente sin nueva investigación. El límite es 100 prestigios: la UI lo explica y permite seguir produciendo y usando la fábrica. Los edificios conservan el máximo de nivel 50; la producción por ausencia conserva el máximo de 4 horas.

## Migración y guardado

La clave compartida sigue siendo `factory-wars.factory-v2.local.v1`; el esquema nuevo es `schemaVersion: 2`. Arena importa la misma clave, `decodeSave` y `exportUnlocks`.

Un guardado V2 de esquema 1 se valida antes de migrarse. La conversión conserva fecha, recursos, niveles, investigaciones, contrato en curso y todas las cantidades del proyecto, incluyendo fracciones. El ciclo activo recibe `route: legacy` y mantiene los costos, producción, duración y recompensas originales de V2, con dos mejoras, dos contratos y un proyecto como objetivos. Sus nuevos modos, series y contratos esperan al próximo prestigio. Después comienza un ciclo con las reglas V3.1. Un contrato de esquema 1 solo puede tener uno de los tres IDs originales.

Antes de escribir el esquema 2, el controlador respalda el JSON original exacto en `factory-wars.factory-v2.local.v1.backup-v1`. Si esa clave contiene otro respaldo, usa un destino con la fecha de guardado y, si hace falta, un sufijo numérico; conserva todos los respaldos previos. Si falla el respaldo o la escritura, pausa la pantalla. No sobrescribe guardados corruptos o futuros.

Se mantiene la pausa ante cambios de otra pestaña y la comparación del guardado antes de escribir. Esta protección no constituye una transacción de `localStorage`; no resuelve todas las escrituras simultáneas.

## Checks reproducibles

Desde la raíz del repositorio, con Node que admita módulos ES sin configuración adicional:

```bash
node tests/factory-v3.test.mjs
node tests/measure-factory-v31.mjs resultados-v31 100
python -m http.server 8000 --directory public
```

Abrir `http://localhost:8000/factory-v2.html`. La suite contiene escenarios de migración exacta a prestigio mayor que cero, respaldos previos, modos, bonus parciales, series con premio exacto y único, límites, export a Arena y 100 ciclos consecutivos pagados mediante comandos reales. El simulador acepta de 1 a 100 ciclos (28 por defecto), exporta JSON/CSV y falla si alguna política no puede completar los ciclos solicitados.

Las simulaciones usan políticas deterministas y tiempo acelerado; no inyectan recursos para completar sus ciclos. No predicen tiempos humanos ni prueban experiencia visual, retención o diversión. La suite tiene también pruebas aisladas con estados preparados para comprobar límites y errores. Las partidas de Arena y la inspección visual se deben reportar por separado cuando se ejecuten.

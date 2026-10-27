# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este
> repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `./init.sh` y verifica que termina sin errores. Si falla, **para**
   y resuelve el entorno antes de tocar código.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
3. **No escanees `feature_list.json`** al iniciar buscando tareas: no es un
   backlog. El trabajo llega **por un pedido del humano**; toca
   `feature_list.json` solo cuando creás o actualizás una tarea. El trabajo se
   organiza en **tareas chicas** (`tareas[]`), sin historias.

## 2. Mapa del repositorio

| Archivo / carpeta            | Qué contiene                                                                          | Cuándo leerlo |
|------------------------------|---------------------------------------------------------------------------------------|---------------|
| `feature_list.json`          | Tareas que se están trabajando (`tareas[]`), con estado (`pending` / `in_progress` / `done` / `blocked`); las `done` quedan como registro                             | Al crear o actualizar una tarea (no al iniciar) |
| `progress/current.md`        | Estado de la sesión actual                                                            | Siempre, al empezar |
| `progress/history.md`        | Bitácora append-only de sesiones anteriores                                           | Si necesitas contexto histórico |
| `docs/arquitectura.md`       | Qué significa "hacer un buen trabajo" en este proyecto                                | Antes de implementar |
| `docs/estructura.md`         | Capas backend, contrato HTTP ↔ servicios y reglas de dependencia                     | Antes de implementar |
| `docs/convenciones.md`       | Reglas de estilo, nombres, errores y logs                                             | Antes de escribir código |
| `docs/http.md`               | Convención de rutas, métodos, status, JSON y errores                                  | Antes de crear o cambiar un endpoint |
| `docs/verificacion.md`       | Cómo verificar que tu trabajo funciona (lint + smoke)                                 | Antes de declarar una tarea como `done` |
| `CHECKPOINTS.md`             | Criterios objetivos de "estado final correcto"                                        | Para auto-evaluarte |
| `.opencode/agents/`          | Definiciones de subagentes (`leader`, `implementer`, `reviewer`)                      | Si orquestas trabajo |
| `.opencode/skills/`          | Skills del proyecto; `nomenclatura-es/` fija la convención de nombres en español      | Al nombrar o revisar código |
| `package.json`               | Scripts (`dev`, `start`, `lint`, `smoke`) y dependencias                              | Para ejecutar/verificar |
| `scripts/smoke.js`           | Smoke ejecutable: verifica los endpoints que agreguen las tareas; en la plantilla vacía no comprueba nada (se extiende en cada tarea con endpoints) | Antes de cerrar una tarea con endpoints |
| `src/`                       | Carpetas por capas, **vacías hasta que las cree una tarea**: `domain/` puro, `repositories/`, `services/`, `controllers/`, `routes/`, `middlewares/` | Antes de implementar |

## 3. Reglas duras (no negociables)

- **Tareas chicas.** Cada tarea es un cambio observable y verificable. Si un
  pedido es grande, el leader lo parte en varias tareas antes de empezar.
- **Una sola tarea en `in_progress` a la vez.** El leader va de a una.
- **No declares una tarea `done` sin `./init.sh` verde.** Ejecuta `./init.sh`
  (lint + smoke); si la tarea agrega o cambia endpoints, extiende
  `scripts/smoke.js`. No hay frameworks de tests. El reviewer tiene que aprobar.
- **El implementer y el reviewer no documentan.** No escriben informes ni
  archivos en `progress/`; devuelven su resultado (corto) **por chat**. El
  leader es el único que escribe en `progress/current.md`.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Deja el repositorio limpio** antes de cerrar la sesión (ver §5).
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.

## 4. Flujo de trabajo (tareas chicas)

```text
Por cada pedido (el humano describe; el leader redacta):
  pending → in_progress → [implementer → reviewer] → done
```

1. El humano describe la idea **en bruto** por chat («agregá X»). El leader
   **pregunta lo que falte** (alcance, bordes, errores), **redacta** la
   o las tareas chicas (`title`, `description`, `acceptance[]`) en
   `feature_list.json`; el humano solo describe y valida.
2. Si un pedido es grande, el leader lo parte antes de arrancar (§3).
3. La tarea va `pending → in_progress`; el `implementer` la hace desde su
   `description`/`acceptance`; el `reviewer` la aprueba o pide cambios;
   `done`.
4. El código lo escribe el `implementer` y lo revisa el `reviewer` (**ninguno
   documenta: reportan por chat**); el leader solo coordina y marca `done`.
   Cuando termina, espera el próximo pedido del humano.

## 5. Cierre de sesión (lifecycle)

1. Ejecuta `./init.sh` — todo verde.
2. Marca la tarea acabada como `status: "done"` en `feature_list.json`.
3. Redacta un **resumen corto** para `history.md` (máx 6 bullets): fecha, objetivo, tareas tocadas, archivos clave, acción, cierre. Usa formato `## YYYY-MM-DD — <ses-id o corto> — <objetivo corto>`.
4. Añade ese resumen al final de `progress/history.md` (append-only). **No copies** secciones "Exploración", "Plan", "Pasos", logs, tool calls ni conversación con el humano.
5. Vacía `progress/current.md` dejando solo la plantilla.
6. No dejes archivos temporales, ni `console.log` de debug, ni TODOs sin contexto.

## 6. Si te bloqueas

- Relee la sección relevante de `docs/`.
- Si la herramienta no hace lo que esperas, **no inventes un workaround**:
  documenta el bloqueo en `progress/current.md` y para la sesión.

# Flujo completo del arnés (por tareas)

> Versión ampliada con el contexto que lee cada subagente:
> [`harness-flujo-completo.md`](./harness-flujo-completo.md).

```mermaid
flowchart TD
    Start["🚀 Inicio de sesión<br/>leader lee AGENTS.md"] --> Init["./init.sh<br/>entorno + archivos base + lint + smoke"]

    Init -->|"FAIL"| Block["PARAR: resolver entorno<br/>(documentar en current.md)"]
    Init -->|"OK"| ReadState["Leer progress/current.md + docs/<br/>(NO se escanea feature_list)"]

    ReadState --> Espera["🗣️ esperar un pedido del humano"]

    %% ── REDACCIÓN ASISTIDA ──
    Espera --> Redacta["🧩 leader (redacción asistida)<br/>explora · pregunta con question · redacta<br/>title + description + acceptance"]
    Redacta --> Anota["leader anota la tarea<br/>tarea → in_progress"]

    %% ── FASE CÓDIGO ──
    Anota --> InProgress["tarea → in_progress<br/>leader lanza implementer"]
    InProgress --> Impl["⚙️ implementer<br/>código backend<br/>sin documentar: reporta por chat"]
    Impl --> Rev["🔍 reviewer (read-only)<br/>veredicto por chat"]
    Rev --> RevCheck{"¿acceptance ↔ evidencia?<br/>¿init.sh verde? ¿docs/http? ¿smoke?"}

    RevCheck -->|CHANGES_REQUESTED| Impl
    RevCheck -->|APPROVED| Done["tarea → done<br/>(se queda en feature_list.json)"]
    Done --> Espera

    %% ── BLOQUEOS ──
    Impl -.->|"no puede cumplir acceptance"| Blocked["tarea → blocked<br/>(razón por chat)"]

    %% ── CIERRE ──
    Espera -->|"fin de sesión"| Close["Cierre de sesión (§5 AGENTS.md)<br/>1. init.sh verde<br/>2. current.md → history.md (append)<br/>3. current.md vaciado a plantilla"]
    Close --> End["⏹ Sesión terminada"]

    Block -.->|resuelto| Init

    %% ── Colores ──
    classDef human fill:#f9e2af,stroke:#f38ba8,color:#111
    classDef agent fill:#89b4fa,stroke:#1e66f5,color:#111
    classDef disk fill:#a6e3a1,stroke:#40a02b,color:#111
    classDef gate fill:#fab387,stroke:#fe640b,color:#111
    classDef stop fill:#f38ba8,stroke:#d20f39,color:#111

    class Espera human
    class Impl,Rev,Redacta agent
    class Anota,Init,RevCheck gate
    class Block,Blocked,End stop
```

Claves:

- Al iniciar **no se escanea `feature_list.json`**: el trabajo llega **solo por
  un pedido del humano**. Solo se toca ese archivo al crear o actualizar una
  tarea.
- **Redacción asistida:** el humano describe la idea en bruto; el leader
  explora, pregunta (`question`) y redacta `title`/`description`/`acceptance`.
- Hay **un solo camino**: `pending → in_progress → [implementer → reviewer] →
  done`. Sin spec previo ni puerta de aprobación.
- `reviewer → implementer` es un ciclo de rechazo hasta cumplir el
  `acceptance` de la tarea.
- El `leader` anota, coordina y marca `done`, pero **no codifica**: delega en
  el `implementer`.
- **El implementer y el reviewer no documentan**: devuelven su resultado por
  chat. El leader es el único que escribe en `progress/current.md`.
- La tarea `done` **se queda** en `feature_list.json`; el leader no sale a
  buscar pendientes: vuelve a **esperar un pedido**.
- El `implementer` puede terminar **`blocked`** (se detiene y reporta la
  razón).
- `init.sh` aparece dos veces (entrada y salida) como guardián ejecutable
  (lint + smoke). Las tareas que agregan endpoints extienden
  `scripts/smoke.js`.

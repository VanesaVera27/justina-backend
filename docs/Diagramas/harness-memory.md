# Memoria del arnés: disco vs chat

```mermaid
flowchart LR
    subgraph Chat["Context window (efímero)"]
        A[Conversación del agente]
    end

    subgraph Disk["Disco (memoria persistente)"]
        FL["feature_list.json<br/>tareas que se trabajan<br/>pending → in_progress → done"]
        CU["progress/current.md<br/>sesión activa (tarea en curso)"]
        HI["progress/history.md<br/>append-only"]
    end

    A -->|"escribe al crear/actualizar tarea"| Disk
    Disk -->|"lee al iniciar: current.md (+ docs)"| A
    A -.->|"se reinicia / revienta"| X["❌ chat perdido"]
    X -.->|estado intacto| Disk
```

| Memoria | Archivo | Ciclo |
|---|---|---|
| Qué se está trabajando | `feature_list.json` (`tareas[].status`); las `done` quedan como registro | Se toca al crear/actualizar; **no se escanea al iniciar** |
| Sesión en curso | `progress/current.md` (tarea en curso) | Se vacía al cerrar |
| Historial | `progress/history.md` (append-only) | Nunca se borra |
| Estado verificable | `./init.sh` (lint + smoke) + `scripts/smoke.js` + control de versiones | Se regenera, no se memoriza |

El `implementer` y el `reviewer` **no escriben en `progress/`**: devuelven su
resultado por chat. Por eso no hay informes `impl_`/`review_`.

Ciclo: al empezar el agente lee `current.md` (+ `docs/`) y **no** escanea
`feature_list.json`; al cerrar, mueve el resumen de `current.md` al final de
`history.md` y lo vacía (§5). Por eso las sesiones son retomables aunque
revienta la ventana de contexto.

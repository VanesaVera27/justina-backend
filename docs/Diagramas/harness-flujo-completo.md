# Flujo completo del arnés + contexto que lee cada agente

Versión ampliada de [`harness-flow.md`](./harness-flow.md): mismo flujo, pero
mostrando **qué archivos lee cada agente para tomar contexto antes de actuar**
(y qué escribe).

```mermaid
flowchart TD
    Start(["🚀 Inicio de sesión"]) --> Init["./init.sh<br/>(lint + smoke)"]

    Init -->|"FAIL"| Block["⛔ PARAR<br/>resolver el entorno"]
    Init -->|"OK"| Arranque["🧭 leader · arranque<br/>—— lee ——<br/>AGENTS.md<br/>progress/current.md<br/>(NO escanea feature_list.json)"]

    Arranque --> Espera["🗣️ esperar un pedido del humano"]

    Espera --> Redacta["🧩 leader · redacción asistida<br/>—— lee ——<br/>los 5 docs de docs/<br/>arquitectura · estructura · convenciones<br/>http · verificacion<br/>código relevante (src/)<br/>feature_list.json"]

    Redacta --> Anota["🧩 leader anota la tarea<br/>→ in_progress"]

    Anota --> InProgress["🧩 leader: tarea → in_progress"]

    InProgress --> Impl["⚙️ implementer<br/>—— lee ——<br/>AGENTS.md<br/>docs/arquitectura.md<br/>docs/estructura.md<br/>docs/convenciones.md<br/>docs/http.md<br/>la tarea en feature_list.json<br/>código existente (src/)<br/>—— escribe ——<br/>código backend + scripts/smoke.js (no documenta)"]

    Impl --> Rev["🔍 reviewer (read-only)<br/>—— lee ——<br/>docs/arquitectura.md<br/>docs/estructura.md<br/>docs/convenciones.md<br/>docs/http.md<br/>CHECKPOINTS.md<br/>la tarea en feature_list.json<br/>el código (src/, scripts/smoke.js)<br/>—— ejecuta ——<br/>./init.sh"]

    Rev --> RevCheck{"¿acceptance ↔ evidencia?<br/>¿init.sh verde? ¿docs/http? ¿smoke?"}

    RevCheck -->|"CHANGES_REQUESTED"| Impl
    RevCheck -->|"APPROVED"| Done["🧩 leader: tarea → done<br/>(se queda en feature_list.json)"]
    Done --> Espera

    Impl -.->|"no puede cumplir acceptance"| Blocked["⛔ tarea → blocked<br/>(razón por chat)"]

    Espera -->|"fin de sesión"| Close["🧭 leader · cierre (§5)<br/>1. ./init.sh verde<br/>2. tarea → done<br/>3. resumen corto → history.md<br/>4. current.md vaciado"]
    Close --> End(["⏹ Sesión terminada"])

    Block -.->|"resuelto"| Init

    %% ── Colores ──
    classDef human fill:#f9e2af,stroke:#f38ba8,color:#111
    classDef agent fill:#89b4fa,stroke:#1e66f5,color:#111
    classDef disk fill:#a6e3a1,stroke:#40a02b,color:#111
    classDef gate fill:#fab387,stroke:#fe640b,color:#111
    classDef stop fill:#f38ba8,stroke:#d20f39,color:#111

    class Espera human
    class Arranque,Redacta,Anota,Done,Close agent
    class Impl,Rev agent
    class InProgress disk
    class Init,RevCheck gate
    class Block,Blocked,End stop
```

## Contexto por agente

| Agente | Lee (contexto) | Escribe |
|---|---|---|
| **leader** (arranque) | `AGENTS.md`, `progress/current.md` | — |
| **leader** (redacción) | los 5 `docs/`, código relevante (`src/`), `feature_list.json` | la tarea en `feature_list.json`, `progress/current.md` |
| **implementer** | `AGENTS.md`, `docs/arquitectura.md`, `docs/estructura.md`, `docs/convenciones.md`, `docs/http.md`, la tarea, el código existente | código backend + `scripts/smoke.js` (**no documenta**) |
| **reviewer** | `docs/arquitectura.md`, `docs/estructura.md`, `docs/convenciones.md`, `docs/http.md`, `CHECKPOINTS.md`, la tarea, el código; ejecuta `./init.sh` | **nada** (read-only; veredicto por chat) |

## Los 5 docs obligatorios de `docs/`

`arquitectura.md` · `estructura.md` · `convenciones.md` · `http.md` ·
`verificacion.md`

Claves:

- Cada subagente arranca leyendo los `docs/` que le corresponden **antes** de
  escribir o juzgar: el `implementer` y el `reviewer`, además, `http.md` y
  `CHECKPOINTS.md`.
- El `reviewer` es el único que **no escribe nada**: lee el código y emite su
  veredicto por chat.
- Cada endpoint nuevo o modificado debe quedar cubierto por
  `scripts/smoke.js`; `./init.sh` corre lint + smoke.

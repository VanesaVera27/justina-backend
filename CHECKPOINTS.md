# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un juez (humano o IA) puede usar
> para decidir si el proyecto está sano.

## C1 — El arnés está completo

- [ ] Existen los 4 archivos base: `AGENTS.md`, `init.sh`, `feature_list.json`,
      `progress/current.md`.
- [ ] Existen los 5 docs: `docs/arquitectura.md`, `docs/estructura.md`,
      `docs/convenciones.md`, `docs/http.md`, `docs/verificacion.md`.
- [ ] Existe `package.json` con los scripts `dev`, `start`, `lint` y `smoke`.
- [ ] Existe `scripts/smoke.js`.
- [ ] Existen las carpetas de capa `src/domain/`, `src/repositories/`,
      `src/services/`, `src/controllers/`, `src/routes/` y
      `src/middlewares/` (pueden estar vacías, con `.gitkeep`).
- [ ] `./init.sh` termina con exit code 0.

## C2 — El estado es coherente

- [ ] A lo sumo una tarea en `in_progress` en `feature_list.json`.
- [ ] Toda tarea `done` tiene su `acceptance` verificado (lint + smoke verdes
      y evidencia concreta).
- [ ] `progress/current.md` está vacío o describe la sesión activa
      (no contiene basura de sesiones anteriores).

## C3 — El código respeta la arquitectura

- [ ] `src/` solo contiene las carpetas de capa `domain/`, `repositories/`,
      `services/`, `controllers/`, `routes/`, `middlewares/` (con sus
      `.gitkeep`), más `app.js` y `server.js` cuando existan.
- [ ] Las dependencias son unidireccionales:
      `routes → controllers → services → repositories → domain`.
- [ ] `domain/` y `services/` no importan `express` ni usan `req`/`res`.
- [ ] `controllers/` no importan `repositories/` ni `domain/`.
- [ ] `package.json` no añade dependencias fuera del template discutidas en
      `docs/arquitectura.md` (sin ORM, dotenv, cors ni logger).
- [ ] No hay `console.log` de debug, ni TODOs sin contexto.
- [ ] No hay HTML, CSS ni plantillas: es una API JSON.

## C4 — La verificación es real

- [ ] No hay frameworks de tests (sin Vitest/Jest/Mocha/supertest).
- [ ] `npm run lint` (oxlint) termina sin errores.
- [ ] `npm run smoke` termina correcto.
- [ ] Cada endpoint nuevo o modificado tiene su comprobación en
      `scripts/smoke.js` (status, `Content-Type`, body y un caso de error).
- [ ] Las tareas con endpoints nuevos reportaron su smoke manual/ejecutable
      por chat (sin archivo).

## C5 — La sesión se cerró bien

- [ ] No hay archivos sin trackear sospechosos (`node_modules`/`dist`/
      `coverage` ignorados, sin `*.tmp`).
- [ ] `progress/history.md` tiene una entrada por la última sesión.
- [ ] La última tarea trabajada está reflejada en su estado correcto.

---

**Cómo usar este archivo:** un agente revisor (`.opencode/agents/reviewer.md`)
recorre cada checkbox **mentalmente** (no escribe nada: es read-only) y emite
su veredicto por chat; rechaza el cierre de sesión si algún box de C1-C5 queda
sin cumplir.

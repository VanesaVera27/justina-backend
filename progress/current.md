# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **manténlo actualizado en tiempo real**, no al final.

- **Tarea en curso:** (ninguna)
- **Inicio:** 2026-10-22
- **Agente:** (leader)

## Plan

(nada)

## Bitácora

- Se borró el ejemplo `endpoint_despedida` (`GET /despedida`): eliminados controller/service/routes, quitado del montaje de `routes/index.js` y del smoke. `feature_list.json` reseteado a `tareas: []`. `./init.sh` verde.
- Se eliminó todo lo SDD del arnés: borrados `.opencode/agents/spec_author.md`, `docs/especificaciones.md` y la carpeta `specs/`; reglas de `feature_list.json` sin `spec_ready` ni flag `sdd`; flujo único `pending → in_progress → [implementer → reviewer] → done` en AGENTS.md, agentes, CHECKPOINTS.md, README.md y diagramas. `./init.sh` verde.
- Se vació el azulejo de `src/` del ejemplo incluido: borrados `app.js`, `server.js`, el endpoint `/salud` (routes/controllers/services) y los middlewares 404/errores; quedan solo 6 carpetas con `.gitkeep`. `smoke.js` ahora es un placeholder que se extiende en cada tarea con endpoints; docs (estructura, arquitectura, http, convenciones, verificacion), CHECKPOINTS, README y SKILL.md reescritos al contrato "los archivos se crean con la primera tarea HTTP". `./init.sh` verde.
- Proyecto renombrado de `harness-sdd-back` a `justina-backend`: `package.json`, `package-lock.json`, `feature_list.json` y README.md; carpeta del repo movida a `~/Escritorio/justina-backend` y sesión reasentada. `./init.sh` verde.
- Convención de archivos cambiada a petición del humano: `<recurso><Capa>.js` en camelCase (`productoController.js`, `productoService.js`, `productoRoutes.js`, `productoRepository.js`), sin punto separador. Actualizados convenciones.md, estructura.md, http.md y SKILL.md de nomenclatura-es. `./init.sh` verde.

## Próximo paso

- Esperando un pedido del humano.

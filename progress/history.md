# Historial de sesiones (resumido)

## 2026-10-22 — conversion-express — Plantilla convertida a Node.js + Express

- **Objetivo:** transformar el arnés React en una plantilla backend Node.js + Express por capas, sin app de ejemplo.
- **Tareas:** (ninguna; reset de `feature_list.json` a plantilla limpia).
- **Archivos clave:** package.json, scripts/smoke.js, src/{app,server}.js, src/{routes,controllers,services,repositories,domain,middlewares}/, docs/*, AGENTS.md, CHECKPOINTS.md, README.md, init.sh, .opencode/agents/*, .opencode/skills/nomenclatura-es/SKILL.md.
- **Acción:** se eliminó el código React/CSS/Vite; se creó el scaffold Express con `GET /salud`, 404 y manejo centralizado de errores; se reescribieron docs y agentes; `init.sh` ahora verifica lint + smoke.
- **Cierre:** `./init.sh` verde; `npm run smoke` OK.

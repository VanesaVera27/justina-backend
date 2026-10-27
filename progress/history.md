# Historial de sesiones (resumido)

## 2026-10-22 — conversion-express — Plantilla convertida a Node.js + Express

- **Objetivo:** transformar el arnés React en una plantilla backend Node.js + Express por capas, sin app de ejemplo.
- **Tareas:** (ninguna; reset de `feature_list.json` a plantilla limpia).
- **Archivos clave:** package.json, scripts/smoke.js, src/{app,server}.js, src/{routes,controllers,services,repositories,domain,middlewares}/, docs/*, AGENTS.md, CHECKPOINTS.md, README.md, init.sh, .opencode/agents/*, .opencode/skills/nomenclatura-es/SKILL.md.
- **Acción:** se eliminó el código React/CSS/Vite; se creó el scaffold Express con `GET /salud`, 404 y manejo centralizado de errores; se reescribieron docs y agentes; `init.sh` ahora verifica lint + smoke.
- **Cierre:** `./init.sh` verde; `npm run smoke` OK.

## 2026-10-27 — catalogo-postgres — Catálogo de productos sobre PostgreSQL

- **Objetivo:** historia de admin: crear, editar, dar de baja productos con fotos, precio, variantes, estado y stock; luego conectarlo a PostgreSQL (DDL del humano) y postman.
- **Tareas:** `productos-flujo-base`, `productos-editar-baja`, `productos-variantes`, `bd-infraestructura`, `productos-esquema-ddl-usuario` (rebasó la primera pasada de `productos-persistencia-bd`), `bd-configuracion-credenciales` — todas `done`.
- **Archivos clave:** src/{app,server}.js, src/domain/producto.js, src/repositories/{productoRepository,pool}.js, src/services/productoService.js, src/controllers/productoController.js, src/routes/{productoRoutes,index}.js, src/middlewares/{noEncontrado,manejadorErrores}.js, db/schema.sql, scripts/{smoke,bdInit}.js, postman/justina-backend.postman_collection.json, .env/.env.example.
- **Acción:** endpoints catálogo (POST/GET/PATCH/DELETE /productos + variantes con sku 409, atributos y fotos por variante, precio derivado); esquema oficial = DDL del usuario (24 tablas, bd:init idempotente); pool portable por DATABASE_URL o DB_* separadas; repo SQL parametrizado con transacciones, solo repositories/: importa pg.
- **Cierre:** `./init.sh` verde (lint + smoke); todas las tareas revisadas por el reviewer.

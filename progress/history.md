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

## 2026-10-29 — catalogo-categorias-imagenes — Categorías, fotos y vínculo de productos

- **Objetivo:** implementar el CRUD de categorías, asociarlas a productos y permitir subir imágenes para las variantes.
- **Tareas:** `categorias-crud`, `productos-categoria-id`, `imagenes-multipart`, `variantes-atributos-nombre` — todas `done`.
- **Archivos clave:** `src/{domain,repositories,services,controllers,routes}/categoria*`, `src/{domain,repositories,services,controllers,routes}/imagen*`, `src/repositories/productoRepository.js`, `db/schema.sql`, `scripts/smoke.js`.
- **Acción:** agregado `categoriaId` nullable, CRUD de categorías con FK `ON DELETE SET NULL`, carga multipart local bajo `/uploads` con límite de 10 MB y persistencia de nombres de atributos en `valor_variante.nombre`.
- **Cierre:** `npm run bd:init` repetido dos veces y `./init.sh` verde (lint + smoke).

## 2026-10-30 — fotos-drive — Resolver fotos de variantes desde Google Drive

- **Objetivo:** aceptar referencias de archivos de Drive al crear variantes y ofrecer URLs de imagen accesibles al frontend.
- **Tareas:** `fotos-variantes-google-drive` — `done`.
- **Archivos clave:** repositorio Google Drive, servicio/controlador de imágenes, dominio de productos, `docs/http.md`, `.env.example`, `scripts/smoke.js`.
- **Acción:** añadida búsqueda en carpeta configurada, resolución inequívoca por ID, respuestas 404/409 y proxy autenticado con alcance Drive de solo lectura.
- **Cierre:** `./init.sh` verde (lint + smoke); las llamadas reales a Drive quedan pendientes de validar con credenciales y carpeta configuradas.

## 2026-10-30 — fotos-locales — Resolver fotos de variantes desde almacenamiento local

- **Objetivo:** reemplazar Drive por archivos locales identificados por su nombre original.
- **Tareas:** `fotos-variantes-almacenamiento-local` — `done`.
- **Archivos clave:** `src/domain/imagen.js`, `src/repositories/imagenRepository.js`, servicios/controlador/rutas de imágenes, `src/services/productoService.js`, `docs/http.md`, `scripts/smoke.js`.
- **Acción:** cargas locales conservan nombre seguro, no sobrescriben duplicados y las variantes buscan ese nombre en `uploads/`; retirada la integración/dependencia Drive.
- **Cierre:** `./init.sh` verde (lint + smoke).

## 2026-10-30 — bajas-panel — Bajas desde el panel de productos

- **Objetivo:** quitar variantes, dar de baja productos y proteger categorías asociadas.
- **Tareas:** `bajas-panel-productos` — `done`.
- **Archivos clave:** rutas/controladores/servicios/repositorios de productos y categorías, `scripts/smoke.js`, `docs/http.md`.
- **Acción:** agregado DELETE de variante acotado a su producto; producto mantiene baja lógica; categoría responde 409 si tiene productos y solo se elimina al quedar libre.
- **Cierre:** `./init.sh` verde; smoke cubre 204, 404, 409 y pertenencia de variante.

## 2026-10-30 — fotos-variantes-multipart — Subir fotos de variantes

- **Objetivo:** recibir fotos multipart al crear y actualizar variantes.
- **Tareas:** `fotos-variantes-multipart` — `done`.
- **Archivos clave:** `src/middlewares/recibirFotosVariante.js`, `src/domain/imagen.js`, repositorios y servicios de imágenes/productos, `scripts/smoke.js`, `docs/http.md`.
- **Acción:** carga múltiple validada, nombres UUID en `uploads/productos/`, persistencia de URLs, y PATCH que conserva o reemplaza fotos según los archivos recibidos.
- **Cierre:** `./init.sh` verde; smoke verifica imágenes servibles, atributos JSON, conservación, reemplazo y errores 400/413.

## 2026-10-30 — urls-imagenes-seed — Verificar URLs de imágenes de ejemplo

- **Objetivo:** confirmar persistencia de fotos y corregir URLs inválidas de variantes en datos de ejemplo.
- **Tareas:** `persistir-url-imagenes-seed` — `done`.
- **Archivos clave:** `db/inserts.sql`, `scripts/smoke.js`.
- **Acción:** se usa `/uploads/remera.jpg` para la variante de remera negra y se quitan las referencias seed `/images/...` no servidas; smoke compara URL y `es_principal` de la respuesta con la fila PostgreSQL.
- **Cierre:** `./init.sh` verde contra una base temporal aislada; base temporal eliminada al terminar.

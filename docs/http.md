# HTTP — convención de la API

> Cómo se diseñan las rutas, las respuestas y los errores. Es una convención
> transversal: aplica a todo endpoint, no a una capa concreta.
> La forma de organizar el código está en `docs/estructura.md`.

## 1. Rutas

- Sustantivos en **plural**, `kebab-case` y español ASCII: `/productos`,
  `/carritos`, `/lineas-carrito`.
- Sin verbos en la URL: `/productos`, no `/listarProductos`.
- Sin prefijo `/api` ni versionado hasta que una tarea lo pida.
- El archivo de rutas se llama `<recurso>Routes.js` y vive en
  `src/routes/`. El router principal (`src/routes/index.js`) monta cada
  recurso.

## 2. Métodos y códigos de estado

| Caso                          | Método             | Status | Cuerpo                         |
|-------------------------------|--------------------|--------|--------------------------------|
| Listar una colección          | `GET /recurso`     | `200`  | array JSON                     |
| Obtener un recurso            | `GET /recurso/:id` | `200`  | objeto JSON                    |
| Crear                         | `POST /recurso`    | `201`  | objeto creado                  |
| Reemplazar / actualizar       | `PUT` / `PATCH`    | `200`  | objeto actualizado             |
| Eliminar                      | `DELETE`           | `204`  | sin cuerpo                     |
| Error de validación           | cualquiera         | `400`  | objeto de error                |
| Recurso o ruta inexistente    | cualquiera         | `404`  | objeto de error                |
| Conflicto                     | cualquiera         | `409`  | objeto de error                |
| Error interno                 | cualquiera         | `500`  | objeto de error genérico       |

Reglas duras:

- Un `200` **nunca** lleva un error adentro.
- Un `500` **nunca** expone stack, SQL ni detalles internos.
- `204` no lleva body.

## 3. JSON

- `Content-Type: application/json; charset=utf-8`.
- Campos en `camelCase` español ASCII: `nombre`, `precioUnitario`,
  `creadoEn`.
- Fechas en ISO 8601 UTC: `new Date().toISOString()`.
- IDs como `string` estable. No exponer números autoincrementales internos.
- Booleanos reales (`true`/`false`), no `"true"`/`"false"`.
- Las colecciones se devuelven como array. No envolver en `{ "datos": [] }`
  salvo que una tarea pida paginación.
- No devolver `undefined`. Usar `null` solo si el contrato lo define.

## 4. Errores

Forma mínima:

```json
{ "error": "mensaje concreto" }
```

Casos especiales:

- Ruta inexistente: `{ "error": "Ruta no encontrada", "ruta": "/lo-que-sea" }`.
- JSON inválido: `{ "error": "JSON invalido" }`.
- Error interno: `{ "error": "Error interno del servidor" }`.

El único responsable de traducir errores a HTTP es el middleware central
`manejadorErrores.js` (en `src/middlewares/`, cuando exista). Dominio y
servicios lanzan `Error` con `status` cuando corresponde; no construyen
respuestas.

## 5. Validación

- La validación de negocio vive en `src/domain/` y `src/services/`.
- El controlador solo lee `req.params`, `req.query` o `req.body` y llama al
  servicio. No decide reglas de negocio.
- Si falta un campo obligatorio o tiene un tipo inválido, el servicio lanza un
  error con `status = 400`.
- Nunca se confía en los datos del cliente.

## 6. Persistencia

- Todo acceso a datos pasa por `src/repositories/`.
- Por defecto, los repositorios son en memoria hasta que una tarea pida una
  base de datos.
- Los controladores no importan repositorios: siempre pasan por un servicio.

## 7. Categorías y productos

- `GET /categorias` devuelve un array de `{ id, nombre, esDestacada }`.
- `POST /categorias` recibe `nombre` y `esDestacada` y responde `201` con la
  categoría creada.
- `PATCH /categorias/:id` acepta cambios parciales de `nombre` y
  `esDestacada`; `DELETE /categorias/:id` responde `204` si la categoría no
  tiene productos asociados, `404` si no existe o `409` con `{ "error": "..." }`
  si todavía tiene productos. No se borran ni desasocian productos en cascada.
- Los productos exponen `categoriaId` como ID string o `null`. Al crear y
  editar se acepta una categoría existente o `null`; el borrado de una
  categoría exige reasignar esos productos o establecer su `categoriaId` a
  `null` antes de eliminarla.
- `DELETE /productos/:id` es una baja lógica: marca el producto como
  `inactivo` y responde `204`; no lo elimina de la base. Responde `404` si no
  existe.
- `DELETE /productos/:productoId/variantes/:varianteId` elimina la variante
  indicada y sus datos dependientes (atributos e imágenes) con respuesta
  `204`; responde `404` si el producto o la variante de ese producto no existe.
- Las variantes de los productos incluyen sus arrays `atributos` y `fotos`.

## 8. Imágenes

- `POST /imagenes` recibe `multipart/form-data` con el campo `archivo` y
  responde `201` con `{ "nombre": "<nombre-original>", "url": "/uploads/<nombre-original>" }`.
- Se aceptan PNG, JPEG, GIF, WebP y AVIF de hasta 10 MB. Los archivos quedan
  disponibles en la carpeta local `uploads/`, servidos desde esa URL en el
  mismo servidor. La extensión del nombre debe coincidir con el contenido.
  Los nombres deben ser únicos: si ya existe un archivo con ese nombre,
  responde `409` y no lo sobrescribe.
- `POST /productos/:id/variantes` y
  `PATCH /productos/:productoId/variantes/:varianteId` reciben
  `multipart/form-data`: campos `sku`, `stock`, `precioUnitario` y
  `atributos` (array JSON serializado), y archivos repetidos bajo `fotos`.
  `POST` requiere al menos un archivo; `PATCH` permite no enviar ninguno.
  Cada imagen puede pesar hasta 10 MB; se admiten hasta 10 archivos
  por solicitud y tipos PNG, JPEG, GIF, WebP y AVIF, validados también por su
  firma binaria.
- Las imágenes de variantes se guardan bajo `uploads/productos/` con nombres
  UUID generados por el servidor. La base guarda solo su URL y el indicador
  `esPrincipal`; la primera imagen enviada queda como principal. Las URLs
  `/uploads/productos/<nombre>` sirven directamente al frontend.
- En `PATCH`, si no se envían archivos se conservan las fotos actuales; si se
  envía uno o más archivos, se reemplaza el conjunto de fotos de la variante.
- La carga anterior por nombre en JSON sigue admitida por compatibilidad para
  crear variantes; los nuevos flujos del panel deben enviar archivos
  multipart. Los campos `stock` y `precioUnitario` se reciben como texto
  multipart y se validan como números.

## 9. Smoke

- `scripts/smoke.js` debe cubrir cada endpoint nuevo: status,
  `Content-Type`, forma del body y al menos un caso de error.
- `npm run smoke` tiene que quedar verde antes de cerrar una tarea.
- El smoke se ejecuta en un puerto efímero y no necesita un servidor levantado
  a mano.

## Checklist rápida

- [ ] La ruta es un sustantivo plural en `kebab-case` español.
- [ ] El método y el status siguen la tabla.
- [ ] El JSON usa `camelCase` español y fechas ISO.
- [ ] Los errores tienen la forma `{ "error": "..." }`.
- [ ] La lógica está en dominio/servicios, no en rutas/controladores.
- [ ] El acceso a datos está en un repositorio.
- [ ] `scripts/smoke.js` cubre el endpoint y `npm run smoke` está verde.

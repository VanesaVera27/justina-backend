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

## 7. Smoke

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

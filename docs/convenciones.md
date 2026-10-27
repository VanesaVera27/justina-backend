# Convenciones de código

> Homogeneidad extrema. La IA predice mejor cuando el repositorio se parece
> a sí mismo en todas partes.

## Stack

- **Node.js >= 20** + **Express 5**.
- **JavaScript moderno con módulos ESM** (`"type": "module"` en
  `package.json`). Nada de CommonJS (`require`, `module.exports`).
- **oxlint** para lint.
- **Sin TypeScript, sin build y sin frameworks de tests.** La verificación es
  lint + smoke (`npm run lint`, `npm run smoke`); ver
  `docs/verificacion.md`.
- Estilo: **comillas simples**, **sin punto y coma**, indentación de 2
  espacios y coma final en estructuras multilínea. Mantenerlo en todo el
  código.

## Nombres

**Idioma — español por defecto.** Los identificadores propios del dominio o de
la app se escriben en **español**. Se mantiene en **inglés** solo lo que se
entiende mejor sin traducir (ver «Excepciones»). No es traducción literal: es
nombrar en español lo que el código representa.

**Sin tildes ni `ñ`: solo ASCII.** `configuracion` (no `configuración`),
`anadir` (no `añadir`), `numero` (no `número`), `anio` (no `año`).

| Tipo                              | Convención                  | Ejemplo en español                  |
|-----------------------------------|-----------------------------|-------------------------------------|
| Carpetas de capa                  | inglés, `kebab-case`        | `routes/`, `controllers/`, `domain/`|
| Archivos por capa                 | `<recurso><Capa>.js`        | `productoController.js`, `productoService.js` |
| Funciones / variables             | `camelCase`                 | `listarProductos`, `precioUnitario` |
| Constantes                        | `UPPER_SNAKE`               | `PUERTO_POR_DEFECTO`                |
| Clases de error                   | `PascalCase`                | `ErrorNoEncontrado`                 |
| Rutas URL                         | `kebab-case` español        | `/lineas-carrito`                   |
| Campos JSON                       | `camelCase` español         | `creadoEn`, `precioUnitario`        |

### Excepciones (se quedan en inglés)

- **APIs de Express y Node**: `req`, `res`, `next`, `router`, `app`,
  `express`, `status`, `json`, `send`, `listen`, `process`, `fetch`,
  `Promise`, `URL`, `JSON`.
- **Librerías y paquetes**: `express`, `node`, `oxlint`.
- **Acrónimos y términos técnicos universales**: `HTTP`, `API`, `JSON`, `URL`,
  `id`.
- **Jerga sin traducción natural**: `middleware`, `router`, `payload`,
  `token`, `cache`, `mock`, `bug`, `commit`.

> La skill `.opencode/skills/nomenclatura-es/` detalla el criterio de decisión
> y el glosario ES↔EN. Ante la duda real, elegir inglés.

## Estructura de archivo

Un módulo de dominio puro:

```js
// src/domain/producto.js
export function crearProducto({ id, nombre, precio }) {
  if (!nombre || nombre.trim() === '') {
    const error = new Error('El nombre es obligatorio')
    error.status = 400
    throw error
  }

  return { id, nombre: nombre.trim(), precio }
}
```

Un servicio (caso de uso; no conoce Express):

```js
// src/services/productoService.js
import { listarProductos } from '../repositories/productoRepository.js'

export function obtenerProductos() {
  return listarProductos()
}
```

Un controlador (solo HTTP):

```js
// src/controllers/productoController.js
import { obtenerProductos } from '../services/productoService.js'

export function listarProductos(req, res) {
  res.status(200).json(obtenerProductos())
}
```

- **JSDoc opcional** en funciones exportadas cuando el contrato no sea obvio
  (sobre todo en servicios). Las etiquetas (`@param`, `@returns`) van en
  inglés porque son estándar; las descripciones, en español.
- No se escriben comentarios por defecto. Solo cuando explican un *por qué* no
  obvio (workaround documentado, invariante sutil).

## Manejo de errores

- Las reglas de negocio lanzan `Error` con un `status` HTTP cuando
  corresponda:

  ```js
  const error = new Error('Producto no encontrado')
  error.status = 404
  throw error
  ```

- Los servicios **no** llaman a `res`; solo lanzan o devuelven datos.
- `src/middlewares/manejadorErrores.js` es el único que traduce un error a
  JSON. Si `status` no es un entero, responde `500`.
- Un JSON malformado en el body se responde como `400` con
  `{ "error": "JSON invalido" }`.
- Nunca se devuelve el stack, el SQL ni rutas internas al cliente.

## Logs

- En el código de la app, `process.stdout`/`process.stderr` solo se usan en
  `src/server.js` (mensaje de arranque) y en `manejadorErrores.js` (errores
  500). `scripts/smoke.js` los usa para reportar su resultado.
- **No** se usa `console.log` para debug ni para errores de usuario.

## Verificación

- No se escriben tests con Vitest, Jest, Mocha ni similares.
- La red de seguridad es `npm run lint` + `npm run smoke`.
- Cada tarea que agrega o cambia un endpoint **debe** extender
  `scripts/smoke.js` con la comprobación correspondiente.

---
name: Nomenclatura en español
description: Aplicar al escribir o revisar identificadores (módulos, rutas, controladores, servicios, repositorios, funciones, variables, archivos) la convención de nombres en español, con las excepciones que se mantienen en inglés.
---

# Nomenclatura en español

Cómo nombrar el código de este repositorio: **español por defecto, inglés solo
cuando se entiende mejor sin traducir**.

La política canónica vive en `docs/convenciones.md` (§Nombres). Esta skill la
operacionaliza: úsala al escribir código nuevo y al revisar el existente.

## Regla base

Todo identificador **propio** del dominio o de la app se escribe en **español**.
Se mantiene en **inglés** únicamente aquello que se entiende mejor sin traducir
(ver «Excepciones»).

No es una traducción literal palabra por palabra: es **nombrar en español** lo
que el código representa.

## Alcance

Se nombran en español:

- Recursos, entidades y módulos de dominio.
- Funciones, variables y parámetros.
- Constantes.
- Clases de error.
- Campos JSON y rutas URL.
- Archivos de recurso y repositorios.
- Capas de servicio, controlador y ruta (el nombre del recurso).

## Mecánica

Se conserva el **estilo** del repo (`docs/convenciones.md`); lo único que cambia
es el **idioma** de las palabras:

| Tipo                          | Convención                  | Ejemplo en español                  |
|-------------------------------|-----------------------------|-------------------------------------|
| Carpetas de capa              | inglés, `kebab-case`        | `routes/`, `controllers/`, `domain/`|
| Archivos por capa             | `<recurso><Capa>.js`        | `productoController.js`             |
| Funciones / variables         | `camelCase`                 | `listarProductos`, `precioUnitario` |
| Constantes                    | `UPPER_SNAKE`               | `PUERTO_POR_DEFECTO`                |
| Clases de error               | `PascalCase`                | `ErrorNoEncontrado`                 |
| Rutas URL                     | `kebab-case` español        | `/lineas-carrito`                   |
| Campos JSON                   | `camelCase` español         | `creadoEn`, `precioUnitario`        |

**Sin tildes ni `ñ`: solo ASCII.** `configuracion` (no `configuración`),
`anadir` (no `añadir`), `numero` (no `número`), `anio` (no `año`).

## Excepciones (se quedan en inglés)

Estas palabras **no** se traducen, porque traducirlas empeora la lectura o
rompe la tecnología:

1. **APIs de Express y Node**:
   `req`, `res`, `next`, `router`, `app`, `express`, `status`, `json`, `send`,
   `listen`, `process`, `fetch`, `Promise`, `URL`, `JSON`.

2. **Librerías y paquetes**:
   `express`, `node`, `oxlint`.

3. **Acrónimos y términos técnicos universales**:
   `HTTP`, `API`, `JSON`, `URL`, `id`.

4. **Jerga sin traducción natural** (un dev hispanohablante la dice en inglés):
   `middleware`, `router`, `payload`, `token`, `cache`, `mock`, `bug`,
   `commit`.

5. **Carpetas de capa**:
   `routes/`, `controllers/`, `services/`, `repositories/`, `domain/`,
   `middlewares/` son términos de arquitectura y se quedan en inglés.

## Criterio de decisión (caso dudoso)

Antes de traducir una palabra, pregúntate en orden:

1. **¿Es una API, un paquete o algo que ya existe en esa forma?** → déjalo en
   inglés tal cual.
2. **¿Tiene una traducción natural que un dev hispanohablante diría sin
   pensar?** → español (`producto`, `listar`, `crear`, `guardar`, `clave`).
3. **Si no** → inglés (`token`, `payload`, `middleware`).

Ante la duda real, elige inglés: es preferible un término claro a una
traducción forzada.

## Glosario ES ↔ EN

| Español (usar)   | Inglés (evitar) |
|------------------|-----------------|
| tarea            | todo / task     |
| listar           | list            |
| crear            | create          |
| eliminar         | delete          |
| filtrar          | filter          |
| guardar          | save            |
| clave            | key             |
| entrada          | input           |
| respuesta        | response        |
| mostrar          | render / show   |
| actualizar       | update          |
| precio unitario  | unit price      |

> Excepción del glosario: cuando una de estas palabras es **API de la
> librería** (p. ej. `req`/`res` de Express), manda el inglés.

## Pares buenos / malos

```js
// ✅ Bien
export function formatearProducto(producto) {
  return { nombre: producto.nombre, creadoEn: producto.creadoEn }
}

// ❌ Mal
export function formatProduct(product) {
  return { name: product.name, createdAt: product.createdAt }
}
```

```js
// ✅ Bien — productoRoutes.js / productoService.js / obtenerProductos
// ❌ Mal — productRoutes.js / productService.js / getProducts
```

```js
// ✅ Bien — nombres propios en español, APIs en inglés
export function listarProductos(req, res) {
  const productos = obtenerProductos()
  res.status(200).json(productos)
}
```

## Rutas y JSON

La convención detallada está en `docs/http.md`. En corto:

- Rutas en sustantivo plural, `kebab-case`, español ASCII: `/productos`,
  `/lineas-carrito`.
- Campos JSON en `camelCase` español: `nombre`, `precioUnitario`, `creadoEn`.
- Las palabras técnicas (`JSON`, `HTTP`, `id`) no se traducen.

## Checklist rápida

- [ ] Los identificadores propios están en español y sin tildes ni `ñ`.
- [ ] Las únicas palabras en inglés son APIs, paquetes, acrónimos o jerga
      universal sin traducción natural.
- [ ] Se mantiene el estilo del repo (`camelCase`, `UPPER_SNAKE`, `PascalCase`).
- [ ] Las rutas y los campos JSON están en español.

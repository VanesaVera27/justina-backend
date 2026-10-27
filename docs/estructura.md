# Estructura — cómo está armado el esqueleto

> Este documento explica el esqueleto mínimo del backend y su regla central:
> **HTTP y comportamiento se cambian por separado.** La plantilla está vacía:
> `src/` son carpetas por capas sin archivos; cada tarea va llenándolas.

## Las capas

| Ruta                 | Rol                                                          | Puede importar                 |
|----------------------|--------------------------------------------------------------|--------------------------------|
| `src/domain/`        | Dominio puro: entidades, valores y funciones                 | Nada (solo JavaScript)         |
| `src/repositories/`  | Acceso a datos (memoria, SQL, archivos, APIs externas)       | `src/domain/`                  |
| `src/services/`      | Casos de uso; orquesta dominio y repositorios                | `src/domain/`, `src/repositories/` |
| `src/controllers/`   | Adaptador HTTP: lee `req`, llama al servicio y responde      | `src/services/`                |
| `src/routes/`        | Declara método + path y apunta al controlador                | `src/controllers/`             |
| `src/middlewares/`   | 404 y manejo centralizado de errores                         | Nada de negocio                |
| `src/app.js`         | Composición de Express (middlewares + rutas)                 | `src/routes/`, `src/middlewares/` |
| `src/server.js`      | Arranque y `listen`                                          | `src/app.js`                   |

> La plantilla es vacía: ni `src/app.js`, ni `src/server.js`, ni los
> middlewares existen todavía. La **primera tarea que toque HTTP** crea esos
> archivos (y los 404/errores de `middlewares/`) respetando esta tabla.

Regla de oro de dependencias (**unidireccional**):

```text
server ─→ app ─→ routes ─→ controllers ─→ services ─→ repositories ─→ domain
                    │                         │
                    └───────────────┬─────────┘
                                    └─→ domain
```

- `domain/` no conoce a nadie.
- `repositories/` conoce `domain/`, pero no servicios, controladores, rutas ni
  Express.
- `services/` conoce `domain/` y `repositories/`, pero no Express.
- `controllers/` conoce `services/`; no importa `repositories/` ni `domain/`.
- `routes/` conoce `controllers/`; no tiene lógica.
- `middlewares/` no importa capas de negocio.

## Carpetas y nombres

```text
src/
├── app.js                       # composición de Express (se crea con la primera tarea HTTP)
├── server.js                    # arranque (se crea con la primera tarea HTTP)
├── routes/                      # vacío (+ .gitkeep)
├── controllers/                 # vacío (+ .gitkeep)
├── services/                    # vacío (+ .gitkeep)
├── repositories/                # vacío (+ .gitkeep)
├── domain/                      # vacío (+ .gitkeep)
└── middlewares/                 # vacío (+ .gitkeep)
```

- Las carpetas de capa conservan su nombre en inglés (`routes`, `controllers`,
  `services`, `repositories`, `domain`, `middlewares`) porque son términos de
  arquitectura.
- Los archivos de un recurso usan `camelCase` con la capa pegada al final del
  nombre: `productoRoutes.js`, `productoController.js`, `productoService.js`,
  `productoRepository.js`. El recurso va en español ASCII (`producto`,
  `carrito`, `precioUnitario`) y el sufijo, en inglés (son términos de
  arquitectura, como las carpetas).
- Un concepto de dominio por archivo: `src/domain/producto.js`,
  `src/domain/carrito.js`.
- No crear `utils/` ni `lib/` genéricos: el helper va a la capa que lo usa.

## Los dos contratos

Hay dos fronteras explícitas:

1. **Contrato HTTP** (lo que ve el cliente): método, path, status y forma del
   JSON. Está en `docs/http.md` y se implementa en `routes/` + `controllers/`.
2. **Contrato de servicio** (lo que consume el controlador): funciones
   exportadas por `services/`, con entradas y salidas claras. El controlador
   no conoce repositorios ni reglas de dominio.

```js
// ejemplo: src/services/productoService.js
export function listarProductos() {
  return repositorioDeProductos.listar()
}
```

```js
// ejemplo: src/controllers/productoController.js
import { listarProductos } from '../services/productoService.js'

export function obtenerProductos(req, res) {
  res.status(200).json(listarProductos())
}
```

Mientras el contrato de servicio no cambie, cambiar la forma de la URL, el
status o los nombres del JSON no obliga a tocar la lógica. Si cambia el
contrato de servicio, es una decisión explícita y se toca el controlador, que
es el único punto donde ambos mundos se encuentran.

## Cambiar una cosa sin tocar la otra

| Quiero cambiar…                                      | Toco…                                              | No toco…                              |
|------------------------------------------------------|----------------------------------------------------|---------------------------------------|
| La URL, el método o el status                        | `src/routes/`, `src/controllers/`, `docs/http.md`  | `src/domain/`, `src/services/`        |
| La forma del JSON de respuesta                        | `src/controllers/`                                 | `src/domain/`, `src/repositories/`    |
| Una regla de negocio o validación                     | `src/domain/`, `src/services/`                     | `src/routes/`                         |
| La fuente de datos (memoria → SQL)                    | `src/repositories/`                                | `src/domain/`, `src/controllers/`     |
| El manejo global de errores                           | `src/middlewares/`                                 | `src/domain/`, `src/services/`        |

## De plantilla vacía a backend funcionando

La primera tarea que toque HTTP termina el andamiaje:

- `src/app.js` — composición: `express.json()`, las rutas, el 404 y el
  manejador de errores.
- `src/server.js` — arranque: escucha en `PORT` (3000 por defecto).
- `src/middlewares/` — `noEncontrado.js` (404 JSON) y
  `manejadorErrores.js` (errores traducidos a JSON).

A partir de ahí, agregar una función (por ejemplo, **listar productos**) es
simétrico:

1. **Dominio**: `src/domain/producto.js` con la entidad y los helpers puros.
2. **Repositorio**: `src/repositories/productoRepository.js` con
   `listarProductos()`.
3. **Servicio**: `src/services/productoService.js` con `listarProductos()`.
4. **Controlador**: `src/controllers/productoController.js` que llama al
   servicio y responde `200`.
5. **Ruta**: `src/routes/productoRoutes.js` y el montaje en
   `src/routes/index.js`.
6. **Smoke**: agregar la comprobación del endpoint en `scripts/smoke.js`.

Ni los pasos 1–3 miran Express, ni los pasos 4–5 miran las reglas de negocio.

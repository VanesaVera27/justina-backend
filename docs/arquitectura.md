# Arquitectura — Qué significa "hacer un buen trabajo"

> Este documento define el estándar de calidad. Los agentes revisores
> evalúan el código contra este archivo. Si no está aquí, no es un requisito.
> El mapa concreto del esqueleto y las reglas de dependencia están en
> `docs/estructura.md`; la convención de rutas, JSON y errores, en
> `docs/http.md`.

## Principios

1. **Capas claras.** El backend tiene cinco capas y dos puntos de entrada:
   - `src/domain/` — dominio puro en JavaScript: entidades, valores y
     funciones. Sin Express, sin `req`/`res`, sin acceso a datos.
   - `src/repositories/` — acceso a datos (memoria, SQL, archivos, APIs
     externas). No conoce HTTP.
   - `src/services/` — casos de uso: orquestan dominio y repositorios. No
     conoce Express ni respuestas HTTP.
   - `src/controllers/` — adaptador HTTP: leen `req`, llaman a un servicio y
     responden JSON. Sin lógica de negocio.
   - `src/routes/` — declaran método, ruta y controlador. Sin lógica.

   `src/middlewares/` contiene piezas transversales (404 y manejo de errores).
   La composición de Express (en `src/app.js`) y el arranque (en
   `src/server.js`) se crean con la primera tarea HTTP. Las dependencias son
   **unidireccionales**:
   `routes → controllers → services → repositories → domain`;
   `app → routes + middlewares`; `server → app`.
   No introducir capas adicionales (`utils/`, `lib/`, `config/`, stores
   globales) hasta que haya una razón concreta documentada en
   `feature_list.json`.

2. **HTTP fino.** Rutas y controladores no contienen reglas de negocio ni
   validaciones complejas. Su único trabajo es traducir entre HTTP y el
   contrato de los servicios. La lógica vive en `domain/` y `services/`.

3. **Dominio puro.** Las reglas de negocio viven en `src/domain/` como
   funciones puras, sin efectos secundarios y sin dependencias del entorno.
   Los servicios coordinan esas reglas con los repositorios.

4. **Solo las dependencias del template.** `express` como dependencia de
   runtime y `oxlint` como tooling. No hay framework de tests, ORM, `dotenv`,
   `cors`, logger ni validador externo. Si una feature requiere una librería
   nueva, primero se discute (estado `blocked`).

5. **Inmutabilidad.** No mutar los datos que llegan por parámetro. Agregar o
   quitar elementos devuelve **nuevas** estructuras (`map`, `filter`, spread).
   Nunca `push`/`splice` sobre el estado recibido.

6. **Estado en un solo lugar.** El estado persistente vive en los
   repositorios. No hay variables mutables a nivel de módulo ni estado global
   escondido. Si un servicio necesita estado, lo pide al repositorio.

7. **Errores centralizados.** Dominio y servicios lanzan `Error` (con
   `status` cuando corresponda). Solo `src/middlewares/manejadorErrores.js`
   traduce ese error a una respuesta HTTP. Un servicio **nunca** toca `res`.

8. **Respuestas JSON consistentes.** Todos los endpoints siguen
   `docs/http.md`: mismos códigos, misma forma de error, mismas convenciones
   de nombres. La API no devuelve HTML ni plantillas.

## Flujo de una petición

```text
cliente HTTP
    │
    ▼
src/routes/           método + path
    │
    ▼
src/controllers/      lee req, llama al servicio, responde JSON
    │
    ▼
src/services/         caso de uso
    │
    ├─→ src/domain/          reglas puras
    └─→ src/repositories/    datos
                              │
errores ─→ src/middlewares/manejadorErrores.js ─→ JSON
```

## Qué NO hacer

- No importar `express` desde `domain/`, `repositories/` ni `services/`.
- No usar `req`/`res` en `services/` ni en `domain/`.
- No poner lógica de negocio en `routes/` ni en `controllers/`.
- No importar `repositories/` desde `controllers/` (va por `services/`).
- No usar `console.log` para debug. En el código de la app solo se permite
  `process.stdout`/`process.stderr` en `server.js` (arranque) y en
  `manejadorErrores.js` (errores 500); `scripts/smoke.js` los usa para reportar
  su resultado.
- No devolver HTML, CSS ni plantillas: es una API JSON.
- No añadir persistencia real, autenticación ni filtros hasta que una tarea lo
  pida en `feature_list.json`.
- No crear un sistema de configuración: `process.env` directo, solo lo
  necesario (por ejemplo `PORT`).
- No escribir tests con framework. La verificación es lint + smoke
  (`scripts/smoke.js`).

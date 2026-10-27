// Smoke ejecutable: levanta la app en un puerto efímero y comprueba cada
// endpoint (status, Content-Type, body y casos de error). Node nativo only.
// Corre contra la BD real (contrato del DDL oficial): garantiza el esquema y
// limpia producto CASCADE al arrancar.
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { crearApp } from '../src/app.js'
import { pool } from '../src/repositories/pool.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Determinismo: esquema idempotente + limpieza de producto (ON DELETE CASCADE
// derrama sobre variante, valor_variante e imagenes_variante).
await pool.query(await readFile(join(raiz, 'db', 'schema.sql'), 'utf8'))
await pool.query('DELETE FROM producto')

const servidor = crearApp().listen(0)

async function fetchJson(base, ruta, opciones) {
  const res = await fetch(base + ruta, opciones)
  const texto = await res.text()
  let body
  try {
    body = JSON.parse(texto)
  } catch {
    body = texto
  }
  return { res, body }
}

function verificar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje)
}

try {
  await once(servidor, 'listening')
  const { port } = servidor.address()
  const base = `http://127.0.0.1:${port}`

  // GET colección vacía
  {
    const { res, body } = await fetchJson(base, '/productos')
    verificar(res.status === 200, `GET /productos esperaba 200, recibió ${res.status}`)
    verificar(
      res.headers.get('content-type') === 'application/json; charset=utf-8',
      `GET /productos content-type incorrecto: ${res.headers.get('content-type')}`,
    )
    verificar(Array.isArray(body) && body.length === 0, 'GET /productos debería devolver array vacío')
  }

  // POST producto 201: sin precioUnitario ni fotos (precio derivado null)
  let creado
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Mate imperial', descripcion: 'Mate de calabaza', marca: 'Justina' }),
    })
    verificar(res.status === 201, `POST /productos esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.id.length > 0, 'POST /productos debería devolver id string')
    verificar(body.nombre === 'Mate imperial' && body.marca === 'Justina', 'POST /productos debería devolver nombre y marca')
    verificar(body.precioUnitario === null, 'el producto sin variantes debería exponer precioUnitario null')
    verificar(body.estado === 'activo', 'POST /productos debería default a estado "activo"')
    verificar(!Number.isNaN(Date.parse(body.creadoEn)) && body.creadoEn.endsWith('Z'), 'creadoEn debería ser ISO UTC')
    verificar(body.actualizadoEn === body.creadoEn, 'actualizadoEn debería coincidir con creadoEn al crear')
    verificar(Array.isArray(body.variantes) && body.variantes.length === 0, 'el producto debería exponer array variantes vacío')
    creado = body
  }

  // POST producto con defaults
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Otro producto' }),
    })
    verificar(res.status === 201, `POST /productos con defaults esperaba 201, recibió ${res.status}`)
    verificar(body.marca === null, 'marca debería default a null')
  }

  // GET colección con datos (incluye el segundo)
  {
    const { res, body } = await fetchJson(base, '/productos')
    verificar(res.status === 200, `GET /productos esperaba 200, recibió ${res.status}`)
    verificar(Array.isArray(body) && body.length === 2, `GET /productos debería tener 2 productos, tiene ${body.length}`)
  }

  // GET por id con variantes default []
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(res.status === 200, `GET /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.id === creado.id && body.nombre === 'Mate imperial', 'GET /productos/:id debería devolver el producto creado')
    verificar(Array.isArray(body.variantes) && body.variantes.length === 0, 'GET /productos/:id debería incluir variantes como array vacío por defecto')
  }

  // POST sin nombre → 400
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marca: 'X' }),
    })
    verificar(res.status === 400, `POST /productos sin nombre esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string' && body.error.length > 0, 'POST sin nombre debería devolver { "error": "..." }')
  }

  // POST estado inválido → 400
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'X', estado: 'pausado' }),
    })
    verificar(res.status === 400, `POST con estado inválido esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'POST con estado inválido debería devolver { "error": "..." }')
  }

  // GET id inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/productos/999999')
    verificar(res.status === 404, `GET /productos/:id inexistente esperaba 404, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'GET id inexistente debería devolver { "error": "..." }')
  }

  // POST variante 201 con atributos y fotos
  let primeraVariante
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'MATE-IMP-001',
        stock: 5,
        precioUnitario: 15000.5,
        atributos: [{ nombre: 'color', valor: 'verde' }, { nombre: 'capacidad', valor: 'pequenio' }],
        fotos: [{ url: 'https://ejemplo.com/mate-1.png' }, { url: 'https://ejemplo.com/mate-2.png', esPrincipal: true }],
      }),
    })
    verificar(res.status === 201, `POST /productos/:id/variantes esperaba 201, recibió ${res.status}`)
    verificar(
      res.headers.get('content-type') === 'application/json; charset=utf-8',
      `POST variantes content-type incorrecto: ${res.headers.get('content-type')}`,
    )
    verificar(typeof body.id === 'string' && body.id.length > 0, 'la variante debería tener id string')
    verificar(body.sku === 'MATE-IMP-001' && body.stock === 5 && body.precioUnitario === 15000.5, 'la variante debería devolver sku, stock y precioUnitario')
    verificar(Array.isArray(body.atributos) && body.atributos.length === 2, 'la variante debería devolver sus atributos')
    verificar(Array.isArray(body.fotos) && body.fotos.length === 2, 'la variante debería devolver sus fotos')
    verificar(body.fotos.filter((foto) => foto.esPrincipal).length === 1, 'solo una foto principal')
    verificar(body.fotos[1].esPrincipal === true && body.fotos[0].esPrincipal === false, 'la foto marcada como principal debería conservarse')
    primeraVariante = body
  }

  // El producto ahora deriva precioUnitario = min de variantes
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(res.status === 200, `GET /productos/:id tras variante esperaba 200, recibió ${res.status}`)
    verificar(body.precioUnitario === 15000.5, `el producto debería exponer precioUnitario derivado mínimo, recibió ${body.precioUnitario}`)
    verificar(Array.isArray(body.variantes) && body.variantes.length === 1, 'el producto debería incluir la variante en su array variantes')
    verificar(body.variantes[0].id === primeraVariante.id, 'la variante del producto debería coincidir con la creada')
    verificar(Array.isArray(body.variantes[0].atributos) && body.variantes[0].atributos.length === 2, 'la variante embebida debería incluir atributos')
    verificar(Array.isArray(body.variantes[0].fotos) && body.variantes[0].fotos.length === 2, 'la variante embebida debería incluir fotos')
  }

  // POST variante con otro precio: el mínimo manda
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-IMP-002', stock: 2, precioUnitario: 12000, atributos: [] }),
    })
    verificar(res.status === 201, `POST variante con precio menor esperaba 201, recibió ${res.status}`)
    verificar(body.id !== primeraVariante.id, 'cada variante debería tener un id distinto')
    const { res: resGet, body: bodyGet } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(resGet.status === 200 && bodyGet.precioUnitario === 12000, 'el producto debería exponer el mínimo de sus variantes')
  }

  // POST variante sin sku → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: 1, precioUnitario: 10 }),
    })
    verificar(res.status === 400, `POST variante sin sku esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string' && body.error.length > 0, 'variante sin sku debería devolver { "error": "..." }')
  }

  // POST variante con stock < 0 → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-X1', stock: -1, precioUnitario: 10 }),
    })
    verificar(res.status === 400, `POST variante con stock negativo esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'variante con stock negativo debería devolver { "error": "..." }')
  }

  // POST variante sin precioUnitario → 400 (obligatorio, sin herencia)
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-X2', stock: 1 }),
    })
    verificar(res.status === 400, `POST variante sin precioUnitario esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'variante sin precioUnitario debería devolver { "error": "..." }')
  }

  // POST variante con precioUnitario <= 0 → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-X3', stock: 1, precioUnitario: 0 }),
    })
    verificar(res.status === 400, `POST variante con precioUnitario 0 esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'variante con precioUnitario 0 debería devolver { "error": "..." }')
  }

  // POST variante sku duplicado → 409
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-IMP-001', stock: 1, precioUnitario: 10 }),
    })
    verificar(res.status === 409, `POST variante con sku duplicado esperaba 409, recibió ${res.status}`)
    verificar(typeof body.error === 'string' && body.error.length > 0, 'sku duplicado debería devolver { "error": "..." }')
  }

  // POST variante sobre producto inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/productos/999999/variantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'MATE-X4', stock: 1, precioUnitario: 10 }),
    })
    verificar(res.status === 404, `POST variante sobre producto inexistente esperaba 404, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'variante sobre producto inexistente debería devolver { "error": "..." }')
  }

  // PATCH válido: nombre, marca y estado, con actualizadoEn refrescado
  {
    const antes = Date.now()
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Mate imperial grande', marca: 'Justina Sur', estado: 'inactivo' }),
    })
    verificar(res.status === 200, `PATCH /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.nombre === 'Mate imperial grande' && body.marca === 'Justina Sur' && body.estado === 'inactivo', 'PATCH debería aplicar los cambios')
    verificar(body.descripcion === 'Mate de calabaza', 'PATCH no debería tocar campos no enviados')
    verificar(body.precioUnitario === 12000, 'PATCH no debería descartar el precio derivado')
    const actualizado = Date.parse(body.actualizadoEn)
    verificar(!Number.isNaN(actualizado) && body.actualizadoEn.endsWith('Z'), 'actualizadoEn debería ser ISO UTC')
    verificar(actualizado >= antes, 'PATCH debería refrescar actualizadoEn')
  }

  // PATCH con campo no editable → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precioUnitario: 20000 }),
    })
    verificar(res.status === 400, `PATCH con campo no editable esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string' && body.error.length > 0, 'PATCH con campo no editable debería devolver { "error": "..." }')
  }

  // PATCH con estado inválido → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'congelado' }),
    })
    verificar(res.status === 400, `PATCH con estado inválido esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'PATCH con estado inválido debería devolver { "error": "..." }')
  }

  // PATCH id inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/productos/999999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'X' }),
    })
    verificar(res.status === 404, `PATCH id inexistente esperaba 404, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'PATCH id inexistente debería devolver { "error": "..." }')
  }

  // PATCH reactiva (baja/realta) para que el DELETE de baja lógica se observe
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'activo' }),
    })
    verificar(res.status === 200 && body.estado === 'activo', 'PATCH debería poder reactivar el producto')
  }

  // DELETE → 204 sin body, baja lógica
  {
    const res = await fetch(base + `/productos/${creado.id}`, { method: 'DELETE' })
    verificar(res.status === 204, `DELETE /productos/:id esperaba 204, recibió ${res.status}`)
    verificar((await res.text()) === '', 'DELETE debería responder sin cuerpo')
    const { res: resGet, body: bodyGet } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(resGet.status === 200, 'el producto debería seguir existiendo tras DELETE')
    verificar(bodyGet.estado === 'inactivo', 'DELETE debería dejar el estado en "inactivo" (persistido)')
  }

  // Ruta inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/ruta-inexistente')
    verificar(res.status === 404, `ruta inexistente esperaba 404, recibió ${res.status}`)
    verificar(body.error === 'Ruta no encontrada', 'ruta inexistente debería devolver "Ruta no encontrada"')
  }

  process.stdout.write('[OK] smoke: productos/variantes sobre el DDL oficial (POST/GET/GET:id/PATCH/DELETE, atributos, fotos, precio derivado) y 400/404/409 verificados\n')
} catch (error) {
  process.stderr.write(`[FAIL] smoke: ${error.message}\n`)
  process.exitCode = 1
} finally {
  await new Promise((resolve) => servidor.close(resolve))
  await pool.end()
}

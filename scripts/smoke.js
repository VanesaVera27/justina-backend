// Smoke ejecutable: levanta la app en un puerto efímero y comprueba cada
// endpoint (status, Content-Type, body y casos de error). Node nativo only.
// Corre contra la BD real (contrato del DDL oficial): garantiza el esquema y
// limpia producto CASCADE al arrancar.
import { once } from 'node:events'
import { readFile, readdir, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { crearApp } from '../src/app.js'
import { pool } from '../src/repositories/pool.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let imagenSubida
const imagenesVariantesSubidas = []
const contenidoImagenPrueba = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
  'base64',
)

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

  // POST /imagenes guarda y publica el archivo recibido
  {
    const formulario = new FormData()
    const contenido = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
      'base64',
    )
    formulario.append('archivo', new Blob([contenido], { type: 'image/png' }), 'prueba.png')
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    verificar(res.status === 201, `POST /imagenes esperaba 201, recibió ${res.status}`)
    verificar(typeof body.url === 'string' && body.url.startsWith('/uploads/'), 'POST /imagenes debería devolver la URL pública')
    verificar(body.nombre === 'prueba.png', 'POST /imagenes debería conservar y devolver el nombre original')
    imagenSubida = body.url

    const imagenPublicada = await fetch(base + body.url)
    verificar(imagenPublicada.status === 200, 'la URL devuelta debería servir la imagen')
    verificar(imagenPublicada.headers.get('content-type') === 'image/png', 'la URL debería conservar el tipo de imagen')
    verificar(Buffer.compare(Buffer.from(await imagenPublicada.arrayBuffer()), contenido) === 0, 'la imagen publicada debería conservar el contenido')
  }

  {
    const formulario = new FormData()
    formulario.append(
      'archivo',
      new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }),
      'prueba.png',
    )
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    verificar(res.status === 409 && typeof body.error === 'string', 'POST /imagenes con nombre duplicado debería responder 409')
  }

  // POST sin archivo → 400
  {
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: new FormData() })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /imagenes sin archivo debería responder 400')
  }

  // POST con tipo no permitido → 400
  {
    const formulario = new FormData()
    formulario.append('archivo', new Blob(['no es imagen'], { type: 'text/plain' }), 'archivo.txt')
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /imagenes con tipo no permitido debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('archivo', new Blob(['no es PNG'], { type: 'image/png' }), 'archivo.png')
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /imagenes con firma de imagen inválida debería responder 400')
  }

  {
    const contenido = Buffer.alloc(10 * 1024 * 1024 + 1)
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(contenido)
    const formulario = new FormData()
    formulario.append('archivo', new Blob([contenido], { type: 'image/png' }), 'grande.png')
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    verificar(res.status === 413 && typeof body.error === 'string', 'POST /imagenes sobre 10 MB debería responder 413')
  }

  {
    const { res, body } = await fetchJson(base, '/imagenes', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'formulario invalido',
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /imagenes con multipart inválido debería responder 400')
  }

  const nombreCategoria = `smoke-${Date.now()}`
  let categoriaCreada
  {
    const { res, body } = await fetchJson(base, '/categorias')
    verificar(res.status === 200, `GET /categorias esperaba 200, recibió ${res.status}`)
    verificar(Array.isArray(body), 'GET /categorias debería devolver un array')
  }

  // POST categoría con los valores destacados requeridos por el contrato
  {
    const { res, body } = await fetchJson(base, '/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreCategoria, esDestacada: true }),
    })
    verificar(res.status === 201, `POST /categorias esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.id.length > 0, 'la categoría debería tener id string')
    verificar(body.nombre === nombreCategoria && body.esDestacada === true, 'POST /categorias debería devolver los campos enviados')
    categoriaCreada = body
  }

  {
    const { res, body } = await fetchJson(base, '/categorias')
    verificar(
      res.status === 200 && body.some((categoria) => categoria.id === categoriaCreada.id),
      'GET /categorias debería incluir la categoría creada',
    )
  }

  // POST categoría sin nombre → 400
  {
    const { res, body } = await fetchJson(base, '/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esDestacada: false }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /categorias sin nombre debería responder 400 con error')
  }

  {
    const { res, body } = await fetchJson(base, '/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'smoke-invalida', esDestacada: null }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /categorias con esDestacada null debería responder 400')
  }

  // PATCH categoría
  {
    const { res, body } = await fetchJson(base, `/categorias/${categoriaCreada.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: `${nombreCategoria}-editada`, esDestacada: false }),
    })
    verificar(res.status === 200, `PATCH /categorias/:id esperaba 200, recibió ${res.status}`)
    verificar(body.nombre === `${nombreCategoria}-editada` && body.esDestacada === false, 'PATCH /categorias debería devolver los cambios')
  }

  {
    const { res, body } = await fetchJson(base, `/categorias/${categoriaCreada.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esDestacada: 'false' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH /categorias con esDestacada inválido debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, '/categorias/999999999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Inexistente' }),
    })
    verificar(res.status === 404 && typeof body.error === 'string', 'PATCH /categorias inexistente debería responder 404')
  }

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
      body: JSON.stringify({
        nombre: 'Mate imperial',
        descripcion: 'Mate de calabaza',
        marca: 'Justina',
        categoriaId: categoriaCreada.id,
      }),
    })
    verificar(res.status === 201, `POST /productos esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.id.length > 0, 'POST /productos debería devolver id string')
    verificar(body.nombre === 'Mate imperial' && body.marca === 'Justina', 'POST /productos debería devolver nombre y marca')
    verificar(body.precioUnitario === null, 'el producto sin variantes debería exponer precioUnitario null')
    verificar(body.categoriaId === categoriaCreada.id, 'POST /productos debería devolver categoriaId')
    verificar(body.fotoPortadaUrl === null, 'el producto nuevo debería exponer fotoPortadaUrl null')
    verificar(body.estado === 'activo', 'POST /productos debería default a estado "activo"')
    verificar(!Number.isNaN(Date.parse(body.creadoEn)) && body.creadoEn.endsWith('Z'), 'creadoEn debería ser ISO UTC')
    verificar(body.actualizadoEn === body.creadoEn, 'actualizadoEn debería coincidir con creadoEn al crear')
    verificar(Array.isArray(body.variantes) && body.variantes.length === 0, 'el producto debería exponer array variantes vacío')
    creado = body
  }

  // POST producto con defaults
  let otroProducto
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Otro producto' }),
    })
    verificar(res.status === 201, `POST /productos con defaults esperaba 201, recibió ${res.status}`)
    verificar(body.marca === null, 'marca debería default a null')
    verificar(body.categoriaId === null, 'categoriaId debería default a null')
    otroProducto = body
  }

  // GET colección con datos (incluye el segundo)
  {
    const { res, body } = await fetchJson(base, '/productos')
    verificar(res.status === 200, `GET /productos esperaba 200, recibió ${res.status}`)
    verificar(Array.isArray(body) && body.length === 2, `GET /productos debería tener 2 productos, tiene ${body.length}`)
    verificar(body.find((producto) => producto.id === creado.id)?.categoriaId === categoriaCreada.id, 'GET /productos debería incluir categoriaId')
  }

  // GET por id con variantes default []
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(res.status === 200, `GET /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.id === creado.id && body.nombre === 'Mate imperial', 'GET /productos/:id debería devolver el producto creado')
    verificar(body.categoriaId === categoriaCreada.id, 'GET /productos/:id debería incluir categoriaId')
    verificar(body.fotoPortadaUrl === null, 'GET /productos/:id debería incluir fotoPortadaUrl null')
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
    const formulario = new FormData()
    formulario.append('sku', 'MATE-IMP-001')
    formulario.append('stock', '5')
    formulario.append('precioUnitario', '15000.5')
    formulario.append('atributos', JSON.stringify([
      { nombre: 'color', valor: 'verde' },
      { nombre: 'capacidad', valor: 'pequenio' },
    ]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'frente.png')
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'lateral.png')
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      body: formulario,
    })
    verificar(res.status === 201, `POST /productos/:id/variantes esperaba 201, recibió ${res.status}`)
    verificar(
      res.headers.get('content-type') === 'application/json; charset=utf-8',
      `POST variantes content-type incorrecto: ${res.headers.get('content-type')}`,
    )
    verificar(typeof body.id === 'string' && body.id.length > 0, 'la variante debería tener id string')
    verificar(body.sku === 'MATE-IMP-001' && body.stock === 5 && body.precioUnitario === 15000.5, 'la variante debería devolver sku, stock y precioUnitario')
    verificar(Array.isArray(body.atributos) && body.atributos.length === 2, 'la variante debería devolver sus atributos')
    verificar(
      body.atributos.some((atributo) => atributo.nombre === 'color' && atributo.valor === 'verde'),
      'POST variante debería devolver el nombre y valor originales del atributo',
    )
    verificar(Array.isArray(body.fotos) && body.fotos.length === 2, 'la variante debería devolver sus fotos')
    verificar(body.fotos.filter((foto) => foto.esPrincipal).length === 1, 'solo una foto principal')
    verificar(body.fotos[0].esPrincipal === true && body.fotos[1].esPrincipal === false, 'la primera foto subida debería ser la principal')
    verificar(body.fotos.every((foto) => /^\/uploads\/productos\/[a-f0-9-]+\.png$/.test(foto.url)), 'las fotos deberían tener URLs locales seguras')
    imagenesVariantesSubidas.push(...body.fotos.map((foto) => basename(new URL(foto.url, base).pathname)))
    const fotosPersistidas = await pool.query(
      'SELECT url, es_principal FROM imagenes_variante WHERE id_variante = $1 ORDER BY id_imagen',
      [body.id],
    )
    verificar(
      fotosPersistidas.rows.length === body.fotos.length &&
        fotosPersistidas.rows.every((foto, indice) => (
          foto.url === body.fotos[indice].url &&
          foto.es_principal === body.fotos[indice].esPrincipal
        )),
      'la base debería guardar la URL y es_principal de cada imagen de la variante',
    )
    for (const foto of body.fotos) {
      const imagen = await fetch(base + foto.url)
      verificar(
        imagen.status === 200 && imagen.headers.get('content-type') === 'image/png',
        'la URL de cada foto de variante debería servir la imagen local',
      )
      verificar(
        Buffer.compare(Buffer.from(await imagen.arrayBuffer()), contenidoImagenPrueba) === 0,
        'la imagen servida debería conservar el contenido subido',
      )
    }
    primeraVariante = body
  }

  // PATCH sin archivos conserva las fotos existentes.
  {
    const formulario = new FormData()
    formulario.append('stock', '6')
    formulario.append('atributos', JSON.stringify([
      { nombre: 'color', valor: 'verde' },
      { nombre: 'capacidad', valor: 'pequenio' },
    ]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200 && body.stock === 6, 'PATCH multipart debería actualizar los campos enviados')
    verificar(
      body.fotos.length === 2 &&
        body.fotos.every((foto, indice) => foto.url === primeraVariante.fotos[indice].url),
      'PATCH sin archivos debería conservar las fotos actuales',
    )
    primeraVariante = body
  }

  {
    const urlPortada = primeraVariante.fotos[0].url
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: urlPortada }),
    })
    verificar(res.status === 200 && body.fotoPortadaUrl === urlPortada, 'PATCH debería guardar una foto de variante como portada')
    const { body: productoListado } = await fetchJson(base, '/productos')
    verificar(
      productoListado.find((producto) => producto.id === creado.id)?.fotoPortadaUrl === urlPortada,
      'GET /productos debería exponer fotoPortadaUrl',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: '/uploads/productos/no-pertenece.png' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH con foto ajena al producto debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: null }),
    })
    verificar(res.status === 200 && body.fotoPortadaUrl === null, 'PATCH fotoPortadaUrl null debería activar la selección automática')
  }

  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: primeraVariante.fotos[0].url }),
    })
    verificar(res.status === 200 && body.fotoPortadaUrl === primeraVariante.fotos[0].url, 'PATCH debería permitir restaurar una portada válida')
  }

  // PATCH con archivos reemplaza las fotos anteriores.
  {
    const formulario = new FormData()
    formulario.append('sku', 'MATE-IMP-001')
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'reemplazo.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200, `PATCH variante con archivo esperaba 200, recibió ${res.status}`)
    verificar(body.fotos.length === 1 && body.fotos[0].esPrincipal, 'PATCH con archivos debería reemplazar las fotos por las enviadas')
    verificar(body.fotos[0].url !== primeraVariante.fotos[0].url, 'PATCH debería devolver una nueva URL de archivo')
    imagenesVariantesSubidas.push(basename(new URL(body.fotos[0].url, base).pathname))
    primeraVariante = body
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', new Blob(['no es imagen'], { type: 'text/plain' }), 'invalida.txt')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH variante con tipo de archivo inválido debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', new Blob(['no es PNG'], { type: 'image/png' }), 'firma-invalida.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH variante con firma inválida debería responder 400')
  }

  {
    const contenidoGrande = Buffer.alloc(10 * 1024 * 1024 + 1)
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(contenidoGrande)
    const formulario = new FormData()
    formulario.append('fotos', new Blob([contenidoGrande], { type: 'image/png' }), 'grande.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 413 && typeof body.error === 'string', 'PATCH variante sobre 10 MB debería responder 413')
  }

  {
    const formulario = new FormData()
    formulario.append('sku', 'MATE-ATRIBUTOS-INVALIDOS')
    formulario.append('atributos', '{json invalido')
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'valida.png')
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      body: formulario,
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST variante con atributos JSON inválidos debería responder 400')
  }

  // PATCH de variante inexistente → 404.
  {
    const formulario = new FormData()
    formulario.append('stock', '3')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/999999999`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 404 && typeof body.error === 'string', 'PATCH variante inexistente debería responder 404')
  }

  // El producto ahora deriva precioUnitario = min de variantes
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(res.status === 200, `GET /productos/:id tras variante esperaba 200, recibió ${res.status}`)
    verificar(body.precioUnitario === 15000.5, `el producto debería exponer precioUnitario derivado mínimo, recibió ${body.precioUnitario}`)
    verificar(Array.isArray(body.variantes) && body.variantes.length === 1, 'el producto debería incluir la variante en su array variantes')
    verificar(body.variantes[0].id === primeraVariante.id, 'la variante del producto debería coincidir con la creada')
    verificar(Array.isArray(body.variantes[0].atributos) && body.variantes[0].atributos.length === 2, 'la variante embebida debería incluir atributos')
    verificar(
      body.variantes[0].atributos.some((atributo) => atributo.nombre === 'color' && atributo.valor === 'verde'),
      'la variante embebida debería conservar el nombre y valor del atributo',
    )
    verificar(Array.isArray(body.variantes[0].fotos) && body.variantes[0].fotos.length === 1, 'la variante embebida debería incluir las fotos reemplazadas')
  }

  {
    const { res, body } = await fetchJson(base, '/productos')
    const productoListado = body.find((producto) => producto.id === creado.id)
    verificar(res.status === 200 && productoListado, 'GET /productos debería incluir el producto con variante')
    verificar(
      productoListado.variantes[0].atributos.some((atributo) => atributo.nombre === 'color' && atributo.valor === 'verde'),
      'GET /productos debería conservar nombre y valor de los atributos',
    )
    verificar(productoListado.variantes[0].fotos.length === 1, 'GET /productos debería incluir las fotos reemplazadas de la variante')
    verificar(productoListado.fotoPortadaUrl === null, 'reemplazar la foto de portada debería volver a selección automática')
  }

  // PATCH de variante con galería final: conserva una foto existente y agrega
  // un archivo nuevo referenciado por índice base 0.
  const fotoExistente = primeraVariante.fotos[0].url
  let fotoNueva
  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([
      { url: fotoExistente, esPrincipal: true },
      { archivo: 0, esPrincipal: false },
    ]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'galeria-nueva.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200, `PATCH galería mixta esperaba 200, recibió ${res.status}`)
    verificar(body.fotos.length === 2, 'la galería mixta debería devolver dos fotos')
    verificar(
      body.fotos[0].url === fotoExistente && body.fotos[0].esPrincipal === true,
      'la galería mixta debería conservar la foto existente como principal',
    )
    verificar(
      body.fotos[1].url.startsWith('/uploads/productos/') && body.fotos[1].url !== fotoExistente,
      'la galería mixta debería incluir la URL del archivo nuevo',
    )
    verificar(body.fotos[1].esPrincipal === false, 'la foto nueva no debería ser principal sin marcarse')
    fotoNueva = body.fotos[1].url
    imagenesVariantesSubidas.push(basename(new URL(fotoNueva, base).pathname))
    const filas = await pool.query(
      'SELECT url, es_principal FROM imagenes_variante WHERE id_variante = $1 ORDER BY id_imagen',
      [primeraVariante.id],
    )
    verificar(filas.rows.length === 2, 'la base debería contener exactamente las dos fotos de la galería')
    verificar(
      filas.rows[0].url === fotoExistente && filas.rows[0].es_principal === true,
      'la base debería conservar la foto existente como principal',
    )
    verificar(
      filas.rows[1].url === fotoNueva && filas.rows[1].es_principal === false,
      'la base debería persistir la foto nueva de la galería',
    )
    const imagen = await fetch(base + fotoNueva)
    verificar(
      imagen.status === 200 && imagen.headers.get('content-type') === 'image/png',
      'la foto nueva de la galería debería servirse desde /uploads/productos',
    )
    primeraVariante = body
  }

  // Sin esPrincipal explícito, la primera foto de la galería queda principal;
  // conservar la foto de portada no la cambia.
  let fotoReferenciada
  {
    const { res: resPortada } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: fotoExistente }),
    })
    verificar(resPortada.status === 200, 'se debería poder marcar una foto de la galería como portada')

    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([
      { url: fotoNueva },
      { url: fotoExistente },
    ]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200, `PATCH galería sin principal esperaba 200, recibió ${res.status}`)
    verificar(
      body.fotos[0].url === fotoNueva && body.fotos[0].esPrincipal === true,
      'la primera foto de la galería debería quedar como principal por defecto',
    )
    verificar(
      body.fotos[1].url === fotoExistente && body.fotos[1].esPrincipal === false,
      'la galería no debería tener más de una foto principal',
    )
    const filas = await pool.query(
      'SELECT url, es_principal FROM imagenes_variante WHERE id_variante = $1 ORDER BY id_imagen',
      [primeraVariante.id],
    )
    verificar(filas.rows.length === 2 && filas.rows.filter((fila) => fila.es_principal).length === 1, 'la base debería guardar una sola principal')
    const { body: producto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(producto.fotoPortadaUrl === fotoExistente, 'conservar la foto de portada en la galería no debería cambiarla')
    primeraVariante = body
  }

  // La galería puede omitir fotos existentes y descartar archivos no referenciados.
  {
    const antes = new Set(await readdir(join(raiz, 'uploads', 'productos')))
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([
      { url: fotoNueva, esPrincipal: true },
      { archivo: 0 },
    ]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'galeria-referenciada.png')
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'galeria-huerfana.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200, `PATCH galería con omisión esperaba 200, recibió ${res.status}`)
    verificar(
      body.fotos.length === 2 && body.fotos[0].url === fotoNueva && body.fotos[0].esPrincipal === true,
      'la galería debería conservar la foto incluida y su orden',
    )
    fotoReferenciada = body.fotos[1].url
    imagenesVariantesSubidas.push(basename(new URL(fotoReferenciada, base).pathname))

    const filas = await pool.query(
      'SELECT url, es_principal FROM imagenes_variante WHERE id_variante = $1 ORDER BY id_imagen',
      [primeraVariante.id],
    )
    verificar(filas.rows.length === 2, 'la base debería contener solo las fotos incluidas en la galería')
    verificar(
      !filas.rows.some((fila) => fila.url === fotoExistente),
      'la foto omitida debería borrarse de imagenes_variante',
    )
    verificar(
      filas.rows[1].url === fotoReferenciada,
      'la foto referenciada por índice debería persistir en la base',
    )

    const despues = new Set(await readdir(join(raiz, 'uploads', 'productos')))
    const nuevas = [...despues].filter((nombre) => !antes.has(nombre))
    verificar(
      nuevas.length === 1 && nuevas[0] === basename(new URL(fotoReferenciada, base).pathname),
      'el archivo no referenciado debería descartarse del disco',
    )

    const { body: producto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(producto.fotoPortadaUrl === null, 'eliminar la foto de portada de la galería debería limpiarla')
    primeraVariante = body
  }

  // Errores de la galería: pertenencia, índices, referencias y principal única.
  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ url: '/uploads/productos/ajena.png' }]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'una url ajena a la variante debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ archivo: 1 }]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'indice-fuera.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'un índice de archivo fuera de rango debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ archivo: 0 }, { archivo: 0 }]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'indice-repetido.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'un índice de archivo repetido debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ url: fotoNueva, archivo: 0 }]))
    formulario.append('fotos', new Blob([contenidoImagenPrueba], { type: 'image/png' }), 'url-y-archivo.png')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'una referencia con url y archivo a la vez debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([
      { url: fotoNueva, esPrincipal: true },
      { url: fotoReferenciada, esPrincipal: true },
    ]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'más de una foto principal debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ url: fotoNueva }, { url: fotoNueva }]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'una url de foto repetida debería responder 400')
  }

  {
    const formulario = new FormData()
    formulario.append('fotos', JSON.stringify([{ url: fotoNueva, esPrincipal: 'si' }]))
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 400 && typeof body.error === 'string', 'esPrincipal no booleano debería responder 400')
  }

  // fotos: [] elimina todas las fotos y limpia la portada.
  {
    const { res: resPortada } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: fotoNueva }),
    })
    verificar(resPortada.status === 200, 'se debería poder marcar la foto principal como portada antes de vaciar la galería')
    const formulario = new FormData()
    formulario.append('fotos', '[]')
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${primeraVariante.id}`,
      { method: 'PATCH', body: formulario },
    )
    verificar(res.status === 200, `PATCH fotos: [] esperaba 200, recibió ${res.status}`)
    verificar(Array.isArray(body.fotos) && body.fotos.length === 0, 'fotos: [] debería devolver la variante sin fotos')
    const filas = await pool.query(
      'SELECT url FROM imagenes_variante WHERE id_variante = $1',
      [primeraVariante.id],
    )
    verificar(filas.rows.length === 0, 'fotos: [] debería borrar todas las filas de imagenes_variante')
    const { body: producto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(producto.fotoPortadaUrl === null, 'vaciar la galería debería limpiar la foto de portada')
    primeraVariante = body
  }

  // POST variante por nombre encuentra la imagen cargada localmente
  let varianteLocal
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'MATE-IMP-LOCAL',
        stock: 1,
        precioUnitario: 13000,
        fotos: [{ nombre: 'prueba.png', esPrincipal: true }],
      }),
    })
    verificar(res.status === 201, `POST variante con nombre de imagen local esperaba 201, recibió ${res.status}`)
    verificar(
      body.fotos.length === 1 && body.fotos[0].url === imagenSubida && body.fotos[0].esPrincipal,
      'la variante debería devolver la URL local de la imagen buscada por nombre',
    )
    varianteLocal = body
  }

  {
    const { res, body } = await fetchJson(
      base,
      `/productos/${otroProducto.id}/variantes/${varianteLocal.id}`,
      { method: 'DELETE' },
    )
    verificar(res.status === 404 && typeof body.error === 'string', 'no se debería eliminar una variante desde otro producto')
    const { body: producto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(
      producto.variantes.some((variante) => variante.id === varianteLocal.id),
      'la variante debe seguir asociada a su producto tras el DELETE con producto incorrecto',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fotoPortadaUrl: varianteLocal.fotos[0].url }),
    })
    verificar(res.status === 200 && body.fotoPortadaUrl === varianteLocal.fotos[0].url, 'la foto de otra variante del producto también puede ser portada')
  }

  // DELETE variante elimina solo la variante indicada para el producto.
  {
    const res = await fetch(
      `${base}/productos/${creado.id}/variantes/${varianteLocal.id}`,
      { method: 'DELETE' },
    )
    verificar(res.status === 204, `DELETE variante esperaba 204, recibió ${res.status}`)
    verificar((await res.text()) === '', 'DELETE variante debería responder sin cuerpo')
    const { res: resProducto, body: bodyProducto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(resProducto.status === 200, 'el producto debería seguir existiendo tras eliminar una variante')
    verificar(
      !bodyProducto.variantes.some((variante) => variante.id === varianteLocal.id),
      'la variante eliminada no debería aparecer en el producto',
    )
    verificar(bodyProducto.fotoPortadaUrl === null, 'eliminar la variante que aporta la portada debería limpiarla')
  }

  {
    const { res, body } = await fetchJson(
      base,
      `/productos/${creado.id}/variantes/${varianteLocal.id}`,
      { method: 'DELETE' },
    )
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE variante inexistente debería responder 404')
  }

  // POST variante con nombre de imagen inexistente → 404
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'MATE-IMP-AUSENTE',
        stock: 1,
        precioUnitario: 10000,
        fotos: [{ nombre: 'no-existe.png' }],
      }),
    })
    verificar(res.status === 404 && typeof body.error === 'string', 'variante con imagen local inexistente debería responder 404')
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

  // POST variante con ruta en nombre de foto → 400.
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'MATE-FOTO-RUTA',
        stock: 1,
        precioUnitario: 10,
        fotos: [{ nombre: '../producto.png' }],
      }),
    })
    verificar(res.status === 400, `POST variante con ruta de foto esperaba 400, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'la ruta en nombre de foto debería devolver { "error": "..." }')
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
      body: JSON.stringify({
        nombre: 'Mate imperial grande',
        marca: 'Justina Sur',
        estado: 'inactivo',
        categoriaId: categoriaCreada.id,
      }),
    })
    verificar(res.status === 200, `PATCH /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.nombre === 'Mate imperial grande' && body.marca === 'Justina Sur' && body.estado === 'inactivo', 'PATCH debería aplicar los cambios')
    verificar(body.descripcion === 'Mate de calabaza', 'PATCH no debería tocar campos no enviados')
    verificar(body.categoriaId === categoriaCreada.id, 'PATCH debería devolver categoriaId')
    verificar(body.precioUnitario === 12000, 'PATCH no debería descartar el precio derivado')
    const actualizado = Date.parse(body.actualizadoEn)
    verificar(!Number.isNaN(actualizado) && body.actualizadoEn.endsWith('Z'), 'actualizadoEn debería ser ISO UTC')
    verificar(actualizado >= antes, 'PATCH debería refrescar actualizadoEn')
  }

  // PATCH permite desligar la categoría enviando null
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: null }),
    })
    verificar(res.status === 200 && body.categoriaId === null, 'PATCH categoriaId null debería quitar la categoría')
  }

  // categoriaId inválida → 400
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: 'no-es-un-id' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH con categoriaId inválida debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: '999999999' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH con categoriaId inexistente debería responder 400')
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

  {
    const { res, body } = await fetchJson(base, '/productos/999999999', { method: 'DELETE' })
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE producto inexistente debería responder 404')
  }

  // DELETE categoría asociada → 409, sin borrar ni desasociar productos
  {
    const { res: resAsociar, body: productoAsociado } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: categoriaCreada.id }),
    })
    verificar(
      resAsociar.status === 200 && productoAsociado.categoriaId === categoriaCreada.id,
      'se debería poder asociar el producto a la categoría antes de comprobar el conflicto',
    )
    const { res, body } = await fetchJson(base, `/categorias/${categoriaCreada.id}`, { method: 'DELETE' })
    verificar(res.status === 409, `DELETE categoría asociada esperaba 409, recibió ${res.status}`)
    verificar(typeof body.error === 'string', 'DELETE categoría asociada debería explicar el conflicto')
    const { body: producto } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(producto.categoriaId === categoriaCreada.id, 'el conflicto no debería quitar la categoría del producto')
  }

  // Una vez sin productos asociados, se puede borrar la categoría.
  {
    const { res: resDesasociar } = await fetchJson(base, `/productos/${creado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoriaId: null }),
    })
    verificar(resDesasociar.status === 200, 'se debería poder quitar la categoría del producto antes de borrarla')
    const res = await fetch(base + `/categorias/${categoriaCreada.id}`, { method: 'DELETE' })
    verificar(res.status === 204, `DELETE /categorias/:id esperaba 204, recibió ${res.status}`)
    verificar((await res.text()) === '', 'DELETE /categorias debería responder sin cuerpo')
    const { body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(body.categoriaId === null, 'el producto debería seguir sin categoría después del borrado')
    const relacion = await pool.query(
      'SELECT id_categoria FROM producto WHERE id_producto = $1',
      [creado.id],
    )
    verificar(relacion.rows[0].id_categoria === null, 'quitar categoría debería dejar id_categoria en NULL')
  }

  {
    const { res, body } = await fetchJson(base, '/categorias/999999999', { method: 'DELETE' })
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE /categorias inexistente debería responder 404')
  }

  // Ruta inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/ruta-inexistente')
    verificar(res.status === 404, `ruta inexistente esperaba 404, recibió ${res.status}`)
    verificar(body.error === 'Ruta no encontrada', 'ruta inexistente debería devolver "Ruta no encontrada"')
  }

  process.stdout.write('[OK] smoke: imágenes, categorías y productos/variantes sobre el DDL oficial; contratos, persistencia y errores verificados\n')
} catch (error) {
  process.stderr.write(`[FAIL] smoke: ${error.message}\n`)
  process.exitCode = 1
} finally {
  if (imagenSubida) {
    await unlink(join(raiz, 'uploads', basename(imagenSubida)))
  }
  await Promise.all(imagenesVariantesSubidas.map((nombre) => unlink(join(raiz, 'uploads', 'productos', nombre))))
  await new Promise((resolve) => servidor.close(resolve))
  await pool.end()
}

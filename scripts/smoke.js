// Smoke ejecutable: levanta la app en un puerto efímero y comprueba cada
// endpoint (status, Content-Type, body y casos de error). Node nativo only.
// Corre contra la BD configurada, conserva los datos previos y limpia solo
// los recursos que crea.
import { once } from 'node:events'
import { readFile, readdir, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { crearApp } from '../src/app.js'
import { pool } from '../src/repositories/pool.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
let imagenSubida
let categoriaPruebaId
let productoPruebaId
let otroProductoPruebaId
let usuarioPruebaId
let segundoUsuarioPruebaId
let pedidoPruebaId
let configuracionAdminId
let configuracionOriginal = []
const imagenesVariantesSubidas = []
const bannersPruebaIds = []
const usuariosPruebaIds = []
const direccionesPruebaIds = []
let bannerPruebaCreado = false
const sufijoPrueba = `${Date.now()}-${process.pid}`
const nombreProductoPrueba = `Mate imperial smoke-${sufijoPrueba}`
const nombreOtroProductoPrueba = `Otro producto smoke-${sufijoPrueba}`
const nombreImagenPrueba = `smoke-${sufijoPrueba}.png`
const skuPrimeraVariante = `SMOKE-${sufijoPrueba}-01`
const skuSegundaVariante = `SMOKE-${sufijoPrueba}-02`
const skuVarianteLocal = `SMOKE-${sufijoPrueba}-03`
const contenidoImagenPrueba = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
  'base64',
)

await pool.query(await readFile(join(raiz, 'db', 'schema.sql'), 'utf8'))

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

async function restaurarConfiguracionPrueba() {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    if (bannersPruebaIds.length > 0) {
      await cliente.query(
        'DELETE FROM banners WHERE id_banner = ANY($1::integer[])',
        [bannersPruebaIds],
      )
    }
    if (configuracionAdminId) {
      for (const fila of configuracionOriginal) {
        await cliente.query(
          `UPDATE configuracion_web
           SET valor = $2, fecha_modificacion = $3
           WHERE id_configuracion = $1`,
          [fila.id_configuracion, fila.valor, fila.fecha_modificacion],
        )
      }
      const idsOriginales = configuracionOriginal.map((fila) => fila.id_configuracion)
      const temporales = await cliente.query(
        `SELECT id_configuracion
         FROM configuracion_web cw
         WHERE cw.id_usuario = $1
           AND cw.clave = ANY($2::text[])
           AND cw.id_configuracion <> ALL($3::integer[])
           AND NOT EXISTS (
             SELECT 1 FROM banners b WHERE b.id_configuracion = cw.id_configuracion
           )`,
        [configuracionAdminId, ['nombre_tienda', 'whatsapp', 'email_contacto', 'instagram', 'tiktok', 'ubicacion', 'texto_preheader', 'paleta_sitio', 'paleta_panel'], idsOriginales],
      )
      if (temporales.rowCount > 0) {
        await cliente.query(
          'DELETE FROM configuracion_web WHERE id_configuracion = ANY($1::integer[])',
          [temporales.rows.map((fila) => fila.id_configuracion)],
        )
      }
    }
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

try {
  await once(servidor, 'listening')
  const { port } = servidor.address()
  const base = `http://127.0.0.1:${port}`
  {
    const administrador = await pool.query(
      `SELECT u.id_usuario
       FROM usuario u
       JOIN roles r ON r.id_roles = u.id_rol
       WHERE r.nombre = 'Administrador'
       ORDER BY u.id_usuario
       LIMIT 1`,
    )
    verificar(administrador.rowCount === 1, 'el smoke requiere un usuario Administrador para probar la configuración')
    configuracionAdminId = administrador.rows[0].id_usuario
    const filas = await pool.query(
      `SELECT id_configuracion, clave, valor, fecha_modificacion
       FROM configuracion_web
       WHERE id_usuario = $1
         AND clave = ANY($2::text[])
       ORDER BY id_configuracion`,
      [configuracionAdminId, ['nombre_tienda', 'whatsapp', 'email_contacto', 'instagram', 'tiktok', 'ubicacion', 'texto_preheader', 'paleta_sitio', 'paleta_panel']],
    )
    configuracionOriginal = filas.rows
  }

  const rolPrueba = await pool.query('SELECT id_roles FROM roles ORDER BY id_roles LIMIT 1')
  verificar(rolPrueba.rowCount === 1, 'el smoke requiere al menos un rol para probar usuarios')
  const emailUsuarioPrueba = `smoke-${sufijoPrueba}@example.com`
  const payloadUsuarioPrueba = {
    nombre: 'Usuario',
    apellido: 'Smoke',
    email: emailUsuarioPrueba,
    contrasena: 'contrasena-smoke-inicial',
    idRol: String(rolPrueba.rows[0].id_roles),
  }
  {
    const { res, body } = await fetchJson(base, '/usuarios')
    verificar(res.status === 200 && Array.isArray(body), 'GET /usuarios debería devolver un array')
    verificar(res.headers.get('content-type') === 'application/json; charset=utf-8', 'GET /usuarios debería responder JSON')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadUsuarioPrueba),
    })
    verificar(res.status === 201, `POST /usuarios esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.email === emailUsuarioPrueba, 'POST /usuarios debería devolver id string y email')
    verificar(body.emailVerificado === false && body.activo === true, 'POST /usuarios debería aplicar defaults')
    verificar(!Object.hasOwn(body, 'contrasena') && !Object.hasOwn(body, 'passwordHash'), 'la respuesta no debe exponer credenciales')
    verificar(!Number.isNaN(Date.parse(body.fechaCreacion)) && body.fechaCreacion.endsWith('Z'), 'fechaCreacion debería ser ISO UTC')
    usuarioPruebaId = body.id
    usuariosPruebaIds.push(usuarioPruebaId)
    const credencial = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario = $1', [usuarioPruebaId])
    verificar(
      credencial.rows[0].password_hash.startsWith('scrypt$') &&
        credencial.rows[0].password_hash !== payloadUsuarioPrueba.contrasena,
      'la contraseña debería persistirse con hash scrypt, no en texto plano',
    )
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadUsuarioPrueba),
    })
    verificar(res.status === 409 && typeof body.error === 'string', 'POST /usuarios con email duplicado debería responder 409')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Incompleto' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST /usuarios incompleto debería responder 400')
  }

  {
    const cambiosUsuario = {
      nombre: 'Usuario Editado',
      apellido: 'Smoke Editado',
      email: `editado-${sufijoPrueba}@example.com`,
      contrasena: 'contrasena-smoke-actualizada',
      idRol: String(rolPrueba.rows[0].id_roles),
      emailVerificado: true,
      dni: '12345678',
      telefono: '+5491100000000',
      activo: false,
    }
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cambiosUsuario),
    })
    verificar(res.status === 200, `PATCH /usuarios/:id esperaba 200, recibió ${res.status}`)
    verificar(
      body.nombre === cambiosUsuario.nombre &&
        body.apellido === cambiosUsuario.apellido &&
        body.email === cambiosUsuario.email &&
        body.emailVerificado === true &&
        body.dni === cambiosUsuario.dni &&
        body.telefono === cambiosUsuario.telefono &&
        body.activo === false,
      'PATCH /usuarios debería actualizar todos los campos editables',
    )
    verificar(!Object.hasOwn(body, 'contrasena') && !Object.hasOwn(body, 'passwordHash'), 'PATCH no debe exponer credenciales')
    const credencial = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario = $1', [usuarioPruebaId])
    verificar(
      credencial.rows[0].password_hash.startsWith('scrypt$') &&
        credencial.rows[0].password_hash !== cambiosUsuario.contrasena,
      'PATCH debería actualizar la contraseña como hash scrypt',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}`)
    verificar(res.status === 200 && body.id === usuarioPruebaId, 'GET /usuarios/:id debería devolver el usuario persistido')
    verificar(body.activo === false && body.emailVerificado === true, 'GET /usuarios/:id debería incluir los cambios persistidos')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/0')
    verificar(res.status === 400 && typeof body.error === 'string', 'GET /usuarios con id inválido debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/999999999')
    verificar(res.status === 404 && typeof body.error === 'string', 'GET /usuarios inexistente debería responder 404')
  }

  const direccionInicial = {
    calle: 'Calle Smoke',
    numero: '101',
    localidad: 'Ciudad Smoke',
    codigoPostal: '1000',
    provincia: 'Buenos Aires',
    pais: 'Argentina',
    dpto: null,
    esPrincipal: true,
  }
  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(direccionInicial),
    })
    verificar(res.status === 201 && typeof body.id === 'string', 'POST dirección debería responder 201 con id string')
    verificar(body.calle === direccionInicial.calle && body.esPrincipal === true, 'POST dirección debería devolver los campos enviados')
    direccionesPruebaIds.push(body.id)
    const listado = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones`)
    verificar(listado.res.status === 200 && listado.body.length === 1, 'GET direcciones debería listar la dirección del usuario')
    verificar(listado.body[0].codigoPostal === '1000', 'GET direcciones debería usar codigoPostal')
  }

  let direccionSecundaria
  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...direccionInicial, calle: 'Otra calle Smoke', esPrincipal: true }),
    })
    verificar(res.status === 201, 'POST segunda dirección debería responder 201')
    direccionSecundaria = body
    direccionesPruebaIds.push(body.id)
    const listado = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones`)
    verificar(
      listado.body.filter((direccion) => direccion.esPrincipal).length === 1 &&
        listado.body.find((direccion) => direccion.id === direccionesPruebaIds[0]).esPrincipal === false,
      'cada usuario debería tener como máximo una dirección principal',
    )
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payloadUsuarioPrueba,
        nombre: 'Segundo',
        email: `segundo-${sufijoPrueba}@example.com`,
      }),
    })
    verificar(res.status === 201, 'POST segundo usuario debería responder 201')
    segundoUsuarioPruebaId = body.id
    usuariosPruebaIds.push(segundoUsuarioPruebaId)
    await pool.query(
      'INSERT INTO usuario_direccion (id_direccion, id_usuario, es_principal) VALUES ($1, $2, FALSE)',
      [direccionesPruebaIds[0], segundoUsuarioPruebaId],
    )
  }

  {
    const idDireccionCompartida = direccionesPruebaIds[0]
    const { res, body } = await fetchJson(
      base,
      `/usuarios/${usuarioPruebaId}/direcciones/${idDireccionCompartida}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calle: 'Calle privada Smoke', esPrincipal: true }),
      },
    )
    verificar(res.status === 200 && body.id !== idDireccionCompartida, 'editar una dirección compartida debería crear una copia para el usuario')
    verificar(body.calle === 'Calle privada Smoke' && body.esPrincipal === true, 'PATCH dirección debería devolver la copia editada')
    direccionesPruebaIds.push(body.id)
    const delSegundo = await fetchJson(base, `/usuarios/${segundoUsuarioPruebaId}/direcciones`)
    verificar(
      delSegundo.body.length === 1 &&
        delSegundo.body[0].id === idDireccionCompartida &&
        delSegundo.body[0].calle === direccionInicial.calle,
      'editar una dirección compartida no debería alterar al otro usuario',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones/999999999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calle: 'No existe' }),
    })
    verificar(res.status === 404 && typeof body.error === 'string', 'PATCH dirección no asociada debería responder 404')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calle: 'Incompleta' }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST dirección incompleta debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/direcciones/${direccionesPruebaIds[2]}`, {
      method: 'DELETE',
    })
    verificar(res.status === 204 && body === '', 'DELETE dirección debería responder 204 sin cuerpo')
  }

  // POST /imagenes guarda y publica el archivo recibido
  {
    const formulario = new FormData()
    const contenido = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
      'base64',
    )
    formulario.append('archivo', new Blob([contenido], { type: 'image/png' }), nombreImagenPrueba)
    const { res, body } = await fetchJson(base, '/imagenes', { method: 'POST', body: formulario })
    if (res.status === 201) {
      imagenSubida = typeof body.url === 'string'
        ? body.url
        : `/uploads/${encodeURIComponent(nombreImagenPrueba)}`
    }
    verificar(res.status === 201, `POST /imagenes esperaba 201, recibió ${res.status}`)
    verificar(typeof body.url === 'string' && body.url.startsWith('/uploads/'), 'POST /imagenes debería devolver la URL pública')
    verificar(body.nombre === nombreImagenPrueba, 'POST /imagenes debería conservar y devolver el nombre original')

    const imagenPublicada = await fetch(base + body.url)
    verificar(imagenPublicada.status === 200, 'la URL devuelta debería servir la imagen')
    verificar(imagenPublicada.headers.get('content-type') === 'image/png', 'la URL debería conservar el tipo de imagen')
    verificar(Buffer.compare(Buffer.from(await imagenPublicada.arrayBuffer()), contenido) === 0, 'la imagen publicada debería conservar el contenido')
  }

  // GET/PUT configuración de la tienda.
  {
    const { res, body } = await fetchJson(base, '/configuracion')
    verificar(res.status === 200, `GET /configuracion esperaba 200, recibió ${res.status}`)
    verificar(
      ['nombre', 'whatsapp', 'emailContacto', 'instagram', 'tiktok', 'ubicacion', 'textoPreheader', 'paletaSitio', 'paletaPanel'].every((campo) => Object.hasOwn(body, campo)),
      'GET /configuracion debería devolver todos los campos del contrato',
    )
  }

  const configuracionPrueba = {
    nombre: `Tienda smoke ${sufijoPrueba}`,
    whatsapp: '+54 9 11 2525-0523',
    emailContacto: 'smoke@example.com',
    instagram: '@smoke',
    tiktok: '@smoke',
    ubicacion: 'Ciudad smoke',
    textoPreheader: `Oferta smoke ${sufijoPrueba}`,
    paletaSitio: { principal: '#123456', texto: '#ffffff' },
    paletaPanel: { principal: '#654321', fondo: '#f0f0f0' },
  }
  {
    const { res, body } = await fetchJson(base, '/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configuracionPrueba),
    })
    verificar(res.status === 200, `PUT /configuracion esperaba 200, recibió ${res.status}`)
    verificar(
      JSON.stringify(body) === JSON.stringify(configuracionPrueba),
      'PUT /configuracion debería devolver los valores persistidos',
    )
    const { res: resGet, body: bodyGet } = await fetchJson(base, '/configuracion')
    verificar(
      resGet.status === 200 && JSON.stringify(bodyGet) === JSON.stringify(configuracionPrueba),
      'GET /configuracion debería leer los cambios guardados',
    )
  }

  {
    const { res, body } = await fetchJson(base, '/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...configuracionPrueba, paletaSitio: [] }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PUT /configuracion debería rechazar paletas que no sean objetos')
  }

  {
    const configuracionVacia = {
      ...configuracionPrueba,
      whatsapp: null,
      emailContacto: null,
      instagram: null,
      tiktok: null,
      ubicacion: null,
      textoPreheader: null,
      paletaSitio: null,
      paletaPanel: null,
    }
    const { res, body } = await fetchJson(base, '/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configuracionVacia),
    })
    verificar(
      res.status === 200 &&
        body.whatsapp === null &&
        body.emailContacto === null &&
        body.instagram === null &&
        body.tiktok === null &&
        body.ubicacion === null &&
        body.textoPreheader === null &&
        body.paletaSitio === null &&
        body.paletaPanel === null,
      'PUT /configuracion debería permitir limpiar campos opcionales',
    )
  }

  // CRUD de banners.
  {
    const { res, body } = await fetchJson(base, '/banners')
    verificar(res.status === 200 && Array.isArray(body), 'GET /banners debería devolver un array')
  }

  const bannerPrueba = {
    titulo: `Banner smoke ${sufijoPrueba}`,
    subtitulo: 'Subtitulo de prueba',
    descripcion: 'Descripcion de prueba',
    urlImagen: imagenSubida,
    linkReferencia: '/productos',
    estaActivo: true,
  }
  let bannerCreado
  {
    const { res, body } = await fetchJson(base, '/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bannerPrueba),
    })
    if (res.status === 201) {
      bannerPruebaCreado = true
      if (typeof body.id === 'string') bannersPruebaIds.push(body.id)
    }
    verificar(res.status === 201, `POST /banners esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.titulo === bannerPrueba.titulo, 'POST /banners debería devolver el banner creado')
    verificar(
      body.subtitulo === bannerPrueba.subtitulo &&
        body.descripcion === bannerPrueba.descripcion &&
        body.urlImagen === bannerPrueba.urlImagen &&
        body.linkReferencia === bannerPrueba.linkReferencia &&
        body.estaActivo === true,
      'POST /banners debería conservar los campos del banner',
    )
    verificar(!Number.isNaN(Date.parse(body.fecha)) && body.fecha.endsWith('Z'), 'fecha del banner debería ser ISO UTC')
    bannerCreado = body
  }

  {
    const { res, body } = await fetchJson(base, '/banners')
    verificar(
      res.status === 200 && body.some((banner) => banner.id === bannerCreado.id),
      'GET /banners debería incluir el banner creado',
    )
  }

  const actualizacionesBanner = await Promise.all([
    fetchJson(base, `/banners/${bannerCreado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitulo: 'Subtitulo editado' }),
    }),
    fetchJson(base, `/banners/${bannerCreado.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estaActivo: false }),
    }),
  ])
  verificar(actualizacionesBanner.every(({ res }) => res.status === 200), 'PATCH concurrentes /banners/:id deberían responder 200')
  {
    const { res, body } = await fetchJson(base, '/banners')
    const actualizado = body.find((banner) => banner.id === bannerCreado.id)
    verificar(
      res.status === 200 &&
        actualizado?.subtitulo === 'Subtitulo editado' &&
        actualizado.estaActivo === false &&
        actualizado.titulo === bannerPrueba.titulo,
      'PATCH concurrentes deberían preservar los cambios de campos distintos',
    )
  }

  {
    const { res, body } = await fetchJson(base, '/banners/2147483648', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estaActivo: false }),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'PATCH con id fuera de rango debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, `/banners/${bannerCreado.id}`, { method: 'DELETE' })
    verificar(res.status === 204 && body === '', 'DELETE /banners/:id debería responder 204 sin cuerpo')
  }

  {
    const { res, body } = await fetchJson(base, `/banners/${bannerCreado.id}`, { method: 'DELETE' })
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE /banners/:id inexistente debería responder 404')
  }

  {
    const formulario = new FormData()
    formulario.append(
      'archivo',
      new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }),
      nombreImagenPrueba,
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
    categoriaPruebaId = body.id
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

  // GET colección conserva y expone los datos previos.
  {
    const { res, body } = await fetchJson(base, '/productos')
    verificar(res.status === 200, `GET /productos esperaba 200, recibió ${res.status}`)
    verificar(
      res.headers.get('content-type') === 'application/json; charset=utf-8',
      `GET /productos content-type incorrecto: ${res.headers.get('content-type')}`,
    )
    verificar(Array.isArray(body), 'GET /productos debería devolver un array')
  }

  // POST producto 201: sin precioUnitario ni fotos (precio derivado null)
  let creado
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombreProductoPrueba,
        descripcion: 'Mate de calabaza',
        marca: 'Justina',
        categoriaId: categoriaCreada.id,
      }),
    })
    verificar(res.status === 201, `POST /productos esperaba 201, recibió ${res.status}`)
    verificar(typeof body.id === 'string' && body.id.length > 0, 'POST /productos debería devolver id string')
    verificar(body.nombre === nombreProductoPrueba && body.marca === 'Justina', 'POST /productos debería devolver nombre y marca')
    verificar(body.precioUnitario === null, 'el producto sin variantes debería exponer precioUnitario null')
    verificar(body.categoriaId === categoriaCreada.id, 'POST /productos debería devolver categoriaId')
    verificar(body.fotoPortadaUrl === null, 'el producto nuevo debería exponer fotoPortadaUrl null')
    verificar(body.estado === 'activo', 'POST /productos debería default a estado "activo"')
    verificar(!Number.isNaN(Date.parse(body.creadoEn)) && body.creadoEn.endsWith('Z'), 'creadoEn debería ser ISO UTC')
    verificar(body.actualizadoEn === body.creadoEn, 'actualizadoEn debería coincidir con creadoEn al crear')
    verificar(Array.isArray(body.variantes) && body.variantes.length === 0, 'el producto debería exponer array variantes vacío')
    creado = body
    productoPruebaId = body.id
  }

  // POST producto con defaults
  let otroProducto
  {
    const { res, body } = await fetchJson(base, '/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombreOtroProductoPrueba }),
    })
    verificar(res.status === 201, `POST /productos con defaults esperaba 201, recibió ${res.status}`)
    verificar(body.marca === null, 'marca debería default a null')
    verificar(body.categoriaId === null, 'categoriaId debería default a null')
    otroProducto = body
    otroProductoPruebaId = body.id
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`, {
      method: 'GET',
    })
    verificar(res.status === 200 && Array.isArray(body), 'GET favoritos debería devolver un array')
    verificar(body.length === 0, 'un usuario nuevo debería comenzar sin favoritos')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId: creado.id }),
    })
    verificar(res.status === 201 && body.productoId === creado.id, 'POST favorito debería responder 201 con productoId')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`)
    verificar(
      res.status === 200 &&
        body.length === 1 &&
        body[0].id === creado.id &&
        body[0].nombre === nombreProductoPrueba,
      'GET favoritos debería devolver el producto agregado',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productoId: creado.id }),
    })
    verificar(res.status === 409 && typeof body.error === 'string', 'POST favorito duplicado debería responder 409')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    verificar(res.status === 400 && typeof body.error === 'string', 'POST favorito sin productoId debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos/${creado.id}`, {
      method: 'DELETE',
    })
    verificar(res.status === 204 && body === '', 'DELETE favorito debería responder 204 sin cuerpo')
    const favoritos = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos`)
    verificar(favoritos.res.status === 200 && favoritos.body.length === 0, 'DELETE favorito debería quitar solo el producto indicado')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/favoritos/${creado.id}`, {
      method: 'DELETE',
    })
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE favorito inexistente debería responder 404')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/999999999/favoritos')
    verificar(res.status === 404 && typeof body.error === 'string', 'GET favoritos de usuario inexistente debería responder 404')
  }

  {
    const snapshot = {
      calle: direccionInicial.calle,
      numero: direccionInicial.numero,
      localidad: direccionInicial.localidad,
      codigoPostal: direccionInicial.codigoPostal,
      provincia: direccionInicial.provincia,
      pais: direccionInicial.pais,
    }
    const pedido = await pool.query(
      `INSERT INTO pedido
         (id_usuario, id_direccion, direccion_snapshot, estado, subtotal, descuento, costo_envio, total)
       VALUES ($1, $2, $3::jsonb, 'pendiente', 1200, 100, 50, 1150)
       RETURNING id_pedido`,
      [usuarioPruebaId, direccionesPruebaIds[0], JSON.stringify(snapshot)],
    )
    pedidoPruebaId = String(pedido.rows[0].id_pedido)
    await pool.query(
      `INSERT INTO item_pedido
         (id_pedido, id_variante, sku_snapshot, nombre_snapshot, cantidad, precio_unitario, subtotal)
       VALUES ($1, NULL, 'SMOKE-ORDER', 'Producto smoke', 1, 1200, 1200)`,
      [pedidoPruebaId],
    )
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}/pedidos`)
    verificar(res.status === 200 && body.length === 1, 'GET pedidos debería devolver los pedidos del usuario')
    verificar(
      body[0].id === pedidoPruebaId &&
        body[0].estado === 'pendiente' &&
        body[0].total === 1150 &&
        body[0].direccionSnapshot.calle === direccionInicial.calle,
      'GET pedidos debería devolver totales, estado y snapshot',
    )
    verificar(
      body[0].items.length === 1 &&
        body[0].items[0].nombre === 'Producto smoke' &&
        body[0].items[0].precioUnitario === 1200,
      'GET pedidos debería incluir sus ítems',
    )
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${segundoUsuarioPruebaId}/pedidos`)
    verificar(res.status === 200 && Array.isArray(body) && body.length === 0, 'GET pedidos de usuario sin pedidos debería devolver []')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/0/pedidos')
    verificar(res.status === 400 && typeof body.error === 'string', 'GET pedidos con id inválido debería responder 400')
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/999999999/pedidos')
    verificar(res.status === 404 && typeof body.error === 'string', 'GET pedidos de usuario inexistente debería responder 404')
  }

  // GET colección con datos (incluye el segundo)
  {
    const { res, body } = await fetchJson(base, '/productos')
    verificar(res.status === 200, `GET /productos esperaba 200, recibió ${res.status}`)
    verificar(
      Array.isArray(body) &&
        body.some((producto) => producto.id === creado.id) &&
        body.some((producto) => producto.id === otroProducto.id),
      'GET /productos debería incluir ambos productos creados',
    )
    verificar(body.find((producto) => producto.id === creado.id)?.categoriaId === categoriaCreada.id, 'GET /productos debería incluir categoriaId')
  }

  // GET por id con variantes default []
  {
    const { res, body } = await fetchJson(base, `/productos/${creado.id}`)
    verificar(res.status === 200, `GET /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.id === creado.id && body.nombre === nombreProductoPrueba, 'GET /productos/:id debería devolver el producto creado')
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
    formulario.append('sku', skuPrimeraVariante)
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
    verificar(body.sku === skuPrimeraVariante && body.stock === 5 && body.precioUnitario === 15000.5, 'la variante debería devolver sku, stock y precioUnitario')
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
    formulario.append('sku', skuPrimeraVariante)
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
        sku: skuVarianteLocal,
        stock: 1,
        precioUnitario: 13000,
        fotos: [{ nombre: nombreImagenPrueba, esPrincipal: true }],
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
      body: JSON.stringify({ sku: skuSegundaVariante, stock: 2, precioUnitario: 12000, atributos: [] }),
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
      body: JSON.stringify({ sku: skuPrimeraVariante, stock: 1, precioUnitario: 10 }),
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
        nombre: `${nombreProductoPrueba} grande`,
        marca: 'Justina Sur',
        estado: 'inactivo',
        categoriaId: categoriaCreada.id,
      }),
    })
    verificar(res.status === 200, `PATCH /productos/:id esperaba 200, recibió ${res.status}`)
    verificar(body.nombre === `${nombreProductoPrueba} grande` && body.marca === 'Justina Sur' && body.estado === 'inactivo', 'PATCH debería aplicar los cambios')
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

  {
    const { res } = await fetchJson(
      base,
      `/usuarios/${segundoUsuarioPruebaId}/direcciones/${direccionesPruebaIds[0]}`,
      { method: 'DELETE' },
    )
    verificar(res.status === 204, 'DELETE dirección compartida debería desasociar al usuario indicado')
    const conservada = await pool.query(
      'SELECT id_direccion FROM direccion WHERE id_direccion = $1',
      [direccionesPruebaIds[0]],
    )
    verificar(conservada.rowCount === 1, 'una dirección referenciada por un pedido debe conservarse')
  }

  {
    const { res, body } = await fetchJson(
      base,
      `/usuarios/${usuarioPruebaId}/direcciones/${direccionSecundaria.id}`,
      { method: 'DELETE' },
    )
    verificar(res.status === 204 && body === '', 'DELETE dirección secundaria debería responder 204')
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}`, { method: 'DELETE' })
    verificar(res.status === 409 && typeof body.error === 'string', 'DELETE usuario con pedidos debería responder 409')
  }

  await pool.query('DELETE FROM pedido WHERE id_pedido = $1', [pedidoPruebaId])
  pedidoPruebaId = null

  {
    const { res, body } = await fetchJson(base, `/usuarios/${usuarioPruebaId}`, { method: 'DELETE' })
    verificar(res.status === 204 && body === '', 'DELETE usuario sin pedidos debería responder 204')
    usuarioPruebaId = null
  }

  {
    const { res, body } = await fetchJson(base, `/usuarios/${segundoUsuarioPruebaId}`, { method: 'DELETE' })
    verificar(res.status === 204 && body === '', 'DELETE segundo usuario debería responder 204')
    segundoUsuarioPruebaId = null
  }

  {
    const { res, body } = await fetchJson(base, '/usuarios/999999999', { method: 'DELETE' })
    verificar(res.status === 404 && typeof body.error === 'string', 'DELETE usuario inexistente debería responder 404')
  }

  // Ruta inexistente → 404
  {
    const { res, body } = await fetchJson(base, '/ruta-inexistente')
    verificar(res.status === 404, `ruta inexistente esperaba 404, recibió ${res.status}`)
    verificar(body.error === 'Ruta no encontrada', 'ruta inexistente debería devolver "Ruta no encontrada"')
  }

  process.stdout.write('[OK] smoke: usuarios, direcciones, pedidos, favoritos, imágenes, categorías y productos sobre el DDL oficial\n')
} catch (error) {
  process.stderr.write(`[FAIL] smoke: ${error.message}\n`)
  process.exitCode = 1
} finally {
  if (imagenSubida) {
    await unlink(join(raiz, 'uploads', basename(imagenSubida)))
  }
  await Promise.all(imagenesVariantesSubidas.map((nombre) => unlink(join(raiz, 'uploads', 'productos', nombre))))
  await new Promise((resolve) => servidor.close(resolve))
  if (bannerPruebaCreado && bannersPruebaIds.length === 0) {
    await pool.query('DELETE FROM banners WHERE titulo = $1', [`Banner smoke ${sufijoPrueba}`])
  }
  await restaurarConfiguracionPrueba()
  if (pedidoPruebaId) {
    await pool.query('DELETE FROM pedido WHERE id_pedido = $1', [pedidoPruebaId])
  }
  if (usuariosPruebaIds.length > 0) {
    await pool.query('DELETE FROM usuario WHERE id_usuario = ANY($1::bigint[])', [usuariosPruebaIds])
  }
  if (direccionesPruebaIds.length > 0) {
    await pool.query(
      `DELETE FROM direccion d
       WHERE d.id_direccion = ANY($1::bigint[])
         AND NOT EXISTS (
           SELECT 1 FROM usuario_direccion ud WHERE ud.id_direccion = d.id_direccion
         )
         AND NOT EXISTS (
           SELECT 1 FROM pedido p WHERE p.id_direccion = d.id_direccion
         )`,
      [direccionesPruebaIds],
    )
  }
  const productosPrueba = [productoPruebaId, otroProductoPruebaId].filter(Boolean)
  if (productosPrueba.length > 0) {
    await pool.query('DELETE FROM producto WHERE id_producto = ANY($1::bigint[])', [productosPrueba])
  }
  if (categoriaPruebaId) {
    await pool.query('DELETE FROM categoria WHERE id_categoria = $1', [categoriaPruebaId])
  }
  await pool.end()
}

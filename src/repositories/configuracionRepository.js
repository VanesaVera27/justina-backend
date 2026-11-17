import { pool } from './pool.js'

const CLAVES = [
  'nombre_tienda',
  'whatsapp',
  'email_contacto',
  'instagram',
  'tiktok',
  'ubicacion',
  'texto_preheader',
  'paleta_sitio',
  'paleta_panel',
]

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

async function buscarAdministrador(cliente) {
  const resultado = await cliente.query(
    `SELECT u.id_usuario
     FROM usuario u
     JOIN roles r ON r.id_roles = u.id_rol
     WHERE r.nombre = 'Administrador'
     ORDER BY u.id_usuario
     LIMIT 1`,
  )
  if (resultado.rowCount === 0) lanzarError(409, 'Debe existir un usuario Administrador para gestionar la configuracion')
  return resultado.rows[0].id_usuario
}

function leerPaleta(valor, clave) {
  if (valor == null || valor === '') return null
  let paleta
  try {
    paleta = JSON.parse(valor)
  } catch {
    lanzarError(500, `La paleta "${clave}" guardada en la base no es JSON valido`)
  }
  if (paleta === null || (typeof paleta === 'object' && !Array.isArray(paleta))) return paleta
  lanzarError(500, `La paleta "${clave}" guardada en la base no es un objeto`)
}

function valorTexto(valores, clave) {
  const valor = valores.get(clave)
  if (valor == null || valor === '') return null
  return valor
}

function mapearConfiguracion(filas) {
  const valores = new Map()
  for (const fila of filas) {
    if (!valores.has(fila.clave)) valores.set(fila.clave, fila.valor)
  }
  const paletaSitio = valores.get('paleta_sitio')
  const colorPrincipalAnterior = valores.get('color_principal')
  const contactoLegacy = valorTexto(valores, 'contacto')
  return {
    nombre: valores.get('nombre_tienda') || null,
    whatsapp: valorTexto(valores, 'whatsapp') ?? contactoLegacy,
    emailContacto: valorTexto(valores, 'email_contacto'),
    instagram: valorTexto(valores, 'instagram'),
    tiktok: valorTexto(valores, 'tiktok'),
    ubicacion: valorTexto(valores, 'ubicacion'),
    textoPreheader: valorTexto(valores, 'texto_preheader'),
    paletaSitio: paletaSitio === undefined
      ? colorPrincipalAnterior ? { principal: colorPrincipalAnterior } : null
      : leerPaleta(paletaSitio, 'paleta_sitio'),
    paletaPanel: leerPaleta(valores.get('paleta_panel'), 'paleta_panel'),
  }
}

export async function obtenerConfiguracion() {
  const idUsuario = await buscarAdministrador(pool)
  const resultado = await pool.query(
    `SELECT clave, valor
     FROM configuracion_web
     WHERE id_usuario = $1 AND clave = ANY($2::text[])
     ORDER BY id_configuracion`,
    [idUsuario, [...CLAVES, 'contacto', 'color_principal']],
  )
  return mapearConfiguracion(resultado.rows)
}

export async function guardarConfiguracion(configuracion) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const idUsuario = await buscarAdministrador(cliente)
    await cliente.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(idUsuario), 'configuracion-tienda'],
    )
    const existentes = await cliente.query(
      `SELECT id_configuracion, clave
       FROM configuracion_web
       WHERE id_usuario = $1 AND clave = ANY($2::text[])
       ORDER BY id_configuracion
       FOR UPDATE`,
      [idUsuario, CLAVES],
    )
    const porClave = new Map()
    for (const fila of existentes.rows) {
      if (!porClave.has(fila.clave)) porClave.set(fila.clave, [])
      porClave.get(fila.clave).push(fila.id_configuracion)
    }

    const valores = [
      ['nombre_tienda', configuracion.nombre],
      ['whatsapp', configuracion.whatsapp],
      ['email_contacto', configuracion.emailContacto],
      ['instagram', configuracion.instagram],
      ['tiktok', configuracion.tiktok],
      ['ubicacion', configuracion.ubicacion],
      ['texto_preheader', configuracion.textoPreheader],
      ['paleta_sitio', configuracion.paletaSitio === null ? null : JSON.stringify(configuracion.paletaSitio)],
      ['paleta_panel', configuracion.paletaPanel === null ? null : JSON.stringify(configuracion.paletaPanel)],
    ]
    for (const [clave, valor] of valores) {
      const ids = porClave.get(clave) ?? []
      if (ids.length > 0) {
        await cliente.query(
          'UPDATE configuracion_web SET valor = $2, fecha_modificacion = CURRENT_TIMESTAMP WHERE id_usuario = $1 AND clave = $3',
          [idUsuario, valor ?? '', clave],
        )
      } else {
        await cliente.query(
          'INSERT INTO configuracion_web (id_usuario, clave, valor) VALUES ($1, $2, $3)',
          [idUsuario, clave, valor ?? ''],
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
  return obtenerConfiguracion()
}

export async function asegurarConfiguracionParaBanner() {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const idUsuario = await buscarAdministrador(cliente)
    await cliente.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(idUsuario), 'configuracion-tienda'],
    )
    const existente = await cliente.query(
      `SELECT id_configuracion
       FROM configuracion_web
       WHERE id_usuario = $1 AND clave = 'nombre_tienda'
       ORDER BY id_configuracion
       LIMIT 1
       FOR UPDATE`,
      [idUsuario],
    )
    let idConfiguracion = existente.rows[0]?.id_configuracion
    if (!idConfiguracion) {
      const creada = await cliente.query(
        `INSERT INTO configuracion_web (id_usuario, clave, valor)
         VALUES ($1, 'nombre_tienda', '')
         RETURNING id_configuracion`,
        [idUsuario],
      )
      idConfiguracion = creada.rows[0].id_configuracion
    }
    await cliente.query('COMMIT')
    return idConfiguracion
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

import { pool } from './pool.js'

// Repositorio de productos/variantes sobre el DDL oficial (tablas producto,
// variante, valor_atributo, valor_variante, imagenes_variante).
// SQL 100% parametrizado; mapeos:
//   - estado API activo/inactivo <-> columna activo (boolean)
//   - ids BIGSERIAL (int8) <-> string en el JSON
//   - precioUnitario del producto = min(precio de variantes), null si no hay

function construirAtributos(atributosPorVariante, idVariante) {
  // El DDL persiste solo el valor (valor_atributo.valor): al reconstruir, el
  // nombre se expone igual al valor. En la creacion la API devuelve el par
  // { nombre, valor } tal como lo envio el cliente.
  return (atributosPorVariante.get(idVariante) ?? []).map((fila) => ({ nombre: fila.valor, valor: fila.valor }))
}

function construirFotos(fotosPorVariante, idVariante) {
  return (fotosPorVariante.get(idVariante) ?? []).map((fila) => ({
    url: fila.url,
    esPrincipal: Boolean(fila.es_principal),
  }))
}

function varianteAFilaJson(fila, atributos, fotos) {
  return {
    id: String(fila.id_variante),
    sku: fila.sku,
    stock: fila.stock,
    precioUnitario: Number(fila.precio),
    atributos,
    fotos,
  }
}

async function cargarVariantesDeProductos(ids) {
  if (ids.length === 0) {
    return new Map()
  }
  const placeholders = ids.map((_, indice) => `$${indice + 1}`).join(', ')
  const [variantes, atributos, fotos] = await Promise.all([
    pool.query(
      `SELECT v.id_variante, v.id_producto, v.sku, v.stock, v.precio
       FROM variante v
       WHERE v.id_producto IN (${placeholders})
       ORDER BY v.id_variante`,
      ids,
    ),
    pool.query(
      `SELECT vv.id_variante, va.valor
       FROM valor_variante vv
       JOIN valor_atributo va ON va.id_atributo = vv.id_valor_atributo
       WHERE vv.id_variante IN (
         SELECT id_variante FROM variante WHERE id_producto IN (${placeholders})
       )
       ORDER BY vv.id_valor_variante, vv.id_variante`,
      ids,
    ),
    pool.query(
      `SELECT i.id_variante, i.url, i.es_principal
       FROM imagenes_variante i
       WHERE i.id_variante IN (
         SELECT id_variante FROM variante WHERE id_producto IN (${placeholders})
       )
       ORDER BY i.id_imagen, i.id_variante`,
      ids,
    ),
  ])

  const atributosPorVariante = new Map()
  for (const fila of atributos.rows) {
    if (!atributosPorVariante.has(fila.id_variante)) atributosPorVariante.set(fila.id_variante, [])
    atributosPorVariante.get(fila.id_variante).push(fila)
  }
  const fotosPorVariante = new Map()
  for (const fila of fotos.rows) {
    if (!fotosPorVariante.has(fila.id_variante)) fotosPorVariante.set(fila.id_variante, [])
    fotosPorVariante.get(fila.id_variante).push(fila)
  }
  return { filas: variantes.rows, atributosPorVariante, fotosPorVariante }
}

function filasAProducto(filaProducto, { filas = [], atributosPorVariante = new Map(), fotosPorVariante = new Map() } = {}) {
  const variantes = filas
    .filter((fila) => String(fila.id_producto) === String(filaProducto.id_producto))
    .map((fila) => varianteAFilaJson(
      fila,
      construirAtributos(atributosPorVariante, fila.id_variante),
      construirFotos(fotosPorVariante, fila.id_variante),
    ))
  const precios = variantes.map((variante) => variante.precioUnitario)
  const precioDerivado = precios.length > 0 ? Math.min(...precios) : null
  return {
    id: String(filaProducto.id_producto),
    nombre: filaProducto.nombre,
    descripcion: filaProducto.descripcion,
    marca: filaProducto.marca,
    precioUnitario: precioDerivado,
    estado: filaProducto.activo ? 'activo' : 'inactivo',
    creadoEn: filaProducto.fecha_creacion.toISOString(),
    actualizadoEn: filaProducto.fecha_modificacion.toISOString(),
    variantes,
  }
}

export function errorDesdePostgres(error, porCodigo) {
  const mensaje = porCodigo[error.code]
  if (mensaje) {
    const adaptado = new Error(mensaje.texto)
    adaptado.status = mensaje.status
    return adaptado
  }
  return error
}

export async function crearProducto(producto) {
  const resultado = await pool.query(
    `INSERT INTO producto (nombre, descripcion, marca, activo, fecha_creacion, fecha_modificacion)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_producto, nombre, descripcion, marca, activo, fecha_creacion, fecha_modificacion, es_destacado, id_categoria`,
    [producto.nombre, producto.descripcion, producto.marca, producto.estado === 'activo', producto.creadoEn, producto.actualizadoEn],
  )
  return filasAProducto(resultado.rows[0])
}

export async function listarProductos() {
  const resultado = await pool.query(
    'SELECT id_producto, nombre, descripcion, marca, activo, fecha_creacion, fecha_modificacion FROM producto ORDER BY fecha_creacion, id_producto',
  )
  const cargadas = await cargarVariantesDeProductos(resultado.rows.map((fila) => String(fila.id_producto)))
  return resultado.rows.map((fila) => filasAProducto(fila, cargadas))
}

export async function buscarProductoPorId(id) {
  const resultado = await pool.query(
    'SELECT id_producto, nombre, descripcion, marca, activo, fecha_creacion, fecha_modificacion FROM producto WHERE id_producto = $1',
    [id],
  )
  if (resultado.rows.length === 0) return null
  const cargadas = await cargarVariantesDeProductos([String(id)])
  return filasAProducto(resultado.rows[0], cargadas)
}

export async function guardarProducto(producto) {
  const resultado = await pool.query(
    `UPDATE producto
     SET nombre = $2, descripcion = $3, marca = $4, activo = $5, fecha_modificacion = $6
     WHERE id_producto = $1`,
    [producto.id, producto.nombre, producto.descripcion, producto.marca, producto.estado === 'activo', producto.actualizadoEn],
  )
  if (resultado.rowCount !== 1) return null
  return buscarProductoPorId(producto.id)
}

export async function agregarVarianteAProducto(productoId, variante) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')

    const resultadoVariante = await cliente.query(
      `INSERT INTO variante (id_producto, sku, stock, precio)
       VALUES ($1, $2, $3, $4)
       RETURNING id_variante, id_producto, sku, stock, precio`,
      [productoId, variante.sku, variante.stock, variante.precioUnitario],
    )
    const filaVariante = resultadoVariante.rows[0]

    const atributos = []
    for (const atributo of variante.atributos) {
      // Find-or-create por valor (valor_atributo solo persiste el valor).
      const existente = await cliente.query(
        'SELECT id_atributo, valor FROM valor_atributo WHERE valor = $1 LIMIT 1',
        [atributo.valor],
      )
      let filaAtributo = existente.rows[0]
      if (!filaAtributo) {
        const creado = await cliente.query(
          'INSERT INTO valor_atributo (valor) VALUES ($1) RETURNING id_atributo, valor',
          [atributo.valor],
        )
        filaAtributo = creado.rows[0]
      }
      const siguienteId = await cliente.query(
        'SELECT COALESCE(MAX(id_valor_variante), 0) + 1 AS siguiente FROM valor_variante',
      )
      await cliente.query(
        'INSERT INTO valor_variante (id_valor_variante, id_variante, id_valor_atributo) VALUES ($1, $2, $3)',
        [siguienteId.rows[0].siguiente, filaVariante.id_variante, filaAtributo.id_atributo],
      )
      atributos.push({ nombre: atributo.nombre, valor: filaAtributo.valor })
    }

    // Solo una foto principal: la primera marcada como principal; si ninguna
    // lo esta, la primera queda como principal.
    const indicePrincipal = variante.fotos.findIndex((foto) => foto.esPrincipal)
    const indiceEfectivo = indicePrincipal >= 0 ? indicePrincipal : 0
    const fotos = []
    for (const [indice, foto] of variante.fotos.entries()) {
      await cliente.query(
        'INSERT INTO imagenes_variante (id_variante, url, es_principal) VALUES ($1, $2, $3)',
        [filaVariante.id_variante, foto.url, indice === indiceEfectivo],
      )
      fotos.push({ url: foto.url, esPrincipal: indice === indiceEfectivo })
    }

    await cliente.query('COMMIT')
    return {
      id: String(filaVariante.id_variante),
      sku: filaVariante.sku,
      stock: filaVariante.stock,
      precioUnitario: Number(filaVariante.precio),
      atributos,
      fotos,
    }
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw errorDesdePostgres(error, {
      23505: { status: 409, texto: 'El sku ya existe' },
    })
  } finally {
    cliente.release()
  }
}

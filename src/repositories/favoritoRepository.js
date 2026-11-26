import { pool } from './pool.js'

function filaAProductoFavorito(fila) {
  return {
    id: String(fila.id_producto),
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    marca: fila.marca,
    categoriaId: fila.id_categoria == null ? null : String(fila.id_categoria),
    fotoPortadaUrl: fila.foto_portada_url,
    esDestacado: Boolean(fila.es_destacado),
  }
}

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

export async function listarFavoritosDeUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT p.id_producto, p.nombre, p.descripcion, p.marca, p.id_categoria,
            p.foto_portada_url, p.es_destacado
     FROM lista_favoritos lf
     JOIN favorito_item fi ON fi.id_lista_favoritos = lf.id_lista_favoritos
     JOIN producto p ON p.id_producto = fi.id_producto
     WHERE lf.id_usuario = $1
     ORDER BY fi.id_favorito_item`,
    [usuarioId],
  )
  return resultado.rows.map(filaAProductoFavorito)
}

export async function agregarFavorito(usuarioId, productoId) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const producto = await cliente.query(
      'SELECT id_producto FROM producto WHERE id_producto = $1',
      [productoId],
    )
    if (producto.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return 'producto-no-encontrado'
    }

    const listaCreada = await cliente.query(
      `INSERT INTO lista_favoritos (id_usuario)
       VALUES ($1)
       ON CONFLICT (id_usuario) DO NOTHING
       RETURNING id_lista_favoritos`,
      [usuarioId],
    )
    const lista = listaCreada.rowCount > 0
      ? listaCreada.rows[0]
      : (await cliente.query(
        'SELECT id_lista_favoritos FROM lista_favoritos WHERE id_usuario = $1',
        [usuarioId],
      )).rows[0]
    await cliente.query(
      'INSERT INTO favorito_item (id_lista_favoritos, id_producto) VALUES ($1, $2)',
      [lista.id_lista_favoritos, productoId],
    )
    await cliente.query('COMMIT')
    return true
  } catch (error) {
    await cliente.query('ROLLBACK')
    if (error.code === '23505') lanzarError(409, 'El producto ya está en favoritos')
    if (error.code === '23503') lanzarError(404, 'Usuario o producto no encontrado')
    if (error.code === '22P02' || error.code === '22003') lanzarError(400, 'El id de producto no es válido')
    throw error
  } finally {
    cliente.release()
  }
}

export async function borrarFavorito(usuarioId, productoId) {
  try {
    const resultado = await pool.query(
      `DELETE FROM favorito_item fi
       USING lista_favoritos lf
       WHERE fi.id_lista_favoritos = lf.id_lista_favoritos
         AND lf.id_usuario = $1
         AND fi.id_producto = $2`,
      [usuarioId, productoId],
    )
    return resultado.rowCount > 0
  } catch (error) {
    if (error.code === '22P02' || error.code === '22003') lanzarError(400, 'El id de producto no es válido')
    throw error
  }
}

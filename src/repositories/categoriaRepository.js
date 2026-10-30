import { pool } from './pool.js'

function filaACategoria(fila) {
  return {
    id: String(fila.id_categoria),
    nombre: fila.nombre,
    esDestacada: Boolean(fila.es_destacada),
  }
}

export async function listarCategorias() {
  const resultado = await pool.query(
    'SELECT id_categoria, nombre, es_destacada FROM categoria ORDER BY id_categoria',
  )
  return resultado.rows.map(filaACategoria)
}

export async function buscarCategoriaPorId(id) {
  const resultado = await pool.query(
    'SELECT id_categoria, nombre, es_destacada FROM categoria WHERE id_categoria = $1',
    [id],
  )
  return resultado.rows.length > 0 ? filaACategoria(resultado.rows[0]) : null
}

export async function crearCategoria(categoria) {
  const resultado = await pool.query(
    `INSERT INTO categoria (nombre, es_destacada)
     VALUES ($1, $2)
     RETURNING id_categoria, nombre, es_destacada`,
    [categoria.nombre, categoria.esDestacada],
  )
  return filaACategoria(resultado.rows[0])
}

export async function guardarCategoria(id, cambios) {
  const actual = await buscarCategoriaPorId(id)
  if (!actual) return null

  const resultado = await pool.query(
    `UPDATE categoria
     SET nombre = $2, es_destacada = $3
     WHERE id_categoria = $1
     RETURNING id_categoria, nombre, es_destacada`,
    [id, cambios.nombre ?? actual.nombre, cambios.esDestacada ?? actual.esDestacada],
  )
  return resultado.rows.length > 0 ? filaACategoria(resultado.rows[0]) : null
}

export async function borrarCategoria(id) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const categoria = await cliente.query(
      'SELECT id_categoria FROM categoria WHERE id_categoria = $1 FOR UPDATE',
      [id],
    )
    if (categoria.rowCount === 0) {
      await cliente.query('COMMIT')
      return false
    }

    const productos = await cliente.query(
      'SELECT EXISTS (SELECT 1 FROM producto WHERE id_categoria = $1) AS tiene_productos',
      [id],
    )
    if (productos.rows[0].tiene_productos) {
      const error = new Error('No se puede eliminar la categoria porque tiene productos asociados')
      error.status = 409
      throw error
    }

    await cliente.query('DELETE FROM categoria WHERE id_categoria = $1', [id])
    await cliente.query('COMMIT')
    return true
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

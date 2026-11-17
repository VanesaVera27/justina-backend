import { asegurarConfiguracionParaBanner } from './configuracionRepository.js'
import { pool } from './pool.js'

function filaABanner(fila) {
  return {
    id: String(fila.id_banner),
    titulo: fila.titulo,
    subtitulo: fila.subtitulo,
    descripcion: fila.descripcion,
    urlImagen: fila.url_imagen,
    linkReferencia: fila.link_referencia,
    estaActivo: Boolean(fila.esta_activo),
    fecha: new Date(fila.fecha).toISOString(),
  }
}

const COLUMNAS = `id_banner, titulo, subtitulo, descripcion, url_imagen,
                  link_referencia, esta_activo, fecha`
const COLUMNAS_EDITABLES = {
  titulo: 'titulo',
  subtitulo: 'subtitulo',
  descripcion: 'descripcion',
  urlImagen: 'url_imagen',
  linkReferencia: 'link_referencia',
  estaActivo: 'esta_activo',
}

export async function listarBanners() {
  const resultado = await pool.query(`SELECT ${COLUMNAS} FROM banners ORDER BY fecha DESC, id_banner DESC`)
  return resultado.rows.map(filaABanner)
}

export async function buscarBannerPorId(id) {
  const resultado = await pool.query(
    `SELECT ${COLUMNAS} FROM banners WHERE id_banner = $1`,
    [id],
  )
  return resultado.rows.length > 0 ? filaABanner(resultado.rows[0]) : null
}

export async function crearBanner(banner) {
  const idConfiguracion = await asegurarConfiguracionParaBanner()
  const resultado = await pool.query(
    `INSERT INTO banners (
       titulo, subtitulo, descripcion, url_imagen, link_referencia, esta_activo, id_configuracion
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLUMNAS}`,
    [
      banner.titulo,
      banner.subtitulo,
      banner.descripcion,
      banner.urlImagen,
      banner.linkReferencia,
      banner.estaActivo,
      idConfiguracion,
    ],
  )
  return filaABanner(resultado.rows[0])
}

export async function guardarBanner(id, cambios) {
  const valores = [id]
  const asignaciones = Object.entries(cambios).map(([campo, valor]) => {
    const columna = COLUMNAS_EDITABLES[campo]
    if (!columna) throw new Error(`Campo de banner no persistible: "${campo}"`)
    valores.push(valor)
    return `${columna} = $${valores.length}`
  })
  const resultado = await pool.query(
    `UPDATE banners
     SET ${asignaciones.join(', ')}
     WHERE id_banner = $1
     RETURNING ${COLUMNAS}`,
    valores,
  )
  return resultado.rows.length > 0 ? filaABanner(resultado.rows[0]) : null
}

export async function borrarBanner(id) {
  const resultado = await pool.query('DELETE FROM banners WHERE id_banner = $1', [id])
  return resultado.rowCount === 1
}

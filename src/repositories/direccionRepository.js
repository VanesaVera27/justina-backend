import { pool } from './pool.js'

const COLUMNAS_DIRECCION = {
  calle: 'calle',
  numero: 'numero',
  localidad: 'localidad',
  codigoPostal: 'codigo_postal',
  provincia: 'provincia',
  pais: 'pais',
  dpto: 'dpto',
}

function filaADireccion(fila) {
  return {
    id: String(fila.id_direccion),
    calle: fila.calle,
    numero: fila.numero,
    localidad: fila.localidad,
    codigoPostal: fila.codigo_postal,
    provincia: fila.provincia,
    pais: fila.pais,
    dpto: fila.dpto,
    esPrincipal: Boolean(fila.es_principal),
  }
}

export async function listarDireccionesDeUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT d.id_direccion, d.calle, d.numero, d.localidad, d.codigo_postal,
            d.provincia, d.pais, d.dpto, ud.es_principal
     FROM usuario_direccion ud
     JOIN direccion d ON d.id_direccion = ud.id_direccion
     WHERE ud.id_usuario = $1
     ORDER BY ud.es_principal DESC, d.id_direccion`,
    [usuarioId],
  )
  return resultado.rows.map(filaADireccion)
}

export async function crearDireccionDeUsuario(usuarioId, direccion) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const usuario = await cliente.query(
      'SELECT id_usuario FROM usuario WHERE id_usuario = $1 FOR UPDATE',
      [usuarioId],
    )
    if (usuario.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return null
    }

    if (direccion.esPrincipal) {
      await cliente.query(
        'UPDATE usuario_direccion SET es_principal = FALSE WHERE id_usuario = $1',
        [usuarioId],
      )
    }

    const nueva = await cliente.query(
      `INSERT INTO direccion
         (calle, numero, localidad, codigo_postal, provincia, pais, dpto)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_direccion, calle, numero, localidad, codigo_postal,
                 provincia, pais, dpto`,
      [
        direccion.calle,
        direccion.numero,
        direccion.localidad,
        direccion.codigoPostal,
        direccion.provincia,
        direccion.pais,
        direccion.dpto,
      ],
    )
    await cliente.query(
      'INSERT INTO usuario_direccion (id_direccion, id_usuario, es_principal) VALUES ($1, $2, $3)',
      [nueva.rows[0].id_direccion, usuarioId, direccion.esPrincipal],
    )
    await cliente.query('COMMIT')
    return filaADireccion({ ...nueva.rows[0], es_principal: direccion.esPrincipal })
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

export async function actualizarDireccionDeUsuario(usuarioId, direccionId, cambios) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const usuario = await cliente.query(
      'SELECT id_usuario FROM usuario WHERE id_usuario = $1 FOR UPDATE',
      [usuarioId],
    )
    if (usuario.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return null
    }

    const asociada = await cliente.query(
      `SELECT d.id_direccion, d.calle, d.numero, d.localidad, d.codigo_postal,
              d.provincia, d.pais, d.dpto, ud.es_principal,
              (SELECT COUNT(*) FROM usuario_direccion otros
               WHERE otros.id_direccion = d.id_direccion) AS cantidad_usuarios
       FROM usuario_direccion ud
       JOIN direccion d ON d.id_direccion = ud.id_direccion
       WHERE ud.id_usuario = $1 AND ud.id_direccion = $2
       FOR UPDATE OF ud, d`,
      [usuarioId, direccionId],
    )
    if (asociada.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return null
    }

    const actual = asociada.rows[0]
    const tieneCambiosDireccion = Object.keys(cambios).some((campo) => campo !== 'esPrincipal')
    const esPrincipal = Object.hasOwn(cambios, 'esPrincipal')
      ? cambios.esPrincipal
      : Boolean(actual.es_principal)
    if (esPrincipal) {
      await cliente.query(
        `UPDATE usuario_direccion
         SET es_principal = FALSE
         WHERE id_usuario = $1 AND id_direccion <> $2`,
        [usuarioId, direccionId],
      )
    }

    let fila = actual
    if (tieneCambiosDireccion && Number(actual.cantidad_usuarios) > 1) {
      const datos = {
        calle: cambios.calle ?? actual.calle,
        numero: cambios.numero ?? actual.numero,
        localidad: cambios.localidad ?? actual.localidad,
        codigoPostal: cambios.codigoPostal ?? actual.codigo_postal,
        provincia: cambios.provincia ?? actual.provincia,
        pais: cambios.pais ?? actual.pais,
        dpto: Object.hasOwn(cambios, 'dpto') ? cambios.dpto : actual.dpto,
      }
      const copia = await cliente.query(
        `INSERT INTO direccion
           (calle, numero, localidad, codigo_postal, provincia, pais, dpto)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_direccion, calle, numero, localidad, codigo_postal,
                   provincia, pais, dpto`,
        [datos.calle, datos.numero, datos.localidad, datos.codigoPostal, datos.provincia, datos.pais, datos.dpto],
      )
      await cliente.query(
        'DELETE FROM usuario_direccion WHERE id_usuario = $1 AND id_direccion = $2',
        [usuarioId, direccionId],
      )
      await cliente.query(
        'INSERT INTO usuario_direccion (id_direccion, id_usuario, es_principal) VALUES ($1, $2, $3)',
        [copia.rows[0].id_direccion, usuarioId, esPrincipal],
      )
      fila = copia.rows[0]
    } else if (tieneCambiosDireccion) {
      const campos = Object.keys(cambios).filter((campo) => campo !== 'esPrincipal')
      const asignaciones = campos.map((campo, indice) => `${COLUMNAS_DIRECCION[campo]} = $${indice + 2}`)
      const valores = campos.map((campo) => cambios[campo])
      const actualizado = await cliente.query(
        `UPDATE direccion
         SET ${asignaciones.join(', ')}
         WHERE id_direccion = $1
         RETURNING id_direccion, calle, numero, localidad, codigo_postal,
                   provincia, pais, dpto`,
        [direccionId, ...valores],
      )
      fila = actualizado.rows[0]
    }

    await cliente.query(
      `UPDATE usuario_direccion
       SET es_principal = $3
       WHERE id_usuario = $1 AND id_direccion = $2`,
      [usuarioId, fila.id_direccion, esPrincipal],
    )
    await cliente.query('COMMIT')
    return filaADireccion({ ...fila, es_principal: esPrincipal })
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

export async function borrarDireccionDeUsuario(usuarioId, direccionId) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const usuario = await cliente.query(
      'SELECT id_usuario FROM usuario WHERE id_usuario = $1 FOR UPDATE',
      [usuarioId],
    )
    if (usuario.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return false
    }
    const asociacion = await cliente.query(
      'DELETE FROM usuario_direccion WHERE id_usuario = $1 AND id_direccion = $2 RETURNING id_direccion',
      [usuarioId, direccionId],
    )
    if (asociacion.rowCount === 0) {
      await cliente.query('ROLLBACK')
      return false
    }

    await cliente.query(
      `DELETE FROM direccion d
       WHERE d.id_direccion = $1
         AND NOT EXISTS (
           SELECT 1 FROM usuario_direccion ud WHERE ud.id_direccion = d.id_direccion
         )
         AND NOT EXISTS (
           SELECT 1 FROM pedido p WHERE p.id_direccion = d.id_direccion
         )`,
      [direccionId],
    )
    await cliente.query('COMMIT')
    return true
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

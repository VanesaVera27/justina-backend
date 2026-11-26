import { pool } from './pool.js'

function filaAUsuario(fila) {
  return {
    id: String(fila.id_usuario),
    nombre: fila.nombre,
    apellido: fila.apellido,
    email: fila.email,
    emailVerificado: Boolean(fila.email_verificado),
    idRol: String(fila.id_rol),
    fechaCreacion: fila.fecha_creacion == null ? null : fila.fecha_creacion.toISOString(),
    dni: fila.dni,
    telefono: fila.telefono,
    activo: Boolean(fila.activo),
  }
}

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

function traducirErrorPostgres(error) {
  if (error.code === '23505') lanzarError(409, 'Ya existe un usuario con ese email')
  if (error.code === '23503') lanzarError(400, 'idRol no existe')
  if (error.code === '22P02' || error.code === '22003') lanzarError(400, 'El id de usuario o idRol no es válido')
  return error
}

export async function listarUsuarios() {
  const resultado = await pool.query(
    `SELECT id_usuario, nombre, apellido, email, email_verificado, id_rol,
            fecha_creacion, dni, telefono, activo
     FROM usuario
     ORDER BY id_usuario`,
  )
  return resultado.rows.map(filaAUsuario)
}

export async function buscarUsuarioPorId(id) {
  const resultado = await pool.query(
    `SELECT id_usuario, nombre, apellido, email, email_verificado, id_rol,
            fecha_creacion, dni, telefono, activo
     FROM usuario
     WHERE id_usuario = $1`,
    [id],
  )
  return resultado.rows.length > 0 ? filaAUsuario(resultado.rows[0]) : null
}

export async function crearUsuario(usuario) {
  try {
    const resultado = await pool.query(
      `INSERT INTO usuario
         (nombre, apellido, email, email_verificado, password_hash, id_rol, dni, telefono, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id_usuario, nombre, apellido, email, email_verificado, id_rol,
                 fecha_creacion, dni, telefono, activo`,
      [
        usuario.nombre,
        usuario.apellido,
        usuario.email,
        usuario.emailVerificado,
        usuario.passwordHash,
        usuario.idRol,
        usuario.dni,
        usuario.telefono,
        usuario.activo,
      ],
    )
    return filaAUsuario(resultado.rows[0])
  } catch (error) {
    throw traducirErrorPostgres(error)
  }
}

export async function actualizarUsuario(id, cambios) {
  const columnas = {
    nombre: ['nombre', 'nombre'],
    apellido: ['apellido', 'apellido'],
    email: ['email', 'email'],
    emailVerificado: ['email_verificado', 'emailVerificado'],
    passwordHash: ['password_hash', 'passwordHash'],
    idRol: ['id_rol', 'idRol'],
    dni: ['dni', 'dni'],
    telefono: ['telefono', 'telefono'],
    activo: ['activo', 'activo'],
  }
  const campos = Object.keys(cambios)
  const asignaciones = campos.map((campo, indice) => `${columnas[campo][0]} = $${indice + 2}`)
  const valores = campos.map((campo) => cambios[campo])
  try {
    const resultado = await pool.query(
      `UPDATE usuario
       SET ${asignaciones.join(', ')}
       WHERE id_usuario = $1
       RETURNING id_usuario, nombre, apellido, email, email_verificado, id_rol,
                 fecha_creacion, dni, telefono, activo`,
      [id, ...valores],
    )
    return resultado.rows.length > 0 ? filaAUsuario(resultado.rows[0]) : null
  } catch (error) {
    throw traducirErrorPostgres(error)
  }
}

export async function borrarUsuario(id) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const usuario = await cliente.query(
      'SELECT id_usuario FROM usuario WHERE id_usuario = $1 FOR UPDATE',
      [id],
    )
    if (usuario.rowCount === 0) {
      await cliente.query('COMMIT')
      return false
    }

    const pedidos = await cliente.query(
      'SELECT EXISTS (SELECT 1 FROM pedido WHERE id_usuario = $1) AS tiene_pedidos',
      [id],
    )
    if (pedidos.rows[0].tiene_pedidos) {
      lanzarError(409, 'No se puede eliminar el usuario porque tiene pedidos asociados')
    }

    const direcciones = await cliente.query(
      'SELECT id_direccion FROM usuario_direccion WHERE id_usuario = $1',
      [id],
    )
    await cliente.query('DELETE FROM usuario WHERE id_usuario = $1', [id])
    await cliente.query(
      `DELETE FROM direccion d
       WHERE d.id_direccion = ANY($1::bigint[])
         AND NOT EXISTS (
           SELECT 1 FROM usuario_direccion ud WHERE ud.id_direccion = d.id_direccion
         )
         AND NOT EXISTS (
           SELECT 1 FROM pedido p WHERE p.id_direccion = d.id_direccion
         )`,
      [direcciones.rows.map((fila) => fila.id_direccion)],
    )
    await cliente.query('COMMIT')
    return true
  } catch (error) {
    await cliente.query('ROLLBACK')
    if (error.code === '23503') lanzarError(409, 'No se puede eliminar el usuario porque tiene otros datos asociados')
    throw traducirErrorPostgres(error)
  } finally {
    cliente.release()
  }
}

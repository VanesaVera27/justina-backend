import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { promisify } from 'node:util'
import { crearUsuario as crearUsuarioDominio, editarUsuario as editarUsuarioDominio, validarIdUsuario } from '../domain/usuario.js'
import { actualizarUsuario, borrarUsuario, buscarUsuarioPorId, crearUsuario, listarUsuarios } from '../repositories/usuarioRepository.js'

const scrypt = promisify(scryptCallback)

async function generarHashContrasena(contrasena) {
  const sal = randomBytes(16).toString('hex')
  const clave = await scrypt(contrasena, sal, 64)
  return `scrypt$${sal}$${clave.toString('hex')}`
}

function lanzarNoEncontrado() {
  const error = new Error('Usuario no encontrado')
  error.status = 404
  throw error
}

export async function obtenerUsuarios() {
  return listarUsuarios()
}

export async function obtenerUsuario(id) {
  const usuario = await buscarUsuarioPorId(validarIdUsuario(id))
  if (!usuario) lanzarNoEncontrado()
  return usuario
}

export async function crearUnUsuario(datos) {
  const usuario = crearUsuarioDominio(datos)
  const passwordHash = await generarHashContrasena(usuario.contrasena)
  const { contrasena: _contrasena, ...campos } = usuario
  return crearUsuario({ ...campos, passwordHash })
}

export async function editarUsuarioExistente(id, datos) {
  const idValidado = validarIdUsuario(id)
  const cambios = editarUsuarioDominio(datos)
  if (Object.hasOwn(cambios, 'contrasena')) {
    cambios.passwordHash = await generarHashContrasena(cambios.contrasena)
    delete cambios.contrasena
  }
  const usuario = await actualizarUsuario(idValidado, cambios)
  if (!usuario) lanzarNoEncontrado()
  return usuario
}

export async function eliminarUsuario(id) {
  const eliminado = await borrarUsuario(validarIdUsuario(id))
  if (!eliminado) lanzarNoEncontrado()
}

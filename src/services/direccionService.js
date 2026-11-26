import { crearDireccion as crearDireccionDominio, editarDireccion as editarDireccionDominio, validarIdDireccion } from '../domain/direccion.js'
import { validarIdUsuario } from '../domain/usuario.js'
import { actualizarDireccionDeUsuario, borrarDireccionDeUsuario, crearDireccionDeUsuario, listarDireccionesDeUsuario } from '../repositories/direccionRepository.js'
import { obtenerUsuario } from './usuarioService.js'

export async function obtenerDireccionesDeUsuario(usuarioId) {
  const id = validarIdUsuario(usuarioId)
  await obtenerUsuario(id)
  return listarDireccionesDeUsuario(id)
}

export async function crearDireccionParaUsuario(usuarioId, datos) {
  const id = validarIdUsuario(usuarioId)
  const direccion = crearDireccionDominio(datos)
  const creada = await crearDireccionDeUsuario(id, direccion)
  if (!creada) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }
  return creada
}

export async function editarDireccionDeUsuario(usuarioId, direccionId, cambios) {
  const id = validarIdUsuario(usuarioId)
  const direccion = validarIdDireccion(direccionId)
  const editados = editarDireccionDominio(cambios)
  const actualizada = await actualizarDireccionDeUsuario(id, direccion, editados)
  if (!actualizada) {
    const error = new Error('Usuario o dirección no encontrada')
    error.status = 404
    throw error
  }
  return actualizada
}

export async function eliminarDireccionDeUsuario(usuarioId, direccionId) {
  const id = validarIdUsuario(usuarioId)
  const direccion = validarIdDireccion(direccionId)
  const eliminada = await borrarDireccionDeUsuario(id, direccion)
  if (!eliminada) {
    const error = new Error('Usuario o dirección no encontrada')
    error.status = 404
    throw error
  }
}

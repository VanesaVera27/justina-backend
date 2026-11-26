import { crearDireccionParaUsuario, editarDireccionDeUsuario, eliminarDireccionDeUsuario, obtenerDireccionesDeUsuario } from '../services/direccionService.js'

export async function listarDirecciones(req, res) {
  res.status(200).json(await obtenerDireccionesDeUsuario(req.params.usuarioId))
}

export async function crearDireccion(req, res) {
  res.status(201).json(await crearDireccionParaUsuario(req.params.usuarioId, req.body))
}

export async function editarDireccion(req, res) {
  res.status(200).json(await editarDireccionDeUsuario(req.params.usuarioId, req.params.direccionId, req.body))
}

export async function eliminarDireccion(req, res) {
  await eliminarDireccionDeUsuario(req.params.usuarioId, req.params.direccionId)
  res.status(204).send()
}

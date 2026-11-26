import { crearUnUsuario, editarUsuarioExistente, eliminarUsuario, obtenerUsuario, obtenerUsuarios } from '../services/usuarioService.js'

export async function listarUsuarios(req, res) {
  res.status(200).json(await obtenerUsuarios())
}

export async function obtenerUsuarioPorId(req, res) {
  res.status(200).json(await obtenerUsuario(req.params.id))
}

export async function crearUsuario(req, res) {
  res.status(201).json(await crearUnUsuario(req.body))
}

export async function editarUsuario(req, res) {
  res.status(200).json(await editarUsuarioExistente(req.params.id, req.body))
}

export async function eliminarUsuarioPorId(req, res) {
  await eliminarUsuario(req.params.id)
  res.status(204).send()
}

import { crearUnaCategoria, editarCategoriaExistente, eliminarCategoria, obtenerCategorias } from '../services/categoriaService.js'

export async function listarCategorias(req, res) {
  res.status(200).json(await obtenerCategorias())
}

export async function crearCategoria(req, res) {
  res.status(201).json(await crearUnaCategoria(req.body))
}

export async function editarCategoria(req, res) {
  res.status(200).json(await editarCategoriaExistente(req.params.id, req.body))
}

export async function eliminarCategoriaPorId(req, res) {
  await eliminarCategoria(req.params.id)
  res.status(204).send()
}

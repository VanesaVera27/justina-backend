import { crearCategoria as crearCategoriaDominio, editarCategoria as editarCategoriaDominio } from '../domain/categoria.js'
import { borrarCategoria, crearCategoria, guardarCategoria, listarCategorias } from '../repositories/categoriaRepository.js'

export async function obtenerCategorias() {
  return listarCategorias()
}

export async function crearUnaCategoria(datos) {
  return crearCategoria(crearCategoriaDominio(datos))
}

export async function editarCategoriaExistente(id, cambios) {
  const editados = editarCategoriaDominio(cambios)
  const categoria = await guardarCategoria(id, editados)
  if (!categoria) {
    const error = new Error('Categoria no encontrada')
    error.status = 404
    throw error
  }
  return categoria
}

export async function eliminarCategoria(id) {
  const eliminada = await borrarCategoria(id)
  if (!eliminada) {
    const error = new Error('Categoria no encontrada')
    error.status = 404
    throw error
  }
}

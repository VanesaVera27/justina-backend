import { validarNuevoFavorito, validarIdProducto } from '../domain/favorito.js'
import { validarIdUsuario } from '../domain/usuario.js'
import { agregarFavorito, borrarFavorito, listarFavoritosDeUsuario } from '../repositories/favoritoRepository.js'
import { obtenerUsuario } from './usuarioService.js'

async function validarUsuario(usuarioId) {
  const id = validarIdUsuario(usuarioId)
  await obtenerUsuario(id)
  return id
}

export async function obtenerFavoritosDeUsuario(usuarioId) {
  return listarFavoritosDeUsuario(await validarUsuario(usuarioId))
}

export async function agregarFavoritoAUsuario(usuarioId, datos) {
  const idUsuario = await validarUsuario(usuarioId)
  const idProducto = validarNuevoFavorito(datos)
  const resultado = await agregarFavorito(idUsuario, idProducto)
  if (resultado === 'producto-no-encontrado') {
    const error = new Error('Producto no encontrado')
    error.status = 404
    throw error
  }
  return idProducto
}

export async function quitarFavoritoDeUsuario(usuarioId, productoId) {
  const idUsuario = await validarUsuario(usuarioId)
  const idProducto = validarIdProducto(productoId)
  const eliminado = await borrarFavorito(idUsuario, idProducto)
  if (!eliminado) {
    const error = new Error('Favorito no encontrado')
    error.status = 404
    throw error
  }
}

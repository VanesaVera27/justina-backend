import { agregarFavoritoAUsuario, obtenerFavoritosDeUsuario, quitarFavoritoDeUsuario } from '../services/favoritoService.js'

export async function listarFavoritos(req, res) {
  res.status(200).json(await obtenerFavoritosDeUsuario(req.params.usuarioId))
}

export async function agregarFavorito(req, res) {
  const productoId = await agregarFavoritoAUsuario(req.params.usuarioId, req.body)
  res.status(201).json({ productoId })
}

export async function eliminarFavorito(req, res) {
  await quitarFavoritoDeUsuario(req.params.usuarioId, req.params.productoId)
  res.status(204).send()
}

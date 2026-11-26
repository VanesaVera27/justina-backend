import { validarIdUsuario } from '../domain/usuario.js'
import { listarPedidosDeUsuario } from '../repositories/pedidoRepository.js'

export async function obtenerPedidosDeUsuario(usuarioId) {
  const pedidos = await listarPedidosDeUsuario(validarIdUsuario(usuarioId))
  if (pedidos === null) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }
  return pedidos
}

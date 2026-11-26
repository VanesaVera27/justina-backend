import { obtenerPedidosDeUsuario } from '../services/pedidoService.js'

export async function listarPedidosDeUsuario(req, res) {
  res.status(200).json(await obtenerPedidosDeUsuario(req.params.usuarioId))
}

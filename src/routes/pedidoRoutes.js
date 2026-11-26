import { Router } from 'express'
import { listarPedidosDeUsuario } from '../controllers/pedidoController.js'

const router = Router()

router.get('/usuarios/:usuarioId/pedidos', listarPedidosDeUsuario)

export default router

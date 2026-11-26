import { Router } from 'express'
import { agregarFavorito, eliminarFavorito, listarFavoritos } from '../controllers/favoritoController.js'

const router = Router()

router.route('/usuarios/:usuarioId/favoritos').get(listarFavoritos).post(agregarFavorito)
router.delete('/usuarios/:usuarioId/favoritos/:productoId', eliminarFavorito)

export default router

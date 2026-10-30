import { Router } from 'express'
import { crearCategoria, editarCategoria, eliminarCategoriaPorId, listarCategorias } from '../controllers/categoriaController.js'

const router = Router()

router.route('/categorias').get(listarCategorias).post(crearCategoria)
router.route('/categorias/:id').patch(editarCategoria).delete(eliminarCategoriaPorId)

export default router

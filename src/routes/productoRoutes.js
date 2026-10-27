import { Router } from 'express'
import { crearProducto, listarProductos, obtenerProducto, editarProducto, darDeBajaProducto, crearVarianteDeProducto } from '../controllers/productoController.js'

const router = Router()

router.route('/productos').post(crearProducto).get(listarProductos)

router.route('/productos/:id').get(obtenerProducto).patch(editarProducto).delete(darDeBajaProducto)

router.post('/productos/:id/variantes', crearVarianteDeProducto)

export default router

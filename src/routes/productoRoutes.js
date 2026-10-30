import { Router } from 'express'
import { crearProducto, listarProductos, obtenerProducto, editarProducto, darDeBajaProducto, crearVarianteDeProducto, editarVarianteDeProducto, quitarVarianteDeProducto } from '../controllers/productoController.js'
import { recibirFotosVariante } from '../middlewares/recibirFotosVariante.js'

const router = Router()

router.route('/productos').post(crearProducto).get(listarProductos)

router.route('/productos/:id').get(obtenerProducto).patch(editarProducto).delete(darDeBajaProducto)

router.post('/productos/:id/variantes', recibirFotosVariante, crearVarianteDeProducto)
router.patch('/productos/:productoId/variantes/:varianteId', recibirFotosVariante, editarVarianteDeProducto)
router.delete('/productos/:productoId/variantes/:varianteId', quitarVarianteDeProducto)

export default router

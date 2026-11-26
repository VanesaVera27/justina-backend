import { Router } from 'express'
import bannerRoutes from './bannerRoutes.js'
import categoriaRoutes from './categoriaRoutes.js'
import configuracionRoutes from './configuracionRoutes.js'
import direccionRoutes from './direccionRoutes.js'
import favoritoRoutes from './favoritoRoutes.js'
import imagenRoutes from './imagenRoutes.js'
import pedidoRoutes from './pedidoRoutes.js'
import productoRoutes from './productoRoutes.js'
import usuarioRoutes from './usuarioRoutes.js'

const router = Router()

router.use(categoriaRoutes)
router.use(configuracionRoutes)
router.use(bannerRoutes)
router.use(usuarioRoutes)
router.use(direccionRoutes)
router.use(pedidoRoutes)
router.use(favoritoRoutes)
router.use(imagenRoutes)
router.use(productoRoutes)

export default router

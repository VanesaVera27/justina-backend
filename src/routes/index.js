import { Router } from 'express'
import bannerRoutes from './bannerRoutes.js'
import categoriaRoutes from './categoriaRoutes.js'
import configuracionRoutes from './configuracionRoutes.js'
import imagenRoutes from './imagenRoutes.js'
import productoRoutes from './productoRoutes.js'

const router = Router()

router.use(categoriaRoutes)
router.use(configuracionRoutes)
router.use(bannerRoutes)
router.use(imagenRoutes)
router.use(productoRoutes)

export default router

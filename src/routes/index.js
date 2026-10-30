import { Router } from 'express'
import categoriaRoutes from './categoriaRoutes.js'
import imagenRoutes from './imagenRoutes.js'
import productoRoutes from './productoRoutes.js'

const router = Router()

router.use(categoriaRoutes)
router.use(imagenRoutes)
router.use(productoRoutes)

export default router

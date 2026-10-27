import { Router } from 'express'
import productoRoutes from './productoRoutes.js'

const router = Router()

router.use(productoRoutes)

export default router

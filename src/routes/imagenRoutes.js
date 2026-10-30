import { Router } from 'express'
import { crearImagen } from '../controllers/imagenController.js'
import { recibirImagen } from '../middlewares/recibirImagen.js'

const router = Router()

router.post('/imagenes', recibirImagen, crearImagen)

export default router

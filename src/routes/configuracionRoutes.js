import { Router } from 'express'
import { guardarConfiguracion, leerConfiguracion } from '../controllers/configuracionController.js'

const router = Router()

router.route('/configuracion').get(leerConfiguracion).put(guardarConfiguracion)

export default router

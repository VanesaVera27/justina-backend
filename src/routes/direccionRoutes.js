import { Router } from 'express'
import { crearDireccion, editarDireccion, eliminarDireccion, listarDirecciones } from '../controllers/direccionController.js'

const router = Router()

router.route('/usuarios/:usuarioId/direcciones').get(listarDirecciones).post(crearDireccion)
router.route('/usuarios/:usuarioId/direcciones/:direccionId').patch(editarDireccion).delete(eliminarDireccion)

export default router

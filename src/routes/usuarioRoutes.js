import { Router } from 'express'
import { crearUsuario, editarUsuario, eliminarUsuarioPorId, listarUsuarios, obtenerUsuarioPorId } from '../controllers/usuarioController.js'

const router = Router()

router.route('/usuarios').get(listarUsuarios).post(crearUsuario)
router.route('/usuarios/:id').get(obtenerUsuarioPorId).patch(editarUsuario).delete(eliminarUsuarioPorId)

export default router

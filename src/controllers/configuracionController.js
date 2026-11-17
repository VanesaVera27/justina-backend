import { actualizarConfiguracionTienda, obtenerConfiguracionTienda } from '../services/configuracionService.js'

export async function leerConfiguracion(req, res) {
  res.status(200).json(await obtenerConfiguracionTienda())
}

export async function guardarConfiguracion(req, res) {
  res.status(200).json(await actualizarConfiguracionTienda(req.body))
}

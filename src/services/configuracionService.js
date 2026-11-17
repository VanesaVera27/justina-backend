import { validarConfiguracion } from '../domain/configuracion.js'
import { guardarConfiguracion, obtenerConfiguracion } from '../repositories/configuracionRepository.js'

export async function obtenerConfiguracionTienda() {
  return obtenerConfiguracion()
}

export async function actualizarConfiguracionTienda(datos) {
  return guardarConfiguracion(validarConfiguracion(datos))
}

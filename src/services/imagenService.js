import { validarImagen } from '../domain/imagen.js'
import { buscarImagenPorNombre as buscarImagenPorNombreRepositorio, guardarImagen } from '../repositories/imagenRepository.js'

export async function crearUnaImagen(archivo) {
  return guardarImagen(validarImagen(archivo))
}

export async function obtenerUrlImagenPorNombre(nombre) {
  return buscarImagenPorNombreRepositorio(nombre)
}

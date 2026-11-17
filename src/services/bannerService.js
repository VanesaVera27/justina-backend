import { crearBanner as crearBannerDominio, editarBanner, validarIdBanner } from '../domain/banner.js'
import { borrarBanner, crearBanner, guardarBanner, listarBanners } from '../repositories/bannerRepository.js'

function lanzarNoEncontrado() {
  const error = new Error('Banner no encontrado')
  error.status = 404
  throw error
}

export async function obtenerBanners() {
  return listarBanners()
}

export async function crearUnBanner(datos) {
  return crearBanner(crearBannerDominio(datos))
}

export async function editarBannerExistente(id, cambios) {
  const bannerId = validarIdBanner(id)
  const editados = editarBanner(cambios)
  const guardado = await guardarBanner(bannerId, editados)
  if (!guardado) lanzarNoEncontrado()
  return guardado
}

export async function eliminarBanner(id) {
  const bannerId = validarIdBanner(id)
  if (!await borrarBanner(bannerId)) lanzarNoEncontrado()
}

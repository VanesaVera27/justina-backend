import { crearUnBanner, editarBannerExistente, eliminarBanner, obtenerBanners } from '../services/bannerService.js'

export async function listarBannersHttp(req, res) {
  res.status(200).json(await obtenerBanners())
}

export async function crearBannerHttp(req, res) {
  res.status(201).json(await crearUnBanner(req.body))
}

export async function editarBannerHttp(req, res) {
  res.status(200).json(await editarBannerExistente(req.params.id, req.body))
}

export async function eliminarBannerHttp(req, res) {
  await eliminarBanner(req.params.id)
  res.status(204).send()
}

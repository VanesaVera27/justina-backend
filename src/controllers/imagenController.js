import { crearUnaImagen } from '../services/imagenService.js'

export async function crearImagen(req, res) {
  res.status(201).json(await crearUnaImagen(req.file))
}

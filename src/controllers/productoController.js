import { crearUnProducto, obtenerProductos, obtenerProductoPorId, editarProductoExistente, darBajaProducto, agregarVarianteAProducto } from '../services/productoService.js'

export async function crearProducto(req, res) {
  res.status(201).json(await crearUnProducto(req.body))
}

export async function listarProductos(req, res) {
  res.status(200).json(await obtenerProductos())
}

export async function obtenerProducto(req, res) {
  res.status(200).json(await obtenerProductoPorId(req.params.id))
}

export async function editarProducto(req, res) {
  res.status(200).json(await editarProductoExistente(req.params.id, req.body))
}

export async function crearVarianteDeProducto(req, res) {
  res.status(201).json(await agregarVarianteAProducto(req.params.id, req.body))
}

export async function darDeBajaProducto(req, res) {
  await darBajaProducto(req.params.id)
  res.status(204).send()
}

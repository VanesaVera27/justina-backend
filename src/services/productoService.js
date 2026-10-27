import { crearProducto as crearProductoDominio, editarProducto as editarProductoDominio, validarVariante as validarVarianteDominio, conVariantes } from '../domain/producto.js'
import { buscarProductoPorId, crearProducto, guardarProducto, listarProductos, agregarVarianteAProducto as agregarVarianteAProductoRepositorio } from '../repositories/productoRepository.js'

export async function crearUnProducto(datos) {
  const producto = conVariantes(crearProductoDominio(datos))
  return conVariantes(await crearProducto(producto))
}

export async function obtenerProductos() {
  const productos = await listarProductos()
  return productos.map(conVariantes)
}

export async function obtenerProductoPorId(id) {
  const producto = await buscarProductoPorId(id)
  if (!producto) {
    const error = new Error('Producto no encontrado')
    error.status = 404
    throw error
  }
  return conVariantes(producto)
}

export async function editarProductoExistente(id, cambios) {
  const producto = await obtenerProductoPorId(id)
  const editado = editarProductoDominio(producto, cambios)
  return conVariantes(await guardarProducto(conVariantes(editado)))
}

export async function agregarVarianteAProducto(id, datos) {
  const producto = await obtenerProductoPorId(id)
  const variante = validarVarianteDominio(datos)
  return agregarVarianteAProductoRepositorio(producto.id, variante)
}

export async function darBajaProducto(id) {
  const producto = await obtenerProductoPorId(id)
  const dadoDeBaja = editarProductoDominio(producto, { estado: 'inactivo' })
  await guardarProducto(conVariantes(dadoDeBaja))
}

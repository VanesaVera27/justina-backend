import { crearProducto as crearProductoDominio, editarProducto as editarProductoDominio, validarVariante as validarVarianteDominio, conVariantes } from '../domain/producto.js'
import { validarImagen } from '../domain/imagen.js'
import { buscarProductoPorId, crearProducto, guardarProducto, listarProductos, agregarVarianteAProducto as agregarVarianteAProductoRepositorio, actualizarVariante as actualizarVarianteRepositorio, borrarVariante as borrarVarianteRepositorio } from '../repositories/productoRepository.js'
import { guardarFotosDeVariante, descartarFotosDeVariante } from '../repositories/imagenRepository.js'
import { obtenerUrlImagenPorNombre } from './imagenService.js'

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

function convertirCampoJson(datos, campo) {
  if (!Object.hasOwn(datos, campo)) return undefined
  if (typeof datos[campo] !== 'string') return datos[campo]
  try {
    return JSON.parse(datos[campo])
  } catch {
    lanzarError(400, `El campo ${campo} debe ser un JSON valido`)
  }
}

function convertirNumero(datos, campo) {
  if (!Object.hasOwn(datos, campo) || typeof datos[campo] !== 'string') return datos[campo]
  if (datos[campo].trim() === '') lanzarError(400, `El campo ${campo} es obligatorio`)
  const numero = Number(datos[campo])
  if (!Number.isFinite(numero)) lanzarError(400, `El campo ${campo} debe ser numerico`)
  return numero
}

function normalizarCamposVariante(datos, parcial) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError(400, 'El formulario debe incluir los campos de la variante')
  }

  const camposPermitidos = new Set(['sku', 'stock', 'precioUnitario', 'atributos', ...(!parcial ? ['fotos'] : [])])
  const desconocidos = Object.keys(datos).filter((campo) => !camposPermitidos.has(campo))
  if (desconocidos.length > 0) {
    lanzarError(400, `Campo no permitido en la variante: "${desconocidos[0]}"`)
  }

  const campos = { ...datos }
  if (Object.hasOwn(campos, 'stock')) campos.stock = convertirNumero(campos, 'stock')
  if (Object.hasOwn(campos, 'precioUnitario')) campos.precioUnitario = convertirNumero(campos, 'precioUnitario')
  if (Object.hasOwn(campos, 'atributos')) campos.atributos = convertirCampoJson(campos, 'atributos')
  if (typeof campos.fotos === 'string') campos.fotos = convertirCampoJson(campos, 'fotos')
  return campos
}

function validarArchivos(files) {
  return files.map((archivo) => validarImagen({
    buffer: archivo.buffer,
    mimetype: archivo.mimetype,
  }))
}

async function resolverFotosLegadas(fotos) {
  return Promise.all(fotos.map(async (foto) => {
    if ('url' in foto) return foto
    return { url: await obtenerUrlImagenPorNombre(foto.nombre), esPrincipal: foto.esPrincipal }
  }))
}

function fotosParaPersistencia(fotos) {
  return fotos.map(({ url, esPrincipal }) => ({ url, esPrincipal }))
}

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

export async function agregarVarianteAProducto(id, datos, archivos = []) {
  const producto = await obtenerProductoPorId(id)
  const campos = normalizarCamposVariante(datos, false)
  const variante = validarVarianteDominio({ ...campos, fotos: archivos.length > 0 ? [] : campos.fotos })
  const fotosGuardadas = archivos.length > 0
    ? await guardarFotosDeVariante(validarArchivos(archivos))
    : await resolverFotosLegadas(variante.fotos)
  try {
    return await agregarVarianteAProductoRepositorio(producto.id, {
      ...variante,
      fotos: fotosParaPersistencia(fotosGuardadas),
    })
  } catch (error) {
    if (archivos.length > 0) await descartarFotosDeVariante(fotosGuardadas)
    throw error
  }
}

export async function actualizarVarianteDeProducto(productoId, varianteId, datos, archivos = []) {
  const producto = await obtenerProductoPorId(productoId)
  const existente = producto.variantes.find((variante) => variante.id === String(varianteId))
  if (!existente) lanzarError(404, 'Variante no encontrada en el producto')

  const cambios = normalizarCamposVariante(datos, true)
  const variante = validarVarianteDominio({
    sku: Object.hasOwn(cambios, 'sku') ? cambios.sku : existente.sku,
    stock: Object.hasOwn(cambios, 'stock') ? cambios.stock : existente.stock,
    precioUnitario: Object.hasOwn(cambios, 'precioUnitario') ? cambios.precioUnitario : existente.precioUnitario,
    atributos: Object.hasOwn(cambios, 'atributos') ? cambios.atributos : existente.atributos,
    fotos: existente.fotos,
  })

  const fotosGuardadas = archivos.length > 0
    ? await guardarFotosDeVariante(validarArchivos(archivos))
    : existente.fotos
  try {
    const actualizada = await actualizarVarianteRepositorio(
      producto.id,
      varianteId,
      { ...variante, fotos: fotosParaPersistencia(fotosGuardadas) },
      {
        actualizarAtributos: Object.hasOwn(cambios, 'atributos'),
        reemplazarFotos: archivos.length > 0,
      },
    )
    if (!actualizada) lanzarError(404, 'Variante no encontrada en el producto')
    return actualizada
  } catch (error) {
    if (archivos.length > 0) await descartarFotosDeVariante(fotosGuardadas)
    throw error
  }
}

export async function quitarVarianteDeProducto(productoId, varianteId) {
  const producto = await obtenerProductoPorId(productoId)
  const eliminada = await borrarVarianteRepositorio(producto.id, varianteId)
  if (!eliminada) {
    const error = new Error('Variante no encontrada en el producto')
    error.status = 404
    throw error
  }
}

export async function darBajaProducto(id) {
  const producto = await obtenerProductoPorId(id)
  const dadoDeBaja = editarProductoDominio(producto, { estado: 'inactivo' })
  await guardarProducto(conVariantes(dadoDeBaja))
}

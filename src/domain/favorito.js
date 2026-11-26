function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

export function validarIdProducto(id) {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    lanzarError(400, 'El id de producto debe ser un entero positivo')
  }
  return id
}

export function validarNuevoFavorito(datos = {}) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError(400, 'El cuerpo debe ser un objeto')
  }
  const campos = Object.keys(datos)
  const desconocido = campos.find((campo) => campo !== 'productoId')
  if (desconocido) lanzarError(400, `El campo "${desconocido}" no está permitido`)
  if (campos.length !== 1) lanzarError(400, 'productoId es obligatorio')
  const id = typeof datos.productoId === 'number' ? String(datos.productoId) : datos.productoId
  return validarIdProducto(id)
}

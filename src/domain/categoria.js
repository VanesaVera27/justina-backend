function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    lanzarError(400, 'El nombre es obligatorio')
  }
  if (nombre.trim().length > 100) {
    lanzarError(400, 'El nombre no puede superar los 100 caracteres')
  }
  return nombre.trim()
}

export function crearCategoria(datos = {}) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError(400, 'El cuerpo debe ser un objeto')
  }

  for (const campo of Object.keys(datos)) {
    if (!['nombre', 'esDestacada'].includes(campo)) {
      lanzarError(400, `El campo "${campo}" no es editable o no existe`)
    }
  }

  const nombre = validarNombre(datos.nombre)

  const esDestacada = 'esDestacada' in datos ? datos.esDestacada : false
  if (typeof esDestacada !== 'boolean') {
    lanzarError(400, 'esDestacada debe ser booleano')
  }

  return { nombre, esDestacada }
}

export function editarCategoria(cambios = {}) {
  if (typeof cambios !== 'object' || cambios === null || Array.isArray(cambios)) {
    lanzarError(400, 'El cuerpo debe ser un objeto con los campos a editar')
  }

  const campos = Object.keys(cambios)
  if (campos.length === 0) {
    lanzarError(400, 'Debe indicar al menos un campo para editar')
  }

  for (const campo of campos) {
    if (!['nombre', 'esDestacada'].includes(campo)) {
      lanzarError(400, `El campo "${campo}" no es editable o no existe`)
    }
  }

  const editados = {}

  if ('nombre' in cambios) {
    editados.nombre = validarNombre(cambios.nombre)
  }

  if ('esDestacada' in cambios) {
    if (typeof cambios.esDestacada !== 'boolean') {
      lanzarError(400, 'esDestacada debe ser booleano')
    }
    editados.esDestacada = cambios.esDestacada
  }

  return editados
}

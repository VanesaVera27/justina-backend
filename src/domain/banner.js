const CAMPOS = ['titulo', 'subtitulo', 'descripcion', 'urlImagen', 'linkReferencia', 'estaActivo']
const LIMITES = new Map([
  ['titulo', 150],
  ['subtitulo', 255],
  ['urlImagen', 500],
  ['linkReferencia', 500],
])

function lanzarError(mensaje) {
  const error = new Error(mensaje)
  error.status = 400
  throw error
}

function validarTexto(campo, valor, requerido = false) {
  if (valor === null && !requerido) return null
  if (typeof valor !== 'string' || (requerido && valor.trim() === '')) {
    lanzarError(`${campo} debe ser ${requerido ? 'un texto no vacio' : 'un texto o null'}`)
  }
  const normalizado = valor.trim()
  const limite = LIMITES.get(campo)
  if (limite && normalizado.length > limite) lanzarError(`${campo} no puede superar ${limite} caracteres`)
  return normalizado
}

function validarCampos(datos, parcial) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError('El cuerpo debe ser un objeto')
  }
  const campos = Object.keys(datos)
  const desconocidos = campos.filter((campo) => !CAMPOS.includes(campo))
  if (desconocidos.length > 0) lanzarError(`El campo "${desconocidos[0]}" no es editable o no existe`)
  if (parcial && campos.length === 0) lanzarError('Debe indicar al menos un campo para editar')

  const resultado = {}
  for (const campo of ['titulo', 'subtitulo', 'descripcion', 'urlImagen', 'linkReferencia']) {
    if (!Object.hasOwn(datos, campo)) continue
    resultado[campo] = validarTexto(campo, datos[campo], campo === 'titulo' || campo === 'urlImagen')
  }
  if (Object.hasOwn(datos, 'estaActivo')) {
    if (typeof datos.estaActivo !== 'boolean') lanzarError('estaActivo debe ser booleano')
    resultado.estaActivo = datos.estaActivo
  }
  return resultado
}

export function crearBanner(datos = {}) {
  const campos = validarCampos(datos, false)
  if (!Object.hasOwn(campos, 'titulo')) lanzarError('titulo es obligatorio')
  if (!Object.hasOwn(campos, 'urlImagen')) lanzarError('urlImagen es obligatorio')
  return {
    titulo: campos.titulo,
    subtitulo: campos.subtitulo ?? null,
    descripcion: campos.descripcion ?? null,
    urlImagen: campos.urlImagen,
    linkReferencia: campos.linkReferencia ?? null,
    estaActivo: campos.estaActivo ?? true,
  }
}

export function editarBanner(cambios = {}) {
  return validarCampos(cambios, true)
}

export function validarIdBanner(id) {
  if (
    typeof id !== 'string' ||
    !/^[1-9]\d*$/.test(id) ||
    Number(id) > 2147483647
  ) {
    lanzarError('El id del banner no es valido')
  }
  return id
}

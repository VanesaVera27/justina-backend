function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

export function validarIdDireccion(id) {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    lanzarError(400, 'El id de dirección debe ser un entero positivo')
  }
  return id
}

function validarTexto(datos, campo, maximo, obligatorio) {
  const valor = datos[campo]
  if (valor === null && !obligatorio) return null
  if (typeof valor !== 'string' || (obligatorio && valor.trim() === '')) {
    lanzarError(400, `${campo} debe ser ${obligatorio ? 'un texto no vacío' : 'un texto o null'}`)
  }
  const texto = valor.trim()
  if (texto.length > maximo) lanzarError(400, `${campo} no puede superar ${maximo} caracteres`)
  return texto
}

function validarBooleano(valor, campo) {
  if (typeof valor !== 'boolean') lanzarError(400, `${campo} debe ser booleano`)
  return valor
}

function validarObjeto(datos) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError(400, 'El cuerpo debe ser un objeto')
  }
}

function validarCampos(datos, campos) {
  const desconocido = Object.keys(datos).find((campo) => !campos.includes(campo))
  if (desconocido) lanzarError(400, `El campo "${desconocido}" no es editable o no existe`)
}

const CAMPOS_TEXTO = {
  calle: [255, true],
  numero: [50, true],
  localidad: [150, true],
  codigoPostal: [20, true],
  provincia: [100, true],
  pais: [100, true],
  dpto: [50, false],
}

export function crearDireccion(datos = {}) {
  validarObjeto(datos)
  validarCampos(datos, [...Object.keys(CAMPOS_TEXTO), 'esPrincipal'])
  const direccion = {}
  for (const [campo, [maximo, obligatorio]] of Object.entries(CAMPOS_TEXTO)) {
    if (obligatorio && !Object.hasOwn(datos, campo)) lanzarError(400, `${campo} es obligatorio`)
    direccion[campo] = Object.hasOwn(datos, campo)
      ? validarTexto(datos, campo, maximo, obligatorio)
      : null
  }
  direccion.esPrincipal = Object.hasOwn(datos, 'esPrincipal')
    ? validarBooleano(datos.esPrincipal, 'esPrincipal')
    : false
  return direccion
}

export function editarDireccion(cambios = {}) {
  validarObjeto(cambios)
  validarCampos(cambios, [...Object.keys(CAMPOS_TEXTO), 'esPrincipal'])
  if (Object.keys(cambios).length === 0) lanzarError(400, 'Debe indicar al menos un campo para editar')

  const editados = {}
  for (const [campo, [maximo, obligatorio]] of Object.entries(CAMPOS_TEXTO)) {
    if (Object.hasOwn(cambios, campo)) editados[campo] = validarTexto(cambios, campo, maximo, obligatorio)
  }
  if (Object.hasOwn(cambios, 'esPrincipal')) {
    editados.esPrincipal = validarBooleano(cambios.esPrincipal, 'esPrincipal')
  }
  return editados
}

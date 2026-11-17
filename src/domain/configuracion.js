const CAMPOS = [
  'nombre',
  'whatsapp',
  'emailContacto',
  'instagram',
  'tiktok',
  'ubicacion',
  'textoPreheader',
  'paletaSitio',
  'paletaPanel',
]

function lanzarError(mensaje) {
  const error = new Error(mensaje)
  error.status = 400
  throw error
}

function validarTexto(datos, campo, requerido = false) {
  const valor = datos[campo]
  if (valor === null && !requerido) return null
  if (typeof valor !== 'string' || (requerido && valor.trim() === '')) {
    lanzarError(`${campo} debe ser ${requerido ? 'un texto no vacio' : 'un texto o null'}`)
  }
  return valor.trim()
}

function validarPaleta(datos, campo) {
  const paleta = datos[campo]
  if (paleta === null) return null
  if (typeof paleta !== 'object' || Array.isArray(paleta)) {
    lanzarError(`${campo} debe ser un objeto o null`)
  }
  return paleta
}

export function validarConfiguracion(datos = {}) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError('El cuerpo debe ser un objeto')
  }

  const desconocidos = Object.keys(datos).filter((campo) => !CAMPOS.includes(campo))
  if (desconocidos.length > 0) lanzarError(`El campo "${desconocidos[0]}" no es editable o no existe`)

  const faltantes = CAMPOS.filter((campo) => !Object.hasOwn(datos, campo))
  if (faltantes.length > 0) lanzarError(`Faltan campos de configuracion: ${faltantes.join(', ')}`)

  return {
    nombre: validarTexto(datos, 'nombre', true),
    whatsapp: validarTexto(datos, 'whatsapp'),
    emailContacto: validarTexto(datos, 'emailContacto'),
    instagram: validarTexto(datos, 'instagram'),
    tiktok: validarTexto(datos, 'tiktok'),
    ubicacion: validarTexto(datos, 'ubicacion'),
    textoPreheader: validarTexto(datos, 'textoPreheader'),
    paletaSitio: validarPaleta(datos, 'paletaSitio'),
    paletaPanel: validarPaleta(datos, 'paletaPanel'),
  }
}

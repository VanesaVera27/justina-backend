const EXTENSIONES_POR_TIPO = new Map([
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

function coincideFirma(contenido, mimetype) {
  if (mimetype === 'image/png') {
    const firma = [137, 80, 78, 71, 13, 10, 26, 10]
    return firma.every((byte, indice) => contenido[indice] === byte)
  }
  if (mimetype === 'image/jpeg') {
    return contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255
  }
  if (mimetype === 'image/gif') {
    return ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...contenido.subarray(0, 6)))
  }
  if (mimetype === 'image/webp') {
    return (
      String.fromCharCode(...contenido.subarray(0, 4)) === 'RIFF' &&
      String.fromCharCode(...contenido.subarray(8, 12)) === 'WEBP'
    )
  }
  if (mimetype === 'image/avif') {
    return (
      String.fromCharCode(...contenido.subarray(4, 8)) === 'ftyp' &&
      ['avif', 'avis'].includes(String.fromCharCode(...contenido.subarray(8, 12)))
    )
  }
  return false
}

export function validarImagen(archivo) {
  if (!archivo || !(archivo.buffer instanceof Uint8Array) || archivo.buffer.length === 0) {
    lanzarError(400, 'El archivo de imagen es obligatorio')
  }

  const extension = EXTENSIONES_POR_TIPO.get(archivo.mimetype)
  if (!extension) {
    lanzarError(400, 'El archivo debe ser una imagen PNG, JPEG, GIF, WebP o AVIF')
  }
  if (typeof archivo.originalname === 'string') {
    if (
      archivo.originalname.trim() === '' ||
      archivo.originalname === '.' ||
      archivo.originalname === '..' ||
      archivo.originalname.includes('/') ||
      archivo.originalname.includes('\\') ||
      archivo.originalname.includes('\0')
    ) {
      lanzarError(400, 'El nombre del archivo de imagen no es valido')
    }

    const extensionesCompatibles = extension === 'jpg' ? ['jpg', 'jpeg'] : [extension]
    const extensionEnviada = archivo.originalname.split('.').at(-1)?.toLowerCase()
    if (!extensionesCompatibles.includes(extensionEnviada)) {
      lanzarError(400, 'La extension del nombre no coincide con el tipo de imagen')
    }
  }
  if (!coincideFirma(archivo.buffer, archivo.mimetype)) {
    lanzarError(400, 'El contenido del archivo no coincide con su tipo de imagen')
  }

  return {
    contenido: archivo.buffer,
    nombre: typeof archivo.originalname === 'string' ? archivo.originalname : null,
    extension,
  }
}

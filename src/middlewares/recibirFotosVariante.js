import multer from 'multer'

const TAMANO_MAXIMO = 10 * 1024 * 1024
const CANTIDAD_MAXIMA = 10
const TIPOS_PERMITIDOS = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const ERRORES_MULTIPART_INVALIDOS = new Set([
  'Malformed part header',
  'Multipart: Boundary not found',
  'Unexpected end of form',
])

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  return error
}

const recibirArchivos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO, files: CANTIDAD_MAXIMA },
  fileFilter(_req, archivo, callback) {
    if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
      callback(lanzarError(400, 'Las fotos deben ser PNG, JPEG, GIF, WebP o AVIF'))
      return
    }
    callback(null, true)
  },
}).array('fotos', CANTIDAD_MAXIMA)

export function recibirFotosVariante(req, res, next) {
  if (!req.is('multipart/form-data')) {
    next()
    return
  }

  recibirArchivos(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const limiteArchivos = error.code === 'LIMIT_FILE_COUNT'
      const limiteTamano = error.code === 'LIMIT_FILE_SIZE'
      next(lanzarError(
        limiteTamano ? 413 : 400,
        limiteTamano
          ? 'Cada imagen puede pesar como máximo 10 MB'
          : limiteArchivos
            ? `Se permiten hasta ${CANTIDAD_MAXIMA} fotos por variante`
            : 'Formulario multipart invalido; envia los archivos en el campo fotos',
      ))
      return
    }
    if (error) {
      if (Number.isInteger(error.status)) {
        next(error)
        return
      }
      if (ERRORES_MULTIPART_INVALIDOS.has(error.message)) {
        next(lanzarError(400, 'Formulario multipart invalido'))
        return
      }
      next(error)
      return
    }
    if (req.method === 'POST' && (!req.files || req.files.length === 0)) {
      next(lanzarError(400, 'Debes enviar al menos una imagen en el campo fotos'))
      return
    }
    next()
  })
}

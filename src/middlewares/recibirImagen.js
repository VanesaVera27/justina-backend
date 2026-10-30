import multer from 'multer'

const TAMANO_MAXIMO = 10 * 1024 * 1024
const ERRORES_MULTIPART_INVALIDOS = new Set([
  'Malformed part header',
  'Multipart: Boundary not found',
  'Unexpected end of form',
])

const recibirArchivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO, files: 1 },
  fileFilter(_req, archivo, callback) {
    const tiposPermitidos = ['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(archivo.mimetype)) {
      const error = new Error('El archivo debe ser una imagen PNG, JPEG, GIF, WebP o AVIF')
      error.status = 400
      callback(error)
      return
    }
    callback(null, true)
  },
}).single('archivo')

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  return error
}

export function recibirImagen(req, res, next) {
  recibirArchivo(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      next(lanzarError(status, status === 413 ? 'El archivo supera el tamaño máximo de 10 MB' : 'Formulario multipart invalido'))
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
    if (!req.file) {
      next(lanzarError(400, 'El campo archivo es obligatorio'))
      return
    }
    next()
  })
}

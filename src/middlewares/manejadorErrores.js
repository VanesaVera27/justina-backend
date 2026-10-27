export default function manejadorErrores(error, req, res, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500

  if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    res.status(400).json({ error: 'JSON invalido' })
    return
  }

  if (status === 500) {
    process.stderr.write(`[ERROR] ${error.stack ?? error.message}\n`)
    res.status(500).json({ error: 'Error interno del servidor' })
    return
  }

  res.status(status).json({ error: error.message })
}

export default function noEncontrado(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada', ruta: req.originalUrl })
}

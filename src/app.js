import express from 'express'
import { fileURLToPath } from 'node:url'
import routes from './routes/index.js'
import noEncontrado from './middlewares/noEncontrado.js'
import manejadorErrores from './middlewares/manejadorErrores.js'

export function crearApp() {
  const app = express()

  app.use(express.json())
  app.use('/uploads', express.static(fileURLToPath(new URL('../uploads/', import.meta.url)), {
    dotfiles: 'deny',
    index: false,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff')
    },
  }))
  app.use(routes)
  app.use(noEncontrado)
  app.use(manejadorErrores)

  return app
}

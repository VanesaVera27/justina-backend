import os from 'node:os'
import { crearApp } from './app.js'

const PUERTO_POR_DEFECTO = 3000

function obtenerIpsLocales() {
  const interfaces = os.networkInterfaces()
  const ips = []
  for (const redes of Object.values(interfaces)) {
    for (const red of redes ?? []) {
      if (red.family === 'IPv4' && !red.internal) ips.push(red.address)
    }
  }
  return ips
}

const puerto = Number(process.env.PORT) || PUERTO_POR_DEFECTO
const host = process.env.HOST || '0.0.0.0'
const servidor = crearApp().listen(puerto, host, () => {
  process.stdout.write(`Escuchando en http://localhost:${puerto}\n`)
  for (const ip of obtenerIpsLocales()) {
    process.stdout.write(`Accesible en red local: http://${ip}:${puerto}\n`)
  }
})

export default servidor

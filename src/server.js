import { crearApp } from './app.js'

const PUERTO_POR_DEFECTO = 3000

const puerto = Number(process.env.PORT) || PUERTO_POR_DEFECTO
const servidor = crearApp().listen(puerto, () => {
  process.stdout.write(`Escuchando en http://localhost:${puerto}\n`)
})

export default servidor

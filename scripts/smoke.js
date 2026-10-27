// Smoke ejecutable del arnés.
//
// La plantilla está vacía: no hay ni app Express ni endpoints, así que no hay
// nada que verificar todavía.
//
// Contrato: MONO tarea que agrega o cambia un endpoint TIENE que extender este
// script: levanta la app (ver docs/estructura.md), comprueba status,
// Content-Type, body y un caso de error de cada caso nuevo. Sin frameworks de
// tests: solo Node nativo (fetch, node:events).
//
// Estructura sugerida al arrancar el primer endpoint:
//   import { once } from 'node:events'
//   const servidor = crearApp().listen(0)
//   try {
//     await once(servidor, 'listening')
//     const { port } = servidor.address()
//     const base = `http://127.0.0.1:${port}`
//     // ... comprobaciones con fetch(base + '...')
//   } catch (error) {
//     process.stderr.write(`[FAIL] smoke: ${error.message}\n`)
//     process.exitCode = 1
//   } finally {
//     await new Promise((resolve) => servidor.close(resolve))
//   }

process.stdout.write('[OK] smoke: plantilla sin endpoints, nada que verificar\n')

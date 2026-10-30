import { lstat, mkdir, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const directorioImagenes = fileURLToPath(new URL('../../uploads/', import.meta.url))
const directorioImagenesProductos = join(directorioImagenes, 'productos')

export async function guardarImagen(imagen) {
  await mkdir(directorioImagenes, { recursive: true })
  try {
    await writeFile(join(directorioImagenes, imagen.nombre), imagen.contenido, {
      flag: 'wx',
      mode: 0o644,
    })
  } catch (error) {
    if (error.code === 'EEXIST') {
      const conflicto = new Error(`Ya existe una imagen llamada "${imagen.nombre}"`)
      conflicto.status = 409
      throw conflicto
    }
    throw error
  }
  return {
    nombre: imagen.nombre,
    url: `/uploads/${encodeURIComponent(imagen.nombre)}`,
  }
}

export async function buscarImagenPorNombre(nombre) {
  if (
    typeof nombre !== 'string' ||
    nombre.trim() === '' ||
    nombre === '.' ||
    nombre === '..' ||
    nombre.includes('/') ||
    nombre.includes('\\') ||
    nombre.includes('\0')
  ) {
    const error = new Error('El nombre de la imagen no es valido')
    error.status = 400
    throw error
  }

  try {
    const informacion = await lstat(join(directorioImagenes, nombre))
    if (!informacion.isFile()) {
      const error = new Error(`No existe la imagen "${nombre}"`)
      error.status = 404
      throw error
    }
  } catch (error) {
    if (error.status) throw error
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      const noEncontrado = new Error(`No existe la imagen "${nombre}"`)
      noEncontrado.status = 404
      throw noEncontrado
    }
    throw error
  }

  return `/uploads/${encodeURIComponent(nombre)}`
}

export async function guardarFotosDeVariante(imagenes) {
  await mkdir(directorioImagenesProductos, { recursive: true })
  const guardadas = []
  try {
    for (const [indice, imagen] of imagenes.entries()) {
      const nombre = `${randomUUID()}.${imagen.extension}`
      await writeFile(join(directorioImagenesProductos, nombre), imagen.contenido, {
        flag: 'wx',
        mode: 0o644,
      })
      guardadas.push({
        nombre,
        url: `/uploads/productos/${nombre}`,
        esPrincipal: indice === 0,
      })
    }
  } catch (error) {
    await Promise.all(guardadas.map((imagen) => rm(join(directorioImagenesProductos, imagen.nombre))))
    throw error
  }

  return guardadas
}

export async function descartarFotosDeVariante(imagenes) {
  await Promise.all(imagenes.map((imagen) => rm(join(directorioImagenesProductos, imagen.nombre))))
}

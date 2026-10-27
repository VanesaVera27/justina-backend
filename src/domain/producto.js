const VALORES_ESTADO = ['activo', 'inactivo']

function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

// El producto ya no tiene precioUnitario ni fotos propios: el precio es
// derivado (minimo de sus variantes, null si no tiene) y las fotos viven en
// las variantes. Dominio puro: valida y arma el dato de dominio.
export function crearProducto(datos = {}) {
  const { nombre, descripcion = null, marca = null, estado = 'activo' } = datos

  if (typeof nombre !== 'string' || nombre.trim() === '') {
    lanzarError(400, 'El nombre es obligatorio')
  }

  if (descripcion !== null && typeof descripcion !== 'string') {
    lanzarError(400, 'La descripcion debe ser un string o null')
  }

  if (marca !== null && typeof marca !== 'string') {
    lanzarError(400, 'La marca debe ser un string o null')
  }

  if (!VALORES_ESTADO.includes(estado)) {
    lanzarError(400, 'El estado debe ser "activo" o "inactivo"')
  }

  const ahora = new Date().toISOString()

  return {
    id: null,
    nombre: nombre.trim(),
    descripcion,
    marca: typeof marca === 'string' && marca.trim() !== '' ? marca.trim() : null,
    estado,
    variantes: [],
    creadoEn: ahora,
    actualizadoEn: ahora,
  }
}

export function conVariantes(producto) {
  return { ...producto, variantes: Array.isArray(producto.variantes) ? producto.variantes : [] }
}

export function validarVariante(datos = {}) {
  const { sku, stock = 0, precioUnitario, atributos = [], fotos = [] } = datos

  if (typeof sku !== 'string' || sku.trim() === '') {
    lanzarError(400, 'El sku es obligatorio')
  }

  if (!Number.isInteger(stock) || stock < 0) {
    lanzarError(400, 'El stock debe ser un entero mayor o igual a 0')
  }

  if (typeof precioUnitario !== 'number' || !Number.isFinite(precioUnitario) || precioUnitario <= 0) {
    lanzarError(400, 'El precioUnitario debe ser un número mayor a 0')
  }

  if (
    !Array.isArray(atributos) ||
    atributos.some((atributo) => (
      typeof atributo !== 'object' ||
      atributo === null ||
      Array.isArray(atributo) ||
      typeof atributo.nombre !== 'string' ||
      atributo.nombre.trim() === '' ||
      typeof atributo.valor !== 'string' ||
      atributo.valor.trim() === ''
    ))
  ) {
    lanzarError(400, 'Los atributos deben ser un array de elementos { nombre, valor } con strings')
  }

  if (
    !Array.isArray(fotos) ||
    fotos.some((foto) => (
      typeof foto !== 'object' ||
      foto === null ||
      Array.isArray(foto) ||
      typeof foto.url !== 'string' ||
      foto.url.trim() === ''
    ))
  ) {
    lanzarError(400, 'Las fotos deben ser un array de elementos { url } con strings')
  }

  return {
    sku: sku.trim(),
    stock,
    precioUnitario,
    atributos: atributos.map((atributo) => ({ nombre: atributo.nombre.trim(), valor: atributo.valor.trim() })),
    fotos: fotos.map((foto) => ({
      url: foto.url.trim(),
      esPrincipal: typeof foto.esPrincipal === 'boolean' ? foto.esPrincipal : false,
    })),
  }
}

const CAMPOS_EDITABLES = new Set([
  'nombre',
  'descripcion',
  'marca',
  'estado',
])

export function editarProducto(producto, cambios = {}) {
  if (typeof cambios !== 'object' || cambios === null || Array.isArray(cambios)) {
    lanzarError(400, 'El cuerpo debe ser un objeto con los campos a editar')
  }

  for (const campo of Object.keys(cambios)) {
    if (!CAMPOS_EDITABLES.has(campo)) {
      lanzarError(400, `El campo "${campo}" no es editable o no existe`)
    }
  }

  const editado = { ...producto }

  if ('nombre' in cambios) {
    if (typeof cambios.nombre !== 'string' || cambios.nombre.trim() === '') {
      lanzarError(400, 'El nombre es obligatorio')
    }
    editado.nombre = cambios.nombre.trim()
  }

  if ('descripcion' in cambios) {
    if (cambios.descripcion !== null && typeof cambios.descripcion !== 'string') {
      lanzarError(400, 'La descripcion debe ser un string o null')
    }
    editado.descripcion = cambios.descripcion
  }

  if ('marca' in cambios) {
    if (cambios.marca !== null && typeof cambios.marca !== 'string') {
      lanzarError(400, 'La marca debe ser un string o null')
    }
    editado.marca = typeof cambios.marca === 'string' && cambios.marca.trim() !== '' ? cambios.marca.trim() : null
  }

  if ('estado' in cambios) {
    if (!VALORES_ESTADO.includes(cambios.estado)) {
      lanzarError(400, 'El estado debe ser "activo" o "inactivo"')
    }
    editado.estado = cambios.estado
  }

  editado.actualizadoEn = new Date().toISOString()

  return editado
}

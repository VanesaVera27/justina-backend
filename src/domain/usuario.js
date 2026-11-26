function lanzarError(status, mensaje) {
  const error = new Error(mensaje)
  error.status = status
  throw error
}

export function validarIdUsuario(id) {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    lanzarError(400, 'El id de usuario debe ser un entero positivo')
  }
  return id
}

function validarTexto(datos, campo, maximo, obligatorio = false) {
  const valor = datos[campo]
  if (valor === null && !obligatorio) return null
  if (typeof valor !== 'string' || (obligatorio && valor.trim() === '')) {
    lanzarError(400, `${campo} debe ser ${obligatorio ? 'un texto no vacío' : 'un texto o null'}`)
  }
  const texto = valor.trim()
  if (texto.length > maximo) lanzarError(400, `${campo} no puede superar ${maximo} caracteres`)
  return texto
}

function validarEmail(valor) {
  if (typeof valor !== 'string' || valor.trim() === '' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) {
    lanzarError(400, 'email debe ser una dirección válida')
  }
  return validarTexto({ email: valor }, 'email', 255, true).toLowerCase()
}

function validarIdRol(valor) {
  const id = typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor
  if (!Number.isSafeInteger(id) || id < 1) lanzarError(400, 'idRol debe ser un entero positivo')
  return id
}

function validarContrasena(valor) {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 1024) {
    lanzarError(400, 'contrasena debe ser un texto de 1 a 1024 caracteres')
  }
  return valor
}

function validarBooleano(valor, campo) {
  if (typeof valor !== 'boolean') lanzarError(400, `${campo} debe ser booleano`)
  return valor
}

function validarObjeto(datos, nombre) {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    lanzarError(400, `${nombre} debe ser un objeto`)
  }
}

function rechazarCamposNoPermitidos(datos, permitidos) {
  const desconocidos = Object.keys(datos).find((campo) => !permitidos.includes(campo))
  if (desconocidos) lanzarError(400, `El campo "${desconocidos}" no es editable o no existe`)
}

export function crearUsuario(datos = {}) {
  validarObjeto(datos, 'El cuerpo')
  const permitidos = ['nombre', 'apellido', 'email', 'contrasena', 'idRol', 'emailVerificado', 'dni', 'telefono', 'activo']
  rechazarCamposNoPermitidos(datos, permitidos)

  for (const campo of ['nombre', 'apellido', 'email', 'contrasena', 'idRol']) {
    if (!Object.hasOwn(datos, campo)) lanzarError(400, `${campo} es obligatorio`)
  }

  return {
    nombre: validarTexto(datos, 'nombre', 100, true),
    apellido: validarTexto(datos, 'apellido', 100, true),
    email: validarEmail(datos.email),
    contrasena: validarContrasena(datos.contrasena),
    idRol: validarIdRol(datos.idRol),
    emailVerificado: Object.hasOwn(datos, 'emailVerificado')
      ? validarBooleano(datos.emailVerificado, 'emailVerificado')
      : false,
    dni: Object.hasOwn(datos, 'dni') ? validarTexto(datos, 'dni', 30) : null,
    telefono: Object.hasOwn(datos, 'telefono') ? validarTexto(datos, 'telefono', 50) : null,
    activo: Object.hasOwn(datos, 'activo') ? validarBooleano(datos.activo, 'activo') : true,
  }
}

export function editarUsuario(cambios = {}) {
  validarObjeto(cambios, 'El cuerpo')
  const permitidos = ['nombre', 'apellido', 'email', 'contrasena', 'idRol', 'emailVerificado', 'dni', 'telefono', 'activo']
  rechazarCamposNoPermitidos(cambios, permitidos)
  if (Object.keys(cambios).length === 0) lanzarError(400, 'Debe indicar al menos un campo para editar')

  const editados = {}
  if (Object.hasOwn(cambios, 'nombre')) editados.nombre = validarTexto(cambios, 'nombre', 100, true)
  if (Object.hasOwn(cambios, 'apellido')) editados.apellido = validarTexto(cambios, 'apellido', 100, true)
  if (Object.hasOwn(cambios, 'email')) editados.email = validarEmail(cambios.email)
  if (Object.hasOwn(cambios, 'contrasena')) editados.contrasena = validarContrasena(cambios.contrasena)
  if (Object.hasOwn(cambios, 'idRol')) editados.idRol = validarIdRol(cambios.idRol)
  if (Object.hasOwn(cambios, 'emailVerificado')) editados.emailVerificado = validarBooleano(cambios.emailVerificado, 'emailVerificado')
  if (Object.hasOwn(cambios, 'dni')) editados.dni = validarTexto(cambios, 'dni', 30)
  if (Object.hasOwn(cambios, 'telefono')) editados.telefono = validarTexto(cambios, 'telefono', 50)
  if (Object.hasOwn(cambios, 'activo')) editados.activo = validarBooleano(cambios.activo, 'activo')
  return editados
}

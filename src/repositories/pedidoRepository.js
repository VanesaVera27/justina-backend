import { pool } from './pool.js'

function filaAItem(fila) {
  return {
    id: String(fila.id_item_pedido),
    varianteId: fila.id_variante == null ? null : String(fila.id_variante),
    sku: fila.sku_snapshot,
    nombre: fila.nombre_snapshot,
    cantidad: fila.cantidad,
    precioUnitario: Number(fila.precio_unitario),
    subtotal: Number(fila.subtotal),
  }
}

function filaAPedido(fila, items) {
  return {
    id: String(fila.id_pedido),
    estado: fila.estado,
    direccionId: fila.id_direccion == null ? null : String(fila.id_direccion),
    direccionSnapshot: fila.direccion_snapshot,
    subtotal: Number(fila.subtotal),
    descuento: Number(fila.descuento),
    costoEnvio: Number(fila.costo_envio),
    total: Number(fila.total),
    fecha: fila.fecha == null ? null : fila.fecha.toISOString(),
    items,
  }
}

export async function listarPedidosDeUsuario(usuarioId) {
  const usuario = await pool.query(
    'SELECT id_usuario FROM usuario WHERE id_usuario = $1',
    [usuarioId],
  )
  if (usuario.rowCount === 0) return null

  const pedidos = await pool.query(
    `SELECT id_pedido, estado, id_direccion, direccion_snapshot, subtotal,
            descuento, costo_envio, total, fecha
     FROM pedido
     WHERE id_usuario = $1
     ORDER BY fecha DESC NULLS LAST, id_pedido DESC`,
    [usuarioId],
  )
  if (pedidos.rowCount === 0) return []

  const ids = pedidos.rows.map((fila) => fila.id_pedido)
  const items = await pool.query(
    `SELECT id_item_pedido, id_pedido, id_variante, sku_snapshot,
            nombre_snapshot, cantidad, precio_unitario, subtotal
     FROM item_pedido
     WHERE id_pedido = ANY($1::bigint[])
     ORDER BY id_item_pedido`,
    [ids],
  )
  const itemsPorPedido = new Map(pedidos.rows.map((fila) => [String(fila.id_pedido), []]))
  for (const fila of items.rows) {
    itemsPorPedido.get(String(fila.id_pedido)).push(filaAItem(fila))
  }
  return pedidos.rows.map((fila) => filaAPedido(fila, itemsPorPedido.get(String(fila.id_pedido))))
}

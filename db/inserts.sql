
-- ============================================================
-- SCRIPT DE DATOS DE PRUEBA: TIENDA DE ROPA
-- PostgreSQL
-- Ejecutar con las tablas ya creadas y vacías.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. ROLES
-- ============================================================

INSERT INTO roles (nombre)
VALUES ('Administrador'), ('Cliente')
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- 1. CATEGORÍAS
-- ============================================================

INSERT INTO categoria (nombre, es_destacada) VALUES
('Remeras', TRUE),
('Pantalones', TRUE),
('Buzos', TRUE),
('Camperas', TRUE),
('Accesorios', FALSE),
('Vestidos', FALSE);


-- ============================================================
-- 2. ATRIBUTOS: TALLES Y COLORES
-- ============================================================

INSERT INTO valor_atributo (valor) VALUES
('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL'),
('Negro'), ('Blanco'), ('Azul'), ('Gris'),
('Rojo'), ('Verde'),
('38'), ('40'), ('42'), ('44'), ('46');


-- ============================================================
-- 3. USUARIOS
-- Los roles se buscan por nombre, no por ID fijo.
-- ============================================================

INSERT INTO usuario (
    nombre, apellido, email, email_verificado,
    password_hash, id_rol, dni, telefono
)
SELECT
    datos.nombre,
    datos.apellido,
    datos.email,
    TRUE,
    datos.password_hash,
    r.id_roles,
    datos.dni,
    datos.telefono
FROM (
    VALUES
    ('Admin', 'Tienda', 'admin@modaurbana.com',
     'hash_demo_admin', '30111222', '1112345678',
     'Administrador'),
    ('Juan', 'Perez', 'juan@gmail.com',
     'hash_demo_juan', '40111222', '1123456789',
     'Cliente'),
    ('Maria', 'Gomez', 'maria@gmail.com',
     'hash_demo_maria', '42111222', '1134567890',
     'Cliente')
) AS datos(
    nombre, apellido, email, password_hash,
    dni, telefono, rol_nombre
)
JOIN roles r ON r.nombre = datos.rol_nombre
WHERE NOT EXISTS (
    SELECT 1 FROM usuario u WHERE u.email = datos.email
);


-- ============================================================
-- 4. CONFIGURACIÓN DE LA TIENDA
-- ============================================================

INSERT INTO configuracion_web (id_usuario, clave, valor)
SELECT u.id_usuario, datos.clave, datos.valor
FROM (
    VALUES
    ('admin@modaurbana.com', 'nombre_tienda', 'Moda Urbana'),
    ('admin@modaurbana.com', 'color_principal', '#222222'),
    ('admin@modaurbana.com', 'logo_url', '/images/logo-moda.png'),
    ('admin@modaurbana.com', 'whatsapp', '5491123456789')
) AS datos(email, clave, valor)
JOIN usuario u ON u.email = datos.email
WHERE NOT EXISTS (
    SELECT 1
    FROM configuracion_web cw
    WHERE cw.id_usuario = u.id_usuario
      AND cw.clave = datos.clave
);


-- ============================================================
-- 5. BANNERS
-- Se relacionan con la configuración de nombre de la tienda.
-- ============================================================

INSERT INTO banners (
    titulo, id_configuracion, subtitulo, descripcion,
    url_imagen, link_referencia, esta_activo
)
SELECT
    datos.titulo,
    cw.id_configuracion,
    datos.subtitulo,
    datos.descripcion,
    datos.url_imagen,
    datos.link_referencia,
    TRUE
FROM (
    VALUES
    ('Nueva colección', 'Renová tu estilo',
     'Descubrí las últimas prendas de temporada.',
     '/images/banner-coleccion.jpg', '/productos'),
    ('Básicos esenciales', 'Prendas para todos los días',
     'Encontrá tus básicos favoritos.',
     '/images/banner-basicos.jpg', '/categoria/remeras')
) AS datos(titulo, subtitulo, descripcion, url_imagen, link_referencia)
JOIN configuracion_web cw
  ON cw.clave = 'nombre_tienda'
 AND cw.valor = 'Moda Urbana'
JOIN usuario u ON u.id_usuario = cw.id_usuario
WHERE u.email = 'admin@modaurbana.com'
  AND NOT EXISTS (
      SELECT 1 FROM banners b WHERE b.titulo = datos.titulo
  );


-- ============================================================
-- 6. DIRECCIONES
-- ============================================================

INSERT INTO direccion (
    calle, numero, localidad, codigo_postal,
    provincia, pais, dpto
)
SELECT datos.calle, datos.numero, datos.localidad,
       datos.codigo_postal, datos.provincia,
       datos.pais, datos.dpto
FROM (
    VALUES
    ('Av. Rivadavia', '1234', 'CABA', '1033',
     'Buenos Aires', 'Argentina', '2A'),
    ('Sarmiento', '567', 'Jose C. Paz', '1665',
     'Buenos Aires', 'Argentina', NULL::VARCHAR)
) AS datos(
    calle, numero, localidad, codigo_postal,
    provincia, pais, dpto
)
WHERE NOT EXISTS (
    SELECT 1 FROM direccion d
    WHERE d.calle = datos.calle
      AND d.numero = datos.numero
      AND d.localidad = datos.localidad
);


-- ============================================================
-- 7. RELACIÓN USUARIO-DIRECCIÓN
-- ============================================================

INSERT INTO usuario_direccion (
    id_direccion, id_usuario, es_principal
)
SELECT d.id_direccion, u.id_usuario, TRUE
FROM (
    VALUES
    ('juan@gmail.com', 'Av. Rivadavia', '1234', 'CABA'),
    ('maria@gmail.com', 'Sarmiento', '567', 'Jose C. Paz')
) AS datos(email, calle, numero, localidad)
JOIN usuario u ON u.email = datos.email
JOIN direccion d
  ON d.calle = datos.calle
 AND d.numero = datos.numero
 AND d.localidad = datos.localidad
WHERE NOT EXISTS (
    SELECT 1
    FROM usuario_direccion ud
    WHERE ud.id_usuario = u.id_usuario
      AND ud.id_direccion = d.id_direccion
);


-- ============================================================
-- 8. PRODUCTOS
-- ============================================================

INSERT INTO producto (
    nombre, descripcion, es_destacado, id_categoria, marca
)
SELECT datos.nombre, datos.descripcion, datos.destacado,
       c.id_categoria, datos.marca
FROM (
    VALUES
    ('Remera Oversize Essential',
     'Remera de algodón con corte oversize.', TRUE,
     'Remeras', 'Moda Urbana'),
    ('Jean Recto Clásico',
     'Jean de denim con corte recto y tiro medio.', TRUE,
     'Pantalones', 'Moda Urbana'),
    ('Buzo Hoodie Premium',
     'Buzo con capucha y bolsillo frontal.', TRUE,
     'Buzos', 'Urban Style'),
    ('Campera Puffer',
     'Campera acolchada ideal para los días fríos.', FALSE,
     'Camperas', 'Urban Style'),
    ('Gorra Bordada',
     'Gorra ajustable con bordado frontal.', FALSE,
     'Accesorios', 'Moda Urbana'),
    ('Vestido Midi',
     'Vestido casual de largo midi.', TRUE,
     'Vestidos', 'Urban Style')
) AS datos(nombre, descripcion, destacado, categoria, marca)
JOIN categoria c ON c.nombre = datos.categoria
WHERE NOT EXISTS (
    SELECT 1 FROM producto p WHERE p.nombre = datos.nombre
);


-- ============================================================
-- 9. ESPECIFICACIONES
-- ============================================================

INSERT INTO especificaciones (id_producto, clave, valor)
SELECT p.id_producto, datos.clave, datos.valor
FROM (
    VALUES
    ('Remera Oversize Essential', 'Material', '100% algodón'),
    ('Remera Oversize Essential', 'Corte', 'Oversize'),
    ('Remera Oversize Essential', 'Cuidados', 'Lavar con agua fría'),
    ('Jean Recto Clásico', 'Material', 'Denim'),
    ('Jean Recto Clásico', 'Corte', 'Recto'),
    ('Buzo Hoodie Premium', 'Material', 'Algodón y poliéster'),
    ('Buzo Hoodie Premium', 'Capucha', 'Sí'),
    ('Campera Puffer', 'Material', 'Poliéster'),
    ('Campera Puffer', 'Abrigo', 'Acolchado'),
    ('Gorra Bordada', 'Ajuste', 'Regulable'),
    ('Vestido Midi', 'Largo', 'Midi'),
    ('Vestido Midi', 'Material', 'Viscosa')
) AS datos(producto, clave, valor)
JOIN producto p ON p.nombre = datos.producto
WHERE NOT EXISTS (
    SELECT 1 FROM especificaciones e
    WHERE e.id_producto = p.id_producto
      AND e.clave = datos.clave
);


-- ============================================================
-- 10. VARIANTES
-- El SKU identifica cada combinación de producto.
-- ============================================================

INSERT INTO variante (id_producto, sku, stock, precio)
SELECT p.id_producto, datos.sku, datos.stock, datos.precio
FROM (
    VALUES
    ('Remera Oversize Essential', 'REM-OV-NEG-M', 15, 18900.00::NUMERIC),
    ('Remera Oversize Essential', 'REM-OV-BLA-L', 10, 18900.00::NUMERIC),
    ('Jean Recto Clásico', 'JEAN-REC-AZU-40', 8, 35900.00::NUMERIC),
    ('Jean Recto Clásico', 'JEAN-REC-AZU-42', 12, 35900.00::NUMERIC),
    ('Buzo Hoodie Premium', 'BUZO-HOD-GRI-L', 7, 42900.00::NUMERIC),
    ('Buzo Hoodie Premium', 'BUZO-HOD-NEG-M', 9, 42900.00::NUMERIC),
    ('Campera Puffer', 'CAMP-PUF-NEG-L', 5, 69900.00::NUMERIC),
    ('Gorra Bordada', 'GOR-BOR-NEG-U', 20, 12500.00::NUMERIC),
    ('Vestido Midi', 'VEST-MID-NEG-M', 6, 31900.00::NUMERIC)
) AS datos(producto, sku, stock, precio)
JOIN producto p ON p.nombre = datos.producto
WHERE NOT EXISTS (
    SELECT 1 FROM variante v WHERE v.sku = datos.sku
);


-- ============================================================
-- 11. IMÁGENES
-- ============================================================

-- Reemplaza las rutas de ejemplo antiguas, que no son servidas por el backend.
UPDATE imagenes_variante iv
SET url = '/uploads/remera.jpg',
    es_principal = TRUE
FROM variante v
WHERE iv.id_variante = v.id_variante
  AND v.sku = 'REM-OV-NEG-M'
  AND iv.url = '/images/remera-oversize-negra.jpg';

DELETE FROM imagenes_variante iv
USING variante v
WHERE iv.id_variante = v.id_variante
  AND iv.url IN (
      '/images/remera-oversize-blanca.jpg',
      '/images/jean-recto-40.jpg',
      '/images/jean-recto-42.jpg',
      '/images/buzo-gris.jpg',
      '/images/buzo-negro.jpg',
      '/images/campera-puffer.jpg',
      '/images/gorra-bordada.jpg',
      '/images/vestido-midi.jpg'
  )
  AND v.sku IN (
      'REM-OV-BLA-L',
      'JEAN-REC-AZU-40',
      'JEAN-REC-AZU-42',
      'BUZO-HOD-GRI-L',
      'BUZO-HOD-NEG-M',
      'CAMP-PUF-NEG-L',
      'GOR-BOR-NEG-U',
      'VEST-MID-NEG-M'
  );

INSERT INTO imagenes_variante (id_variante, url, es_principal)
SELECT v.id_variante, datos.url, TRUE
FROM (
    VALUES
    ('REM-OV-NEG-M', '/uploads/remera.jpg')
) AS datos(sku, url)
JOIN variante v ON v.sku = datos.sku
WHERE NOT EXISTS (
    SELECT 1 FROM imagenes_variante iv
    WHERE iv.id_variante = v.id_variante
      AND iv.url = datos.url
);


-- ============================================================
-- 12. ATRIBUTOS DE VARIANTES
-- Se generan IDs de relación sin asumir que empiezan en 1.
-- ============================================================

WITH atributos(sku, atributo) AS (
    VALUES
    ('REM-OV-NEG-M', 'M'),
    ('REM-OV-NEG-M', 'Negro'),
    ('REM-OV-BLA-L', 'L'),
    ('REM-OV-BLA-L', 'Blanco'),
    ('JEAN-REC-AZU-40', '40'),
    ('JEAN-REC-AZU-40', 'Azul'),
    ('JEAN-REC-AZU-42', '42'),
    ('JEAN-REC-AZU-42', 'Azul'),
    ('BUZO-HOD-GRI-L', 'L'),
    ('BUZO-HOD-GRI-L', 'Gris'),
    ('BUZO-HOD-NEG-M', 'M'),
    ('BUZO-HOD-NEG-M', 'Negro'),
    ('CAMP-PUF-NEG-L', 'L'),
    ('CAMP-PUF-NEG-L', 'Negro'),
    ('GOR-BOR-NEG-U', 'Negro'),
    ('VEST-MID-NEG-M', 'M'),
    ('VEST-MID-NEG-M', 'Negro')
),
faltantes AS (
    SELECT a.sku, a.atributo, v.id_variante, va.id_atributo,
           ROW_NUMBER() OVER (
               ORDER BY v.id_variante, va.id_atributo
           ) AS rn
    FROM atributos a
    JOIN variante v ON v.sku = a.sku
    JOIN valor_atributo va ON va.valor = a.atributo
    WHERE NOT EXISTS (
        SELECT 1
        FROM valor_variante vv
        WHERE vv.id_variante = v.id_variante
          AND vv.id_valor_atributo = va.id_atributo
    )
),
base AS (
    SELECT COALESCE(MAX(id_valor_variante), 0) AS max_id
    FROM valor_variante
)
INSERT INTO valor_variante (
    id_valor_variante, id_variante, id_valor_atributo
)
SELECT base.max_id + f.rn, f.id_variante, f.id_atributo
FROM faltantes f
CROSS JOIN base;


-- ============================================================
-- 13. LISTAS DE FAVORITOS
-- ============================================================

INSERT INTO lista_favoritos (id_usuario)
SELECT u.id_usuario
FROM usuario u
WHERE u.email IN ('juan@gmail.com', 'maria@gmail.com')
  AND NOT EXISTS (
      SELECT 1 FROM lista_favoritos lf
      WHERE lf.id_usuario = u.id_usuario
  );


-- ============================================================
-- 14. PRODUCTOS FAVORITOS
-- ============================================================

INSERT INTO favorito_item (id_lista_favoritos, id_producto)
SELECT lf.id_lista_favoritos, p.id_producto
FROM (
    VALUES
    ('juan@gmail.com', 'Remera Oversize Essential'),
    ('juan@gmail.com', 'Buzo Hoodie Premium'),
    ('maria@gmail.com', 'Jean Recto Clásico'),
    ('maria@gmail.com', 'Vestido Midi')
) AS datos(email, producto)
JOIN usuario u ON u.email = datos.email
JOIN lista_favoritos lf ON lf.id_usuario = u.id_usuario
JOIN producto p ON p.nombre = datos.producto
WHERE NOT EXISTS (
    SELECT 1 FROM favorito_item fi
    WHERE fi.id_lista_favoritos = lf.id_lista_favoritos
      AND fi.id_producto = p.id_producto
);


-- ============================================================
-- 15. CARRITOS
-- ============================================================

INSERT INTO carrito (id_usuario)
SELECT u.id_usuario
FROM usuario u
WHERE u.email IN ('juan@gmail.com', 'maria@gmail.com')
  AND NOT EXISTS (
      SELECT 1 FROM carrito c WHERE c.id_usuario = u.id_usuario
  );


-- ============================================================
-- 16. PRODUCTOS EN CARRITOS
-- ============================================================

INSERT INTO carrito_item (id_carrito, id_variante, cantidad)
SELECT c.id_carrito, v.id_variante, datos.cantidad
FROM (
    VALUES
    ('juan@gmail.com', 'REM-OV-NEG-M', 2),
    ('juan@gmail.com', 'BUZO-HOD-GRI-L', 1),
    ('maria@gmail.com', 'JEAN-REC-AZU-40', 1),
    ('maria@gmail.com', 'GOR-BOR-NEG-U', 1)
) AS datos(email, sku, cantidad)
JOIN usuario u ON u.email = datos.email
JOIN carrito c ON c.id_usuario = u.id_usuario
JOIN variante v ON v.sku = datos.sku
WHERE NOT EXISTS (
    SELECT 1 FROM carrito_item ci
    WHERE ci.id_carrito = c.id_carrito
      AND ci.id_variante = v.id_variante
);


-- ============================================================
-- 17. PEDIDOS
-- Los totales corresponden a sus artículos y costos.
-- ============================================================

INSERT INTO pedido (
    id_usuario, id_direccion, direccion_snapshot,
    estado, subtotal, descuento, costo_envio, total
)
SELECT
    u.id_usuario,
    d.id_direccion,
    datos.snapshot::JSONB,
    datos.estado,
    datos.subtotal,
    datos.descuento,
    datos.envio,
    datos.subtotal - datos.descuento + datos.envio
FROM (
    VALUES
    ('juan@gmail.com', 'Av. Rivadavia', '1234', 'CABA',
     '{"calle":"Av. Rivadavia","numero":"1234","localidad":"CABA"}',
     'Confirmado', 80700.00::NUMERIC, 0.00::NUMERIC, 4500.00::NUMERIC),
    ('maria@gmail.com', 'Sarmiento', '567', 'Jose C. Paz',
     '{"calle":"Sarmiento","numero":"567","localidad":"Jose C. Paz"}',
     'Pendiente', 35900.00::NUMERIC, 2000.00::NUMERIC, 0.00::NUMERIC)
) AS datos(
    email, calle, numero, localidad, snapshot,
    estado, subtotal, descuento, envio
)
JOIN usuario u ON u.email = datos.email
JOIN direccion d
  ON d.calle = datos.calle
 AND d.numero = datos.numero
 AND d.localidad = datos.localidad
WHERE NOT EXISTS (
    SELECT 1 FROM pedido p
    WHERE p.id_usuario = u.id_usuario
      AND p.estado = datos.estado
      AND p.subtotal = datos.subtotal
      AND p.total = datos.subtotal - datos.descuento + datos.envio
);


-- ============================================================
-- 18. ÍTEMS DE PEDIDO
-- ============================================================

INSERT INTO item_pedido (
    id_pedido, id_variante, sku_snapshot,
    nombre_snapshot, cantidad, precio_unitario, subtotal
)
SELECT
    p.id_pedido,
    v.id_variante,
    v.sku,
    datos.nombre_snapshot,
    datos.cantidad,
    datos.precio,
    datos.cantidad * datos.precio
FROM (
    VALUES
    ('juan@gmail.com', 'Confirmado', 'REM-OV-NEG-M',
     'Remera Oversize Essential - M - Negro',
     2, 18900.00::NUMERIC),
    ('juan@gmail.com', 'Confirmado', 'BUZO-HOD-GRI-L',
     'Buzo Hoodie Premium - L - Gris',
     1, 42900.00::NUMERIC),
    ('maria@gmail.com', 'Pendiente', 'JEAN-REC-AZU-40',
     'Jean Recto Clásico - Talle 40 - Azul',
     1, 35900.00::NUMERIC)
) AS datos(email, estado, sku, nombre_snapshot, cantidad, precio)
JOIN usuario u ON u.email = datos.email
JOIN pedido p
  ON p.id_usuario = u.id_usuario
 AND p.estado = datos.estado
JOIN variante v ON v.sku = datos.sku
WHERE NOT EXISTS (
    SELECT 1 FROM item_pedido ip
    WHERE ip.id_pedido = p.id_pedido
      AND ip.sku_snapshot = datos.sku
);


-- ============================================================
-- 19. HISTORIAL DE ESTADOS
-- ============================================================

INSERT INTO pedido_estado_historial (
    id_pedido, estado_anterior, estado_nuevo
)
SELECT p.id_pedido, datos.anterior, datos.nuevo
FROM (
    VALUES
    ('juan@gmail.com', 'Confirmado', NULL::VARCHAR, 'Confirmado'),
    ('juan@gmail.com', 'Confirmado', 'Confirmado', 'Preparando'),
    ('maria@gmail.com', 'Pendiente', NULL::VARCHAR, 'Pendiente')
) AS datos(email, estado_pedido, anterior, nuevo)
JOIN usuario u ON u.email = datos.email
JOIN pedido p
  ON p.id_usuario = u.id_usuario
 AND p.estado = datos.estado_pedido
WHERE NOT EXISTS (
    SELECT 1 FROM pedido_estado_historial h
    WHERE h.id_pedido = p.id_pedido
      AND h.estado_nuevo = datos.nuevo
      AND h.estado_anterior IS NOT DISTINCT FROM datos.anterior
);


-- ============================================================
-- 20. PAGOS
-- ============================================================

INSERT INTO pago (id_pedido, proveedor, importe, estado)
SELECT p.id_pedido, 'Mercado Pago', datos.importe, datos.estado_pago
FROM (
    VALUES
    ('juan@gmail.com', 'Confirmado', 85200.00::NUMERIC, 'Aprobado'),
    ('maria@gmail.com', 'Pendiente', 33900.00::NUMERIC, 'Pendiente')
) AS datos(email, estado_pedido, importe, estado_pago)
JOIN usuario u ON u.email = datos.email
JOIN pedido p
  ON p.id_usuario = u.id_usuario
 AND p.estado = datos.estado_pedido
WHERE NOT EXISTS (
    SELECT 1 FROM pago pg
    WHERE pg.id_pedido = p.id_pedido
      AND pg.proveedor = 'Mercado Pago'
);


-- ============================================================
-- 21. ENVÍOS
-- ============================================================

INSERT INTO envio (id_pedido, transportista, tracking, estado)
SELECT p.id_pedido, datos.transportista, datos.tracking, datos.estado_envio
FROM (
    VALUES
    ('juan@gmail.com', 'Confirmado', 'Correo Argentino',
     'AR123456789', 'En preparación'),
    ('maria@gmail.com', 'Pendiente', 'Retiro en local',
     NULL::VARCHAR, 'Pendiente')
) AS datos(email, estado_pedido, transportista, tracking, estado_envio)
JOIN usuario u ON u.email = datos.email
JOIN pedido p
  ON p.id_usuario = u.id_usuario
 AND p.estado = datos.estado_pedido
WHERE NOT EXISTS (
    SELECT 1 FROM envio e
    WHERE e.id_pedido = p.id_pedido
);

COMMIT;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

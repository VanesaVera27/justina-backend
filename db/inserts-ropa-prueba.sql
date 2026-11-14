-- =============================================================================
-- DATOS DE PRUEBA: TIENDA DE ROPA (productos, variantes, atributos e imágenes)
-- Idempotente: se puede ejecutar más de una vez sin duplicar filas.
-- Ejecutar después de db/schema.sql (o de npm run bd:init).
-- Las imágenes son locales y se sirven desde /uploads/productos/<nombre>.jpg.
-- Copiá las fotos en uploads/productos respetando la convención de nombres
-- (por ejemplo ropa-rem-ovr-neg-m-1.jpg) o ajustá las rutas de este script.
-- No se usan URLs externas.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CATEGORÍAS
-- -----------------------------------------------------------------------------

INSERT INTO categoria (nombre, es_destacada)
SELECT datos.nombre, datos.es_destacada
FROM (VALUES
    ('Remeras', TRUE),
    ('Pantalones', TRUE),
    ('Buzos', TRUE),
    ('Camperas', TRUE),
    ('Vestidos', FALSE),
    ('Accesorios', FALSE),
    ('Shorts', FALSE),
    ('Faldas', FALSE)
) AS datos(nombre, es_destacada)
WHERE NOT EXISTS (
    SELECT 1 FROM categoria c WHERE c.nombre = datos.nombre
);

-- -----------------------------------------------------------------------------
-- 2. VALORES DE ATRIBUTO (TALLES Y COLORES)
-- -----------------------------------------------------------------------------

INSERT INTO valor_atributo (valor)
SELECT datos.valor
FROM (VALUES
    ('S'),
    ('M'),
    ('L'),
    ('XL'),
    ('38'),
    ('40'),
    ('42'),
    ('44'),
    ('Único'),
    ('Negro'),
    ('Blanco'),
    ('Azul'),
    ('Gris'),
    ('Verde'),
    ('Beige'),
    ('Rosa')
) AS datos(valor)
WHERE NOT EXISTS (
    SELECT 1 FROM valor_atributo va WHERE va.valor = datos.valor
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCTOS
-- -----------------------------------------------------------------------------

INSERT INTO producto (nombre, descripcion, es_destacado, id_categoria, marca, foto_portada_url)
SELECT datos.nombre, datos.descripcion, datos.destacado, c.id_categoria,
       datos.marca, datos.foto_portada_url
FROM (VALUES
    ('Remera Oversize Básica', 'Remera de algodón peinado con calce oversize, cuello redondo y mangas caídas.', TRUE, 'Remeras', 'Moda Urbana', '/uploads/productos/ropa-rem-ovr-neg-m-1.jpg'),
    ('Remera Manga Corta Algodón', 'Remera básica de manga corta en algodón, calce regular y cuello reforzado.', FALSE, 'Remeras', 'Básicos Justina', '/uploads/productos/ropa-rem-mc-bla-s-1.jpg'),
    ('Jean Recto Tiro Alto', 'Jean de denim rígido con tiro alto, pierna recta y cierre con botón metálico.', TRUE, 'Pantalones', 'Denim Co', '/uploads/productos/ropa-jean-rec-azu-38-1.jpg'),
    ('Pantalón Cargo Jogger', 'Pantalón jogger de gabardina con bolsillos cargo y puños elastizados.', FALSE, 'Pantalones', 'Urban Style', '/uploads/productos/ropa-pant-car-ver-s-1.jpg'),
    ('Short Deportivo', 'Short deportivo liviano con cintura elastizada y bolsillo interno.', FALSE, 'Shorts', 'Urbana Sport', '/uploads/productos/ropa-short-dep-neg-s-1.jpg'),
    ('Buzo Hoodie Frisa', 'Buzo con capucha en frisa pesada, bolsillo canguro y puños elastizados.', TRUE, 'Buzos', 'Urban Style', '/uploads/productos/ropa-buzo-hod-gri-m-1.jpg'),
    ('Buzo Canguro Oversize', 'Buzo canguro de calce amplio con interior afelpado.', FALSE, 'Buzos', 'Moda Urbana', '/uploads/productos/ropa-buzo-can-bei-m-1.jpg'),
    ('Campera Puffer', 'Campera acolchada con capucha desmontable y cierre frontal.', TRUE, 'Camperas', 'Urban Style', '/uploads/productos/ropa-camp-puf-neg-m-1.jpg'),
    ('Campera Denim Clásica', 'Campera de jean con bolsillos frontales y botones metálicos.', FALSE, 'Camperas', 'Denim Co', '/uploads/productos/ropa-camp-den-azu-s-1.jpg'),
    ('Vestido Midi Negro', 'Vestido midi entallado con escote redondo y abertura lateral.', TRUE, 'Vestidos', 'Moda Urbana', '/uploads/productos/ropa-vest-mid-neg-s-1.jpg'),
    ('Vestido Corto Floreado', 'Vestido corto con estampado floral, mangas cortas y cinturón incluido.', FALSE, 'Vestidos', 'Justina', '/uploads/productos/ropa-vest-cor-ros-s-1.jpg'),
    ('Falda Plisada Midi', 'Falda midi plisada con cintura elastizada y forro interno.', FALSE, 'Faldas', 'Justina', '/uploads/productos/ropa-falda-pli-neg-s-1.jpg'),
    ('Gorra Bordada', 'Gorra ajustable de algodón con bordado frontal.', FALSE, 'Accesorios', 'Moda Urbana', '/uploads/productos/ropa-gor-bor-neg-u-1.jpg'),
    ('Medias Pack x3', 'Pack de tres pares de medias de algodón con puño elastizado.', FALSE, 'Accesorios', 'Básicos Justina', '/uploads/productos/ropa-med-pack-neg-u-1.jpg')
) AS datos(nombre, descripcion, destacado, categoria, marca, foto_portada_url)
JOIN categoria c ON c.nombre = datos.categoria
WHERE NOT EXISTS (
    SELECT 1 FROM producto p WHERE p.nombre = datos.nombre
);

-- -----------------------------------------------------------------------------
-- 4. ESPECIFICACIONES
-- -----------------------------------------------------------------------------

INSERT INTO especificaciones (id_producto, clave, valor)
SELECT p.id_producto, datos.clave, datos.valor
FROM (VALUES
    ('Remera Oversize Básica', 'Material', '100% algodón peinado'),
    ('Remera Oversize Básica', 'Calce', 'Oversize'),
    ('Remera Oversize Básica', 'Cuidados', 'Lavar con agua fría del revés'),
    ('Remera Manga Corta Algodón', 'Material', '100% algodón'),
    ('Remera Manga Corta Algodón', 'Calce', 'Regular'),
    ('Remera Manga Corta Algodón', 'Cuidados', 'Lavar a máquina en programa suave'),
    ('Jean Recto Tiro Alto', 'Material', '98% algodón, 2% elastano'),
    ('Jean Recto Tiro Alto', 'Corte', 'Recto tiro alto'),
    ('Jean Recto Tiro Alto', 'Cuidados', 'Lavar del revés con agua fría'),
    ('Pantalón Cargo Jogger', 'Material', 'Gabardina de algodón'),
    ('Pantalón Cargo Jogger', 'Corte', 'Jogger con puño'),
    ('Pantalón Cargo Jogger', 'Cuidados', 'Lavar con agua fría'),
    ('Short Deportivo', 'Material', 'Poliéster reciclado'),
    ('Short Deportivo', 'Largo', 'Medio'),
    ('Short Deportivo', 'Cuidados', 'Lavar a máquina con agua fría'),
    ('Buzo Hoodie Frisa', 'Material', 'Algodón y poliéster'),
    ('Buzo Hoodie Frisa', 'Capucha', 'Sí, con cordón'),
    ('Buzo Hoodie Frisa', 'Cuidados', 'Lavar con agua fría'),
    ('Buzo Canguro Oversize', 'Material', 'Frisa de algodón'),
    ('Buzo Canguro Oversize', 'Calce', 'Oversize'),
    ('Buzo Canguro Oversize', 'Cuidados', 'Lavar del revés'),
    ('Campera Puffer', 'Material', 'Poliéster impermeable'),
    ('Campera Puffer', 'Abrigo', 'Acolchado'),
    ('Campera Puffer', 'Cuidados', 'Lavar a mano'),
    ('Campera Denim Clásica', 'Material', 'Denim de algodón'),
    ('Campera Denim Clásica', 'Corte', 'Clásico'),
    ('Campera Denim Clásica', 'Cuidados', 'Lavar con agua fría'),
    ('Vestido Midi Negro', 'Material', 'Viscosa'),
    ('Vestido Midi Negro', 'Largo', 'Midi'),
    ('Vestido Midi Negro', 'Cuidados', 'Lavar a mano'),
    ('Vestido Corto Floreado', 'Material', 'Viscosa y elastano'),
    ('Vestido Corto Floreado', 'Largo', 'Corto'),
    ('Vestido Corto Floreado', 'Cuidados', 'Lavar a mano'),
    ('Falda Plisada Midi', 'Material', 'Poliéster satinado'),
    ('Falda Plisada Midi', 'Largo', 'Midi'),
    ('Falda Plisada Midi', 'Cuidados', 'Lavar a mano'),
    ('Gorra Bordada', 'Material', 'Algodón'),
    ('Gorra Bordada', 'Ajuste', 'Regulable'),
    ('Gorra Bordada', 'Cuidados', 'Lavar a mano'),
    ('Medias Pack x3', 'Material', 'Algodón y elastano'),
    ('Medias Pack x3', 'Contenido', '3 pares'),
    ('Medias Pack x3', 'Cuidados', 'Lavar a máquina')
) AS datos(producto, clave, valor)
JOIN producto p ON p.nombre = datos.producto
WHERE NOT EXISTS (
    SELECT 1 FROM especificaciones e
    WHERE e.id_producto = p.id_producto
      AND e.clave = datos.clave
);

-- -----------------------------------------------------------------------------
-- 5. VARIANTES
-- -----------------------------------------------------------------------------

INSERT INTO variante AS existente (id_producto, sku, stock, precio)
SELECT p.id_producto, datos.sku, datos.stock, datos.precio
FROM (VALUES
    ('Remera Oversize Básica', 'REM-OVR-NEG-M', 12, 19900.00),
    ('Remera Oversize Básica', 'REM-OVR-NEG-L', 10, 19900.00),
    ('Remera Oversize Básica', 'REM-OVR-BLA-M', 9, 19900.00),
    ('Remera Oversize Básica', 'REM-OVR-BLA-L', 8, 19900.00),
    ('Remera Manga Corta Algodón', 'REM-MC-BLA-S', 10, 15900.00),
    ('Remera Manga Corta Algodón', 'REM-MC-BLA-M', 14, 15900.00),
    ('Remera Manga Corta Algodón', 'REM-MC-GRI-M', 11, 15900.00),
    ('Remera Manga Corta Algodón', 'REM-MC-GRI-L', 7, 15900.00),
    ('Jean Recto Tiro Alto', 'JEAN-REC-AZU-38', 6, 42900.00),
    ('Jean Recto Tiro Alto', 'JEAN-REC-AZU-40', 9, 42900.00),
    ('Jean Recto Tiro Alto', 'JEAN-REC-AZU-42', 8, 42900.00),
    ('Jean Recto Tiro Alto', 'JEAN-REC-AZU-44', 4, 42900.00),
    ('Jean Recto Tiro Alto', 'JEAN-REC-NEG-40', 5, 42900.00),
    ('Pantalón Cargo Jogger', 'PANT-CAR-VER-S', 7, 31900.00),
    ('Pantalón Cargo Jogger', 'PANT-CAR-VER-M', 10, 31900.00),
    ('Pantalón Cargo Jogger', 'PANT-CAR-VER-L', 5, 31900.00),
    ('Pantalón Cargo Jogger', 'PANT-CAR-NEG-M', 6, 31900.00),
    ('Short Deportivo', 'SHORT-DEP-NEG-S', 8, 17900.00),
    ('Short Deportivo', 'SHORT-DEP-NEG-M', 12, 17900.00),
    ('Short Deportivo', 'SHORT-DEP-AZU-M', 9, 17900.00),
    ('Short Deportivo', 'SHORT-DEP-AZU-L', 6, 17900.00),
    ('Buzo Hoodie Frisa', 'BUZO-HOD-GRI-M', 6, 45900.00),
    ('Buzo Hoodie Frisa', 'BUZO-HOD-GRI-L', 8, 45900.00),
    ('Buzo Hoodie Frisa', 'BUZO-HOD-GRI-XL', 4, 45900.00),
    ('Buzo Hoodie Frisa', 'BUZO-HOD-NEG-M', 7, 45900.00),
    ('Buzo Hoodie Frisa', 'BUZO-HOD-NEG-L', 5, 45900.00),
    ('Buzo Canguro Oversize', 'BUZO-CAN-BEI-M', 5, 41900.00),
    ('Buzo Canguro Oversize', 'BUZO-CAN-BEI-L', 4, 41900.00),
    ('Buzo Canguro Oversize', 'BUZO-CAN-ROS-M', 3, 41900.00),
    ('Campera Puffer', 'CAMP-PUF-NEG-M', 4, 79900.00),
    ('Campera Puffer', 'CAMP-PUF-NEG-L', 5, 79900.00),
    ('Campera Puffer', 'CAMP-PUF-AZU-L', 3, 79900.00),
    ('Campera Denim Clásica', 'CAMP-DEN-AZU-S', 4, 62900.00),
    ('Campera Denim Clásica', 'CAMP-DEN-AZU-M', 6, 62900.00),
    ('Campera Denim Clásica', 'CAMP-DEN-AZU-L', 5, 62900.00),
    ('Vestido Midi Negro', 'VEST-MID-NEG-S', 5, 36900.00),
    ('Vestido Midi Negro', 'VEST-MID-NEG-M', 7, 36900.00),
    ('Vestido Midi Negro', 'VEST-MID-NEG-L', 4, 36900.00),
    ('Vestido Corto Floreado', 'VEST-COR-ROS-S', 4, 32900.00),
    ('Vestido Corto Floreado', 'VEST-COR-ROS-M', 6, 32900.00),
    ('Vestido Corto Floreado', 'VEST-COR-BLA-M', 5, 32900.00),
    ('Falda Plisada Midi', 'FALDA-PLI-NEG-S', 5, 28900.00),
    ('Falda Plisada Midi', 'FALDA-PLI-NEG-M', 6, 28900.00),
    ('Falda Plisada Midi', 'FALDA-PLI-NEG-L', 4, 28900.00),
    ('Gorra Bordada', 'GOR-BOR-NEG-U', 20, 14900.00),
    ('Gorra Bordada', 'GOR-BOR-BLA-U', 15, 14900.00),
    ('Medias Pack x3', 'MED-PACK-NEG-U', 30, 7900.00),
    ('Medias Pack x3', 'MED-PACK-BLA-U', 25, 7900.00)
) AS datos(producto, sku, stock, precio)
JOIN producto p ON p.nombre = datos.producto
ON CONFLICT (sku) DO UPDATE
SET id_producto = EXCLUDED.id_producto
WHERE NOT EXISTS (
    SELECT 1 FROM producto propietario
    WHERE propietario.id_producto = existente.id_producto
);

-- -----------------------------------------------------------------------------
-- 6. ATRIBUTOS DE LAS VARIANTES (talle primero, después color)
-- nombre = etiqueta visible; el valor vive en valor_atributo.
-- -----------------------------------------------------------------------------

WITH productos_prueba(nombre) AS (
    VALUES
        ('Remera Oversize Básica'),
        ('Remera Manga Corta Algodón'),
        ('Jean Recto Tiro Alto'),
        ('Pantalón Cargo Jogger'),
        ('Short Deportivo'),
        ('Buzo Hoodie Frisa'),
        ('Buzo Canguro Oversize'),
        ('Campera Puffer'),
        ('Campera Denim Clásica'),
        ('Vestido Midi Negro'),
        ('Vestido Corto Floreado'),
        ('Falda Plisada Midi'),
        ('Gorra Bordada'),
        ('Medias Pack x3')
),
mapa(sku, etiqueta, valor, orden) AS (
    VALUES
    ('REM-OVR-NEG-M', 'Talle', 'M', 1),
    ('REM-OVR-NEG-M', 'Color', 'Negro', 2),
    ('REM-OVR-NEG-L', 'Talle', 'L', 1),
    ('REM-OVR-NEG-L', 'Color', 'Negro', 2),
    ('REM-OVR-BLA-M', 'Talle', 'M', 1),
    ('REM-OVR-BLA-M', 'Color', 'Blanco', 2),
    ('REM-OVR-BLA-L', 'Talle', 'L', 1),
    ('REM-OVR-BLA-L', 'Color', 'Blanco', 2),
    ('REM-MC-BLA-S', 'Talle', 'S', 1),
    ('REM-MC-BLA-S', 'Color', 'Blanco', 2),
    ('REM-MC-BLA-M', 'Talle', 'M', 1),
    ('REM-MC-BLA-M', 'Color', 'Blanco', 2),
    ('REM-MC-GRI-M', 'Talle', 'M', 1),
    ('REM-MC-GRI-M', 'Color', 'Gris', 2),
    ('REM-MC-GRI-L', 'Talle', 'L', 1),
    ('REM-MC-GRI-L', 'Color', 'Gris', 2),
    ('JEAN-REC-AZU-38', 'Talle', '38', 1),
    ('JEAN-REC-AZU-38', 'Color', 'Azul', 2),
    ('JEAN-REC-AZU-40', 'Talle', '40', 1),
    ('JEAN-REC-AZU-40', 'Color', 'Azul', 2),
    ('JEAN-REC-AZU-42', 'Talle', '42', 1),
    ('JEAN-REC-AZU-42', 'Color', 'Azul', 2),
    ('JEAN-REC-AZU-44', 'Talle', '44', 1),
    ('JEAN-REC-AZU-44', 'Color', 'Azul', 2),
    ('JEAN-REC-NEG-40', 'Talle', '40', 1),
    ('JEAN-REC-NEG-40', 'Color', 'Negro', 2),
    ('PANT-CAR-VER-S', 'Talle', 'S', 1),
    ('PANT-CAR-VER-S', 'Color', 'Verde', 2),
    ('PANT-CAR-VER-M', 'Talle', 'M', 1),
    ('PANT-CAR-VER-M', 'Color', 'Verde', 2),
    ('PANT-CAR-VER-L', 'Talle', 'L', 1),
    ('PANT-CAR-VER-L', 'Color', 'Verde', 2),
    ('PANT-CAR-NEG-M', 'Talle', 'M', 1),
    ('PANT-CAR-NEG-M', 'Color', 'Negro', 2),
    ('SHORT-DEP-NEG-S', 'Talle', 'S', 1),
    ('SHORT-DEP-NEG-S', 'Color', 'Negro', 2),
    ('SHORT-DEP-NEG-M', 'Talle', 'M', 1),
    ('SHORT-DEP-NEG-M', 'Color', 'Negro', 2),
    ('SHORT-DEP-AZU-M', 'Talle', 'M', 1),
    ('SHORT-DEP-AZU-M', 'Color', 'Azul', 2),
    ('SHORT-DEP-AZU-L', 'Talle', 'L', 1),
    ('SHORT-DEP-AZU-L', 'Color', 'Azul', 2),
    ('BUZO-HOD-GRI-M', 'Talle', 'M', 1),
    ('BUZO-HOD-GRI-M', 'Color', 'Gris', 2),
    ('BUZO-HOD-GRI-L', 'Talle', 'L', 1),
    ('BUZO-HOD-GRI-L', 'Color', 'Gris', 2),
    ('BUZO-HOD-GRI-XL', 'Talle', 'XL', 1),
    ('BUZO-HOD-GRI-XL', 'Color', 'Gris', 2),
    ('BUZO-HOD-NEG-M', 'Talle', 'M', 1),
    ('BUZO-HOD-NEG-M', 'Color', 'Negro', 2),
    ('BUZO-HOD-NEG-L', 'Talle', 'L', 1),
    ('BUZO-HOD-NEG-L', 'Color', 'Negro', 2),
    ('BUZO-CAN-BEI-M', 'Talle', 'M', 1),
    ('BUZO-CAN-BEI-M', 'Color', 'Beige', 2),
    ('BUZO-CAN-BEI-L', 'Talle', 'L', 1),
    ('BUZO-CAN-BEI-L', 'Color', 'Beige', 2),
    ('BUZO-CAN-ROS-M', 'Talle', 'M', 1),
    ('BUZO-CAN-ROS-M', 'Color', 'Rosa', 2),
    ('CAMP-PUF-NEG-M', 'Talle', 'M', 1),
    ('CAMP-PUF-NEG-M', 'Color', 'Negro', 2),
    ('CAMP-PUF-NEG-L', 'Talle', 'L', 1),
    ('CAMP-PUF-NEG-L', 'Color', 'Negro', 2),
    ('CAMP-PUF-AZU-L', 'Talle', 'L', 1),
    ('CAMP-PUF-AZU-L', 'Color', 'Azul', 2),
    ('CAMP-DEN-AZU-S', 'Talle', 'S', 1),
    ('CAMP-DEN-AZU-S', 'Color', 'Azul', 2),
    ('CAMP-DEN-AZU-M', 'Talle', 'M', 1),
    ('CAMP-DEN-AZU-M', 'Color', 'Azul', 2),
    ('CAMP-DEN-AZU-L', 'Talle', 'L', 1),
    ('CAMP-DEN-AZU-L', 'Color', 'Azul', 2),
    ('VEST-MID-NEG-S', 'Talle', 'S', 1),
    ('VEST-MID-NEG-S', 'Color', 'Negro', 2),
    ('VEST-MID-NEG-M', 'Talle', 'M', 1),
    ('VEST-MID-NEG-M', 'Color', 'Negro', 2),
    ('VEST-MID-NEG-L', 'Talle', 'L', 1),
    ('VEST-MID-NEG-L', 'Color', 'Negro', 2),
    ('VEST-COR-ROS-S', 'Talle', 'S', 1),
    ('VEST-COR-ROS-S', 'Color', 'Rosa', 2),
    ('VEST-COR-ROS-M', 'Talle', 'M', 1),
    ('VEST-COR-ROS-M', 'Color', 'Rosa', 2),
    ('VEST-COR-BLA-M', 'Talle', 'M', 1),
    ('VEST-COR-BLA-M', 'Color', 'Blanco', 2),
    ('FALDA-PLI-NEG-S', 'Talle', 'S', 1),
    ('FALDA-PLI-NEG-S', 'Color', 'Negro', 2),
    ('FALDA-PLI-NEG-M', 'Talle', 'M', 1),
    ('FALDA-PLI-NEG-M', 'Color', 'Negro', 2),
    ('FALDA-PLI-NEG-L', 'Talle', 'L', 1),
    ('FALDA-PLI-NEG-L', 'Color', 'Negro', 2),
    ('GOR-BOR-NEG-U', 'Talle', 'Único', 1),
    ('GOR-BOR-NEG-U', 'Color', 'Negro', 2),
    ('GOR-BOR-BLA-U', 'Talle', 'Único', 1),
    ('GOR-BOR-BLA-U', 'Color', 'Blanco', 2),
    ('MED-PACK-NEG-U', 'Talle', 'Único', 1),
    ('MED-PACK-NEG-U', 'Color', 'Negro', 2),
    ('MED-PACK-BLA-U', 'Talle', 'Único', 1),
    ('MED-PACK-BLA-U', 'Color', 'Blanco', 2)
),
resueltos AS (
    SELECT m.sku, m.etiqueta, m.orden, v.id_variante,
           (SELECT MIN(va.id_atributo) FROM valor_atributo va WHERE va.valor = m.valor) AS id_atributo
    FROM mapa m
    JOIN variante v ON v.sku = m.sku
    JOIN producto p ON p.id_producto = v.id_producto
    JOIN productos_prueba pp ON pp.nombre = p.nombre
),
faltantes AS (
    SELECT r.*,
           ROW_NUMBER() OVER (ORDER BY r.id_variante, r.orden) AS rn
    FROM resueltos r
    WHERE NOT EXISTS (
        SELECT 1 FROM valor_variante vv
        WHERE vv.id_variante = r.id_variante
          AND vv.id_valor_atributo = r.id_atributo
    )
),
base AS (
    SELECT COALESCE(MAX(id_valor_variante), 0) AS max_id FROM valor_variante
)
INSERT INTO valor_variante (id_valor_variante, id_variante, id_valor_atributo, nombre)
SELECT base.max_id + f.rn, f.id_variante, f.id_atributo, f.etiqueta
FROM faltantes f
CROSS JOIN base;

-- -----------------------------------------------------------------------------
-- 7. IMÁGENES DE VARIANTE (una principal + una de detalle por variante)
-- -----------------------------------------------------------------------------

BEGIN;

WITH productos_prueba(nombre) AS (
    VALUES
        ('Remera Oversize Básica'),
        ('Remera Manga Corta Algodón'),
        ('Jean Recto Tiro Alto'),
        ('Pantalón Cargo Jogger'),
        ('Short Deportivo'),
        ('Buzo Hoodie Frisa'),
        ('Buzo Canguro Oversize'),
        ('Campera Puffer'),
        ('Campera Denim Clásica'),
        ('Vestido Midi Negro'),
        ('Vestido Corto Floreado'),
        ('Falda Plisada Midi'),
        ('Gorra Bordada'),
        ('Medias Pack x3')
)
INSERT INTO imagenes_variante (id_variante, url, es_principal)
SELECT
    v.id_variante,
    datos.url,
    datos.es_principal
FROM (
    VALUES
        -- Remeras oversize negras
        ('REM-OVR-NEG-', '/uploads/productos/prenda-1786063705478.jpeg', TRUE),
        ('REM-OVR-NEG-', '/uploads/productos/prenda-1786063705480.jpeg', FALSE),

        -- Remeras oversize blancas
        ('REM-OVR-BLA-', '/uploads/productos/prenda-1786063767640.jpeg', TRUE),
        ('REM-OVR-BLA-', '/uploads/productos/prenda-1786063812972.jpeg', FALSE),

        -- Remeras manga corta
        ('REM-MC-BLA-', '/uploads/productos/prenda-1786063867232.jpeg', TRUE),
        ('REM-MC-GRI-', '/uploads/productos/prenda-1786063867234.jpeg', TRUE),

        -- Jeans
        ('JEAN-REC-AZU-', '/uploads/productos/prenda-1786063971333.jpeg', TRUE),
        ('JEAN-REC-NEG-', '/uploads/productos/prenda-1786063971334.jpeg', TRUE),

        -- Pantalones cargo
        ('PANT-CAR-VER-', '/uploads/productos/prenda-1786063971335.jpeg', TRUE),
        ('PANT-CAR-NEG-', '/uploads/productos/prenda-1786064019579.jpeg', TRUE),

        -- Shorts deportivos
        ('SHORT-DEP-NEG-', '/uploads/productos/prenda-1786064019581.jpeg', TRUE),
        ('SHORT-DEP-AZU-', '/uploads/productos/prenda-1786064019582.jpeg', TRUE),

        -- Buzos hoodie
        ('BUZO-HOD-GRI-', '/uploads/productos/prenda-1786064159120.jpeg', TRUE),
        ('BUZO-HOD-NEG-', '/uploads/productos/prenda-1786064159122.jpeg', TRUE),

        -- Buzos canguro
        ('BUZO-CAN-BEI-', '/uploads/productos/prenda-1786064235981.jpeg', TRUE),
        ('BUZO-CAN-ROS-', '/uploads/productos/prenda-1786064235983.jpeg', TRUE),

        -- Camperas puffer
        ('CAMP-PUF-NEG-', '/uploads/productos/prenda-1786064235985.jpeg', TRUE),
        ('CAMP-PUF-AZU-', '/uploads/productos/prenda-1786064320966.jpeg', TRUE),

        -- Camperas denim
        ('CAMP-DEN-AZU-', '/uploads/productos/prenda-1786064435839.jpeg', TRUE),

        -- Chalecos
        ('VEST-MID-NEG-', '/uploads/productos/prenda-1786064435840.jpeg', TRUE),
        ('VEST-COR-ROS-', '/uploads/productos/prenda-1786064435841.jpeg', TRUE),
        ('VEST-COR-BLA-', '/uploads/productos/prenda-1786066359307.jpeg', TRUE),

        -- Faldas
        ('FALDA-PLI-NEG-', '/uploads/productos/prenda-1786066359308.jpeg', TRUE),

        -- Gorras
        ('GOR-BOR-NEG-', '/uploads/productos/prenda-1786066359310.jpeg', TRUE),
        ('GOR-BOR-BLA-', '/uploads/productos/prenda-1786066359311.jpeg', TRUE),

        -- Medias
        ('MED-PACK-NEG-', '/uploads/productos/prenda-1786069460594.jpeg', TRUE),
        ('MED-PACK-BLA-', '/uploads/productos/prenda-1786069484969.jpeg', TRUE)

) AS datos(prefijo, url, es_principal)

JOIN variante v
    ON v.sku LIKE datos.prefijo || '%'
JOIN producto p
    ON p.id_producto = v.id_producto
JOIN productos_prueba pp
    ON pp.nombre = p.nombre

WHERE NOT EXISTS (
    SELECT 1
    FROM imagenes_variante iv
    WHERE iv.id_variante = v.id_variante
      AND iv.url = datos.url
);

COMMIT;

-- -----------------------------------------------------------------------------
-- Para borrar SOLO este catálogo de prueba (descomentar y ejecutar):
-- DELETE FROM producto WHERE nombre IN (
--     'Remera Oversize Básica',
--     'Remera Manga Corta Algodón',
--     'Jean Recto Tiro Alto',
--     'Pantalón Cargo Jogger',
--     'Short Deportivo',
--     'Buzo Hoodie Frisa',
--     'Buzo Canguro Oversize',
--     'Campera Puffer',
--     'Campera Denim Clásica',
--     'Vestido Midi Negro',
--     'Vestido Corto Floreado',
--     'Falda Plisada Midi',
--     'Gorra Bordada',
--     'Medias Pack x3'
-- );
-- -----------------------------------------------------------------------------

-- =============================================================================
-- SCRIPT DDL: BASE DE DATOS E-COMMERCE (POSTGRESQL)
-- Fuente de verdad: DDL oficial del humano (adaptado: CREATE TABLE IF NOT EXISTS
-- para que bd:init sea idempotente). Sin cambios semanticos.
-- Idempotencia: CREATE TABLE IF NOT EXISTS y ALTER/PDROP con IF EXISTS.
-- Limpieza de transicion: se descartan las tablas minimas anteriores
-- (productos y variantes en plural) para dejar la base limpia; el resto del
-- script no destruye datos.
-- =============================================================================

DROP TABLE IF EXISTS variantes;
DROP TABLE IF EXISTS productos;

-- 1. TABLAS BASE / CATALOGOS SIN DEPENDENCIAS PREVIAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
    id_roles SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    es_destacada BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS valor_atributo (
    id_atributo SERIAL PRIMARY KEY,
    valor VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS direccion (
    id_direccion BIGSERIAL PRIMARY KEY,
    calle VARCHAR(255) NOT NULL,
    numero VARCHAR(50) NOT NULL,
    localidad VARCHAR(150) NOT NULL,
    codigo_postal VARCHAR(20) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    dpto VARCHAR(50)
);

-- 2. USUARIOS Y ENTIDADES VINCULADAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    dni VARCHAR(30),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES roles (id_roles) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS configuracion_web (
    id_configuracion SERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_config_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS banners (
    id_banner SERIAL PRIMARY KEY,
    titulo VARCHAR(150),
    id_configuracion BIGINT NOT NULL,
    subtitulo VARCHAR(255),
    descripcion TEXT,
    url_imagen VARCHAR(500) NOT NULL,
    link_referencia VARCHAR(500),
    esta_activo BOOLEAN DEFAULT TRUE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_banners_configuracion FOREIGN KEY (id_configuracion)
        REFERENCES configuracion_web (id_configuracion) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS usuario_token (
    id_token BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_token_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuario_direccion (
    id_direccion BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (id_direccion, id_usuario),
    CONSTRAINT fk_udir_direccion FOREIGN KEY (id_direccion)
        REFERENCES direccion (id_direccion) ON DELETE CASCADE,
    CONSTRAINT fk_udir_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

-- 3. PRODUCTOS, VARIANTES Y ASOCIADAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS producto (
    id_producto BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    es_destacado BOOLEAN DEFAULT FALSE,
    id_categoria INT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    marca VARCHAR(100),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS especificaciones (
    id_especificacion BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL,
    CONSTRAINT fk_especif_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review (
    id_review BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    puntuacion SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario TEXT,
    CONSTRAINT fk_review_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_review_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS variante (
    id_variante BIGSERIAL PRIMARY KEY,
    id_producto BIGINT NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    CONSTRAINT fk_variante_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS imagenes_variante (
    id_imagen BIGSERIAL PRIMARY KEY,
    id_variante BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_imgvar_variante FOREIGN KEY (id_variante)
        REFERENCES variante (id_variante) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS valor_variante (
    id_valor_variante BIGINT NOT NULL,
    id_variante BIGINT NOT NULL,
    id_valor_atributo INT NOT NULL,
    PRIMARY KEY (id_valor_variante, id_variante),
    CONSTRAINT fk_vvar_variante FOREIGN KEY (id_variante)
        REFERENCES variante (id_variante) ON DELETE CASCADE,
    CONSTRAINT fk_vvar_atributo FOREIGN KEY (id_valor_atributo)
        REFERENCES valor_atributo (id_atributo) ON UPDATE CASCADE
);

-- 4. LISTA DE FAVORITOS Y CARRITO
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lista_favoritos (
    id_lista_favoritos BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_fav_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorito_item (
    id_favorito_item BIGSERIAL PRIMARY KEY,
    id_lista_favoritos BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    CONSTRAINT fk_fitem_lista FOREIGN KEY (id_lista_favoritos)
        REFERENCES lista_favoritos (id_lista_favoritos) ON DELETE CASCADE,
    CONSTRAINT fk_fitem_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE CASCADE,
    CONSTRAINT uq_favorito_producto UNIQUE (id_lista_favoritos, id_producto)
);

CREATE TABLE IF NOT EXISTS carrito (
    id_carrito BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL UNIQUE,
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_carrito_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carrito_item (
    id_carrito_item BIGSERIAL PRIMARY KEY,
    id_carrito BIGINT NOT NULL,
    id_variante BIGINT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    CONSTRAINT fk_citem_carrito FOREIGN KEY (id_carrito)
        REFERENCES carrito (id_carrito) ON DELETE CASCADE,
    CONSTRAINT fk_citem_variante FOREIGN KEY (id_variante)
        REFERENCES variante (id_variante) ON DELETE CASCADE,
    CONSTRAINT uq_carrito_variante UNIQUE (id_carrito, id_variante)
);

-- 5. PEDIDOS Y FLUJO DE COMPRA
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pedido (
    id_pedido BIGSERIAL PRIMARY KEY,
    id_usuario BIGINT NOT NULL,
    id_direccion BIGINT,
    direccion_snapshot JSONB,
    estado VARCHAR(50) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    costo_envio NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_envio >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_direccion FOREIGN KEY (id_direccion)
        REFERENCES direccion (id_direccion) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS item_pedido (
    id_item_pedido BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL,
    id_variante BIGINT,
    sku_snapshot VARCHAR(100),
    nombre_snapshot VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    CONSTRAINT fk_itemped_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_itemped_variante FOREIGN KEY (id_variante)
        REFERENCES variante (id_variante) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedido_estado_historial (
    id_pedido_estado_historial BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL,
    proveedor VARCHAR(100) NOT NULL,
    importe NUMERIC(12, 2) NOT NULL CHECK (importe >= 0),
    estado VARCHAR(50) NOT NULL,
    CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS envio (
    id_envio BIGSERIAL PRIMARY KEY,
    id_pedido BIGINT NOT NULL,
    transportista VARCHAR(100),
    tracking VARCHAR(150),
    estado VARCHAR(50) NOT NULL,
    CONSTRAINT fk_envio_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE
);

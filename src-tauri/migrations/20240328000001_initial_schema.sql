-- ==========================================
-- 1. MAESTROS GLOBALES Y SEGURIDAD
-- ==========================================
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id TEXT PRIMARY KEY,
    usuario_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id TEXT,
    detalles TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    dni TEXT DEFAULT '00000000',
    nombre_completo TEXT DEFAULT 'Usuario Migrado',
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL, 
    estado INTEGER DEFAULT 1, 
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS marcas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    categoria_id TEXT
);

-- ==========================================
-- 2. CATÁLOGO CENTRAL
-- ==========================================
CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY,
    categoria_id TEXT,
    marca_id TEXT,
    nombre TEXT NOT NULL,
    sku TEXT UNIQUE,
    precio_compra_referencial REAL DEFAULT 0,
    precio_venta_referencial REAL DEFAULT 0,
    es_vehiculo BOOLEAN DEFAULT 0,
    stock_minimo INTEGER DEFAULT 2,
    cilindraje INTEGER DEFAULT NULL,
    modelo TEXT DEFAULT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(categoria_id) REFERENCES categorias(id),
    FOREIGN KEY(marca_id) REFERENCES marcas(id)
);

-- ==========================================
-- 3. INVENTARIO Y VEHÍCULOS
-- ==========================================
CREATE TABLE IF NOT EXISTS inventario_lotes (
    id TEXT PRIMARY KEY,
    producto_id TEXT,
    color TEXT,
    cantidad INTEGER DEFAULT 0,
    ubicacion TEXT,
    FOREIGN KEY(producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS vehiculos_fisicos (
    id TEXT PRIMARY KEY,
    lote_id TEXT,
    numero_chasis TEXT UNIQUE,
    numero_motor TEXT UNIQUE,
    estado TEXT DEFAULT 'DISPONIBLE',
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lote_id) REFERENCES inventario_lotes(id)
);

-- ==========================================
-- 4. KARDEX Y MOVIMIENTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS kardex (
    id TEXT PRIMARY KEY,
    lote_id TEXT,
    tipo_movimiento TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT,
    FOREIGN KEY(lote_id) REFERENCES inventario_lotes(id)
);

-- ==========================================
-- 5. CLIENTES Y VENTAS
-- ==========================================
CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY,
    cliente_id TEXT REFERENCES clientes(id),
    usuario_id TEXT REFERENCES usuarios(id),
    cliente_nombre TEXT NOT NULL,
    total REAL NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas_detalles (
    id TEXT PRIMARY KEY,
    venta_id TEXT NOT NULL,
    lote_id TEXT NOT NULL,
    vehiculo_fisico_id TEXT,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (lote_id) REFERENCES inventario_lotes(id),
    FOREIGN KEY (vehiculo_fisico_id) REFERENCES vehiculos_fisicos(id)
);

-- ==========================================
-- 6. TALLER
-- ==========================================
CREATE TABLE IF NOT EXISTS taller_ordenes (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    creado_por TEXT REFERENCES usuarios(id),
    vehiculo_info TEXT NOT NULL,
    motivo_ingreso TEXT NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE',
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_estimada DATETIME,
    fecha_entrega DATETIME, -- ✨ NUEVO CAMPO (Nace nulo)
    costo_mano_obra REAL DEFAULT 0,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS taller_detalles (
    id TEXT PRIMARY KEY,
    orden_id TEXT NOT NULL,
    lote_id TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (orden_id) REFERENCES taller_ordenes(id),
    FOREIGN KEY (lote_id) REFERENCES inventario_lotes(id)
);

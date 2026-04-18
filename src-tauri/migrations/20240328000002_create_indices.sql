
-- ==========================================
-- 7. ÍNDICES DE OPTIMIZACIÓN
-- ==========================================

-- Migración: Índices para optimizar búsquedas, filtros dinámicos y paginación
-- ==========================================
-- 7.1. KARDEX Y MOVIMIENTOS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON kardex(fecha DESC);

-- ==========================================
-- 7.2. CATÁLOGO DE PRODUCTOS
-- ==========================================
-- Búsquedas directas por texto
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON productos(sku);

-- 🔥 NUEVO: Índices para llaves foráneas (Filtros por Maestros)
-- Esto hace que el "WHERE categoria_id = X AND marca_id = Y" sea instantáneo
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos(marca_id);

-- Índice compuesto: Ideal si en tu UI permites elegir Categoría y luego Marca al mismo tiempo
CREATE INDEX IF NOT EXISTS idx_productos_cat_marca ON productos(categoria_id, marca_id);

-- ==========================================
-- 7.3. CLIENTES
-- ==========================================
-- 🔥 NUEVO: Búsqueda exacta por documento (Altísima prioridad)
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON clientes(numero_documento);

-- Búsqueda por nombre (Para los autocompletados al escribir)
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre_completo);

-- ==========================================
-- 7.4. USUARIOS
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre_completo);

-- ==========================================
-- 7.5. VENTAS (HISTORIAL, FILTROS Y REPORTES)
-- ==========================================
-- Para ordenar por los más recientes y filtrar por rangos de fechas
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha DESC);

-- Para búsquedas de auditoría por llaves foráneas
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);

-- Índice compuesto para reportes (Ventas de un usuario en un rango de fechas)
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha ON ventas(usuario_id, fecha DESC);
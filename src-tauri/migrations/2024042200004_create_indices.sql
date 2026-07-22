-- ==========================================
-- MIGRACIÓN v3: Índices compuestos y case-insensitive
-- ==========================================
-- Estos índices complementan los existentes en v1 y v2,
-- optimizando las CTEs críticas de Kardex y ordenamiento de catálogo.
-- ==========================================

-- ==========================================
-- 1. KARDEX — Índice triple para particiones (Window Functions)
-- ==========================================
-- Cubre: WHERE tipo_movimiento = ? AND lote_id IN (...) ORDER BY fecha DESC
-- Usado intensivamente por la CTE UltimaEntrada en el inventario.
CREATE INDEX IF NOT EXISTS idx_kardex_lote_tipo_fecha 
    ON kardex(lote_id, tipo_movimiento, fecha DESC);

-- ==========================================
-- 2. PRODUCTOS — Índices Insensibles a Mayúsculas (NOCASE)
-- ==========================================
-- Permite que los ORDER BY y las comparaciones directas case-insensitive
-- no requieran escanear y convertir (LOWER) toda la tabla en memoria.
CREATE INDEX IF NOT EXISTS idx_productos_nombre_nocase 
    ON productos(nombre COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_productos_sku_nocase 
    ON productos(sku COLLATE NOCASE);
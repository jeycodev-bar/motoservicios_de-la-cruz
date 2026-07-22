-- ==========================================
-- MIGRACIÓN: Índices faltantes — Bodega, Taller, Ventas
-- ==========================================
-- INSTRUCCIÓN: Añadir al final de tu archivo de migración existente
-- (después del bloque "7. ÍNDICES DE OPTIMIZACIÓN").
-- IF NOT EXISTS garantiza idempotencia — se puede ejecutar varias veces sin error.
-- ==========================================

-- ==========================================
-- 7.6. INVENTARIO_LOTES (tabla de mayor crecimiento del sistema)
-- ==========================================

-- Índice parcial compuesto: acelera la query de catálogo de repuestos en taller.
-- WHERE cantidad > 0 filtra los lotes agotados desde el índice — no se leen en absoluto.
-- La columna producto_id permite resolver el JOIN con productos sin heap scan.
-- Antes: O(N) sobre todos los lotes. Después: O(log N) sobre solo los lotes con stock.
CREATE INDEX IF NOT EXISTS idx_il_cantidad_producto
    ON inventario_lotes(cantidad, producto_id)
    WHERE cantidad > 0;

-- Índice en producto_id solo (para los JOINs de bodega, kardex, catálogo).
-- Sin este índice, cada JOIN hace un full scan de inventario_lotes.
CREATE INDEX IF NOT EXISTS idx_il_producto_id
    ON inventario_lotes(producto_id);

-- ==========================================
-- 7.7. KARDEX (tabla de mayor volumen — crece con cada movimiento)
-- ==========================================

-- Índice en lote_id: acelera todos los JOINs desde inventario_lotes hacia kardex.
-- Las CTEs de Bodega (UltimaEntrada, StockAnterior) lo usan intensivamente.
CREATE INDEX IF NOT EXISTS idx_kardex_lote_id
    ON kardex(lote_id);

-- Índice compuesto lote + tipo: filtra por tipo_movimiento dentro de un lote.
-- Usado por la CTE UltimaEntrada: WHERE k.tipo_movimiento = 'ENTRADA' AND k.lote_id = ?
-- Con este índice la CTE no lee las SALIDAS ni DEVOLUCION_TALLER de ese lote.
CREATE INDEX IF NOT EXISTS idx_kardex_lote_tipo
    ON kardex(lote_id, tipo_movimiento);

-- Índice compuesto lote + fecha: acelera el ORDER BY k.fecha DESC dentro de ROW_NUMBER().
-- Sin él, SQLite ordena en memoria todos los movimientos del lote.
CREATE INDEX IF NOT EXISTS idx_kardex_lote_fecha
    ON kardex(lote_id, fecha DESC);

-- ==========================================
-- 7.8. TALLER_ORDENES
-- ==========================================

-- Índice en estado: acelera la query principal del Kanban (WHERE estado != 'ARCHIVADO').
-- Con 10k+ órdenes históricas, sin este índice el Kanban hace full scan en cada recarga.
CREATE INDEX IF NOT EXISTS idx_taller_ordenes_estado
    ON taller_ordenes(estado);

-- Índice en cliente_id: acelera el JOIN con clientes en todas las queries de taller.
CREATE INDEX IF NOT EXISTS idx_taller_ordenes_cliente
    ON taller_ordenes(cliente_id);

-- Índice en creado_por: acelera el LEFT JOIN con usuarios (mecánico_nombre).
CREATE INDEX IF NOT EXISTS idx_taller_ordenes_creado_por
    ON taller_ordenes(creado_por);

-- ==========================================
-- 7.9. TALLER_DETALLES
-- ==========================================

-- Índice en orden_id: acelera obtener_detalles_orden (WHERE td.orden_id = ?).
-- Sin este índice, cada apertura de hoja de trabajo hace full scan de taller_detalles.
CREATE INDEX IF NOT EXISTS idx_taller_detalles_orden
    ON taller_detalles(orden_id);

-- Índice en lote_id: acelera el JOIN con inventario_lotes para resolver producto_nombre.
CREATE INDEX IF NOT EXISTS idx_taller_detalles_lote
    ON taller_detalles(lote_id);

-- ==========================================
-- 7.10. VENTAS_DETALLES
-- ==========================================

-- Índice en lote_id: acelera el JOIN con inventario_lotes en obtener_detalle_venta.
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_lote
    ON ventas_detalles(lote_id);

-- Índice en venta_id: acelera la query WHERE vd.venta_id = ? en obtener_detalle_venta.
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_venta
    ON ventas_detalles(venta_id);
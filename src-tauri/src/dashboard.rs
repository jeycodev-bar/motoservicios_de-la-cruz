//src-tauri/src/dashboard.rs

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// =============================================================================
// DTOs
// =============================================================================

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct KpiPrincipal {
    pub ventas_total: f64,
    pub ventas_total_anterior: f64,
    pub ventas_delta_pct: f64,
    pub transacciones: i64,
    pub transacciones_anterior: i64,
    pub transacciones_delta_pct: f64,
    /// Ingresos de taller: mano_obra + repuestos, solo ENTREGADO + ARCHIVADO, por fecha_entrega
    pub ingresos_taller: f64,
    pub ingresos_taller_anterior: f64,
    pub taller_delta_pct: f64,
    pub clientes_activos: i64,
    pub clientes_nuevos: i64,
    pub ticket_promedio: f64,
    pub motos_vendidas: i64,
    /// Balance del día actual (ventas_hoy + taller_hoy)
    pub balance_hoy: f64,
    pub ventas_hoy: f64,
    /// Taller cobrado hoy (mano_obra_hoy + repuestos_taller_hoy)
    pub taller_hoy: f64,
    pub mano_obra_hoy: f64,
    pub repuestos_taller_hoy: f64,
    pub transacciones_hoy: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct PuntoVentaDiaria {
    pub fecha: String,
    pub ventas: f64,
    /// Taller del día: mano_obra + repuestos, ENTREGADO + ARCHIVADO, por fecha_entrega
    pub taller: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VentaCategoria {
    pub nombre: String,
    pub total: f64,
    pub porcentaje: f64,
    pub cantidad: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
struct VentaCategoriaRaw {
    pub nombre: String,
    pub total: f64,
    pub cantidad: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct ProductoStockCritico {
    pub id: String,
    pub nombre: String,
    pub sku: Option<String>,
    pub categoria: Option<String>,
    pub marca: Option<String>,
    pub cantidad_actual: i64,
    pub stock_minimo: i64,
    pub porcentaje_stock: f64,
    pub nivel: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct ActividadReciente {
    pub id: String,
    pub tipo: String,
    pub descripcion: String,
    pub detalle: String,
    pub monto: Option<f64>,
    pub fecha: String,
    pub usuario: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct OrdenTallerResumen {
    pub id: String,
    pub cliente_nombre: String,
    pub vehiculo_info: String,
    pub motivo_ingreso: String,
    pub estado: String,
    pub fecha_ingreso: String,
    pub fecha_estimada: Option<String>,
    pub fecha_entrega: Option<String>,
    pub costo_mano_obra: f64,
    pub total_repuestos: f64,
    pub mecanico: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TallerResumen {
    /// Órdenes activas para el Kanban (PENDIENTE, EN_PROCESO, LISTO, ENTREGADO)
    /// ARCHIVADO excluido — el historial completo vive en el módulo de Historial de Taller.
    pub ordenes: Vec<OrdenTallerResumen>,
    pub total_pendiente: i64,
    pub total_en_proceso: i64,
    pub total_listo: i64,
    pub total_entregado: i64,
    /// Ingresos del mes: mano_obra + repuestos, ENTREGADO + ARCHIVADO
    pub ingresos_mes: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct TopProducto {
    pub nombre: String,
    pub sku: Option<String>,
    pub categoria: Option<String>,
    pub cantidad_vendida: i64,
    pub total_generado: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardData {
    pub kpis: KpiPrincipal,
    pub ventas_diarias: Vec<PuntoVentaDiaria>,
    pub por_categoria: Vec<VentaCategoria>,
    pub stock_critico: Vec<ProductoStockCritico>,
    pub actividad_reciente: Vec<ActividadReciente>,
    pub taller: TallerResumen,
    pub top_productos: Vec<TopProducto>,
    pub periodo_dias: i64,
}

// =============================================================================
// PARÁMETROS DE PERÍODO
// =============================================================================

#[derive(Debug, Deserialize)]
pub struct PeriodoParams {
    pub inicio: String,
    pub inicio_ant: String,
    pub inicio_hoy: String,
    pub fin_hoy: String,
    pub inicio_mes: String,
    pub dias: i64,
}

// =============================================================================
// HELPERS
// =============================================================================

#[inline]
fn calcular_delta(actual: f64, anterior: f64) -> f64 {
    if anterior.abs() < f64::EPSILON {
        return if actual > 0.0 { 100.0 } else { 0.0 };
    }
    ((actual - anterior) / anterior) * 100.0
}

// =============================================================================
// QUERIES
// =============================================================================

async fn query_kpis(pool: &SqlitePool, p: &PeriodoParams) -> Result<KpiPrincipal, sqlx::Error> {
    #[derive(sqlx::FromRow)]
    struct VentasRow {
        ventas_total: f64,
        ventas_anterior: f64,
        transacciones: i64,
        transacciones_anterior: i64,
        ticket_promedio: f64,
        motos_vendidas: i64,
        ventas_hoy: f64,
        transacciones_hoy: i64,
    }

    let ventas = sqlx::query_as::<_, VentasRow>(
        "SELECT
            CAST(COALESCE(SUM(
                CASE WHEN fecha >= ?1 AND fecha < ?4 THEN total ELSE 0.0 END
            ), 0.0) AS REAL) AS ventas_total,

            CAST(COALESCE(SUM(
                CASE WHEN fecha >= ?2 AND fecha < ?1 THEN total ELSE 0.0 END
            ), 0.0) AS REAL) AS ventas_anterior,

            COUNT(CASE WHEN fecha >= ?1 AND fecha < ?4 THEN 1 END) AS transacciones,
            COUNT(CASE WHEN fecha >= ?2 AND fecha < ?1 THEN 1 END) AS transacciones_anterior,

            CAST(CASE
                WHEN COUNT(CASE WHEN fecha >= ?1 AND fecha < ?4 THEN 1 END) > 0
                THEN SUM(CASE WHEN fecha >= ?1 AND fecha < ?4 THEN total ELSE 0.0 END)
                   / COUNT(CASE WHEN fecha >= ?1 AND fecha < ?4 THEN 1 END)
                ELSE 0.0
            END AS REAL) AS ticket_promedio,

            COALESCE((
                SELECT SUM(vd.cantidad)
                FROM ventas_detalles vd
                JOIN ventas v2        ON v2.id  = vd.venta_id
                JOIN inventario_lotes il ON il.id = vd.lote_id
                JOIN productos pr     ON pr.id  = il.producto_id
                WHERE pr.es_vehiculo = 1
                  AND v2.fecha >= ?1 AND v2.fecha < ?4
            ), 0) AS motos_vendidas,

            CAST(COALESCE(SUM(
                CASE WHEN fecha >= ?3 AND fecha < ?4 THEN total ELSE 0.0 END
            ), 0.0) AS REAL) AS ventas_hoy,
            COUNT(CASE WHEN fecha >= ?3 AND fecha < ?4 THEN 1 END) AS transacciones_hoy

         FROM ventas",
    )
    .bind(&p.inicio)
    .bind(&p.inicio_ant)
    .bind(&p.inicio_hoy)
    .bind(&p.fin_hoy)
    .fetch_one(pool)
    .await?;

    #[derive(sqlx::FromRow)]
    struct TallerClientesRow {
        ingresos_taller: f64,
        ingresos_taller_anterior: f64,
        clientes_activos: i64,
        clientes_nuevos: i64,
        mano_obra_hoy: f64,
        repuestos_hoy: f64,
    }

    // FIX N+1: en lugar de subquery correlacionada por cada orden,
    // usamos LEFT JOIN con taller_detalles agrupado en CTE.
    // La versión anterior ejecutaba 1 subquery extra por cada orden ENTREGADA/ARCHIVADA.
    let tc = sqlx::query_as::<_, TallerClientesRow>(
        "WITH repuestos_por_orden AS (
            SELECT orden_id, SUM(subtotal) AS total_repuestos
            FROM taller_detalles
            GROUP BY orden_id
        )
        SELECT
            COALESCE(SUM(CASE
                WHEN t.fecha_entrega >= ?1 AND t.fecha_entrega < ?4
                 AND t.estado IN ('ENTREGADO','ARCHIVADO')
                THEN t.costo_mano_obra + COALESCE(r.total_repuestos, 0.0)
                ELSE 0.0
            END), 0.0) AS ingresos_taller,

            COALESCE(SUM(CASE
                WHEN t.fecha_entrega >= ?2 AND t.fecha_entrega < ?1
                 AND t.estado IN ('ENTREGADO','ARCHIVADO')
                THEN t.costo_mano_obra + COALESCE(r.total_repuestos, 0.0)
                ELSE 0.0
            END), 0.0) AS ingresos_taller_anterior,

            (SELECT COUNT(DISTINCT cliente_id)
             FROM ventas
             WHERE fecha >= ?1 AND fecha < ?4
               AND cliente_id IS NOT NULL) AS clientes_activos,

            (SELECT COUNT(*)
             FROM clientes
             WHERE fecha_registro >= ?1 AND fecha_registro < ?4) AS clientes_nuevos,

            COALESCE(SUM(CASE
                WHEN t.fecha_entrega >= ?3 AND t.fecha_entrega < ?4
                 AND t.estado IN ('ENTREGADO','ARCHIVADO')
                THEN t.costo_mano_obra
                ELSE 0.0
            END), 0.0) AS mano_obra_hoy,

            COALESCE(SUM(CASE
                WHEN t.fecha_entrega >= ?3 AND t.fecha_entrega < ?4
                 AND t.estado IN ('ENTREGADO','ARCHIVADO')
                THEN COALESCE(r.total_repuestos, 0.0)
                ELSE 0.0
            END), 0.0) AS repuestos_hoy

        FROM taller_ordenes t
        LEFT JOIN repuestos_por_orden r ON r.orden_id = t.id",
    )
    .bind(&p.inicio)
    .bind(&p.inicio_ant)
    .bind(&p.inicio_hoy)
    .bind(&p.fin_hoy)
    .fetch_one(pool)
    .await?;

    let taller_hoy = tc.mano_obra_hoy + tc.repuestos_hoy;
    let balance_hoy = ventas.ventas_hoy + taller_hoy;

    Ok(KpiPrincipal {
        ventas_total: ventas.ventas_total,
        ventas_total_anterior: ventas.ventas_anterior,
        ventas_delta_pct: calcular_delta(ventas.ventas_total, ventas.ventas_anterior),
        transacciones: ventas.transacciones,
        transacciones_anterior: ventas.transacciones_anterior,
        transacciones_delta_pct: calcular_delta(
            ventas.transacciones as f64,
            ventas.transacciones_anterior as f64,
        ),
        ingresos_taller: tc.ingresos_taller,
        ingresos_taller_anterior: tc.ingresos_taller_anterior,
        taller_delta_pct: calcular_delta(tc.ingresos_taller, tc.ingresos_taller_anterior),
        clientes_activos: tc.clientes_activos,
        clientes_nuevos: tc.clientes_nuevos,
        ticket_promedio: ventas.ticket_promedio,
        motos_vendidas: ventas.motos_vendidas,
        balance_hoy,
        ventas_hoy: ventas.ventas_hoy,
        taller_hoy,
        mano_obra_hoy: tc.mano_obra_hoy,
        repuestos_taller_hoy: tc.repuestos_hoy,
        transacciones_hoy: ventas.transacciones_hoy,
    })
}

async fn query_ventas_diarias(
    pool: &SqlitePool,
    p: &PeriodoParams,
) -> Result<Vec<PuntoVentaDiaria>, sqlx::Error> {
    // FIX N+1 en taller_dia:
    // La versión anterior tenía una subquery correlacionada (SELECT SUM(td.subtotal)
    // WHERE td.orden_id = t.id) ejecutada una vez por cada orden en el LEFT JOIN.
    // La nueva versión pre-agrega repuestos en taller_rep CTE y hace un solo JOIN.
    sqlx::query_as::<_, PuntoVentaDiaria>(
        "WITH RECURSIVE seq(n) AS (
            SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < ?1 - 1
        ),
        dias AS (
            SELECT
                datetime(?2, '-' || n || ' days')           AS dia_inicio,
                datetime(?2, '-' || n || ' days', '+1 day') AS dia_fin,
                date(datetime(?2, '+5 hours', '-' || n || ' days')) AS fecha_local
            FROM seq
        ),
        -- Pre-agrega repuestos por orden: 1 pasada sobre taller_detalles total
        taller_rep AS (
            SELECT orden_id, SUM(subtotal) AS rep_total
            FROM taller_detalles
            GROUP BY orden_id
        ),
        ventas_dia AS (
            SELECT
                d.fecha_local AS dia,
                COALESCE(SUM(v.total), 0.0) AS total
            FROM dias d
            LEFT JOIN ventas v
                ON v.fecha >= d.dia_inicio
               AND v.fecha <  d.dia_fin
            GROUP BY d.fecha_local
        ),
        taller_dia AS (
            SELECT
                d.fecha_local AS dia,
                COALESCE(SUM(
                    t.costo_mano_obra + COALESCE(r.rep_total, 0.0)
                ), 0.0) AS total
            FROM dias d
            LEFT JOIN taller_ordenes t
                ON  t.fecha_entrega >= d.dia_inicio
                AND t.fecha_entrega <  d.dia_fin
                AND t.estado IN ('ENTREGADO', 'ARCHIVADO')
            LEFT JOIN taller_rep r ON r.orden_id = t.id
            GROUP BY d.fecha_local
        )
        SELECT
            d.fecha_local          AS fecha,
            COALESCE(v.total, 0.0) AS ventas,
            COALESCE(t.total, 0.0) AS taller
        FROM (SELECT fecha_local FROM dias) d
        LEFT JOIN ventas_dia  v ON v.dia = d.fecha_local
        LEFT JOIN taller_dia  t ON t.dia = d.fecha_local
        ORDER BY d.fecha_local ASC",
    )
    .bind(p.dias)
    .bind(&p.inicio_hoy)
    .fetch_all(pool)
    .await
}

async fn query_ventas_por_categoria(
    pool: &SqlitePool,
    p: &PeriodoParams,
) -> Result<Vec<VentaCategoria>, sqlx::Error> {
    let rows = sqlx::query_as::<_, VentaCategoriaRaw>(
        "SELECT
            COALESCE(c.nombre, 'Sin categoría') AS nombre,
            SUM(vd.subtotal)                    AS total,
            COUNT(vd.id)                        AS cantidad
         FROM ventas_detalles vd
         JOIN ventas v            ON v.id  = vd.venta_id
         JOIN inventario_lotes il ON il.id = vd.lote_id
         JOIN productos p         ON p.id  = il.producto_id
         LEFT JOIN categorias c   ON c.id  = p.categoria_id
         WHERE v.fecha >= ?1 AND v.fecha < ?2
         GROUP BY p.categoria_id
         ORDER BY total DESC
         LIMIT 10",
    )
    .bind(&p.inicio)
    .bind(&p.fin_hoy)
    .fetch_all(pool)
    .await?;

    let gran_total: f64 = rows.iter().map(|r| r.total).sum();
    Ok(rows
        .into_iter()
        .map(|r| VentaCategoria {
            porcentaje: if gran_total > f64::EPSILON {
                (r.total / gran_total) * 100.0
            } else {
                0.0
            },
            nombre: r.nombre,
            total: r.total,
            cantidad: r.cantidad,
        })
        .collect())
}

async fn query_stock_critico(pool: &SqlitePool) -> Result<Vec<ProductoStockCritico>, sqlx::Error> {
    #[derive(sqlx::FromRow)]
    struct StockRow {
        id: String,
        nombre: String,
        sku: Option<String>,
        categoria: Option<String>,
        marca: Option<String>,
        cantidad_actual: i64,
        stock_minimo: i64,
    }

    let rows = sqlx::query_as::<_, StockRow>(
        "SELECT
            p.id,
            p.nombre,
            p.sku,
            COALESCE(c.nombre, 'Sin categoría')            AS categoria,
            COALESCE(m.nombre, '')                         AS marca,
            CAST(COALESCE(SUM(il.cantidad), 0) AS INTEGER) AS cantidad_actual,
            CAST(COALESCE(p.stock_minimo, 2)   AS INTEGER) AS stock_minimo
         FROM productos p
         LEFT JOIN categorias c        ON c.id = p.categoria_id
         LEFT JOIN marcas m            ON m.id = p.marca_id
         LEFT JOIN inventario_lotes il ON il.producto_id = p.id
         GROUP BY p.id
         HAVING CAST(COALESCE(SUM(il.cantidad), 0) AS INTEGER)
             <= CAST(COALESCE(p.stock_minimo, 2)   AS INTEGER)
         ORDER BY
             cantidad_actual ASC,
             (CAST(COALESCE(SUM(il.cantidad), 0) AS REAL)
              / NULLIF(CAST(COALESCE(p.stock_minimo, 2) AS REAL), 0)) ASC
         LIMIT 30",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| {
            let porcentaje = if r.stock_minimo > 0 {
                (r.cantidad_actual as f64 / r.stock_minimo as f64) * 100.0
            } else {
                0.0
            };
            let nivel = if r.cantidad_actual == 0 {
                "AGOTADO"
            } else if porcentaje < 40.0 {
                "CRITICO"
            } else {
                "BAJO"
            }
            .to_string();

            ProductoStockCritico {
                id: r.id,
                nombre: r.nombre,
                sku: r.sku,
                categoria: r.categoria,
                marca: r.marca,
                cantidad_actual: r.cantidad_actual,
                stock_minimo: r.stock_minimo,
                porcentaje_stock: porcentaje,
                nivel,
            }
        })
        .collect())
}

async fn query_actividad_reciente(
    pool: &SqlitePool,
    p: &PeriodoParams,
) -> Result<Vec<ActividadReciente>, sqlx::Error> {
    sqlx::query_as::<_, ActividadReciente>(
        "SELECT id, tipo, descripcion, detalle, monto, fecha, usuario
         FROM (
             SELECT v.id, 'VENTA' AS tipo,
                 'Venta #' || substr(v.id, 1, 8) AS descripcion,
                 COALESCE(v.cliente_nombre, 'Cliente general') AS detalle,
                 v.total AS monto, v.fecha,
                 u.nombre_completo AS usuario
             FROM ventas v
             LEFT JOIN usuarios u ON u.id = v.usuario_id
             WHERE v.fecha >= datetime(?1, '-7 days')
               AND v.fecha <  ?2

             UNION ALL

             SELECT t.id, 'TALLER' AS tipo,
                 'Taller #' || substr(t.id, 1, 8) AS descripcion,
                 t.vehiculo_info || ' — ' || t.motivo_ingreso AS detalle,
                 CASE
                     WHEN t.estado IN ('ENTREGADO','ARCHIVADO') THEN
                         t.costo_mano_obra + COALESCE(
                             (SELECT SUM(td.subtotal)
                              FROM taller_detalles td
                              WHERE td.orden_id = t.id), 0.0)
                     ELSE t.costo_mano_obra
                 END AS monto,
                 t.fecha_ingreso AS fecha,
                 u.nombre_completo AS usuario
             FROM taller_ordenes t
             LEFT JOIN usuarios u ON u.id = t.creado_por
             WHERE t.fecha_ingreso >= datetime(?1, '-7 days')
               AND t.fecha_ingreso <  ?2

             UNION ALL

             SELECT k.id, 'KARDEX' AS tipo,
                 'Movimiento de stock' AS descripcion,
                 COALESCE(p.nombre, 'Producto') || ' — ' || k.tipo_movimiento AS detalle,
                 CAST(k.cantidad AS REAL) AS monto,
                 k.fecha, k.usuario
             FROM kardex k
             LEFT JOIN inventario_lotes il ON il.id = k.lote_id
             LEFT JOIN productos p         ON p.id  = il.producto_id
             WHERE k.fecha >= datetime(?1, '-7 days')
               AND k.fecha <  ?2
               AND k.tipo_movimiento = 'ENTRADA'

             UNION ALL

             SELECT cl.id, 'CLIENTE' AS tipo,
                 'Nuevo cliente registrado' AS descripcion,
                 cl.nombre_completo || ' — ' || cl.tipo_documento
                     || ' ' || cl.numero_documento AS detalle,
                 NULL AS monto,
                 cl.fecha_registro AS fecha,
                 NULL AS usuario
             FROM clientes cl
             WHERE cl.fecha_registro >= datetime(?1, '-7 days')
               AND cl.fecha_registro <  ?2
         )
         ORDER BY fecha DESC
         LIMIT 25",
    )
    .bind(&p.inicio_hoy)
    .bind(&p.fin_hoy)
    .fetch_all(pool)
    .await
}

/// Órdenes del tablero Kanban.
///
/// ARCHIVADO EXCLUIDO intencionalmente:
///   El historial completo de archivadas está en el módulo "Historial de
///   servicios de taller". Incluirlas aquí sería redundante y cargaría
///   potencialmente miles de filas innecesarias en el dashboard.
///
/// ingresos_mes: mano_obra + repuestos, ENTREGADO + ARCHIVADO, del mes actual.
async fn query_taller_resumen(
    pool: &SqlitePool,
    p: &PeriodoParams,
) -> Result<TallerResumen, sqlx::Error> {
    // FIX N+1: pre-agregar repuestos antes del JOIN con órdenes
    let ordenes = sqlx::query_as::<_, OrdenTallerResumen>(
        "WITH rep AS (
            SELECT orden_id, SUM(subtotal) AS total
            FROM taller_detalles
            GROUP BY orden_id
        )
        SELECT
            t.id,
            COALESCE(cl.nombre_completo, 'Sin cliente') AS cliente_nombre,
            t.vehiculo_info,
            t.motivo_ingreso,
            t.estado,
            t.fecha_ingreso,
            t.fecha_estimada,
            t.fecha_entrega,
            t.costo_mano_obra,
            COALESCE(r.total, 0.0) AS total_repuestos,
            u.nombre_completo      AS mecanico
         FROM taller_ordenes t
         LEFT JOIN clientes cl ON cl.id = t.cliente_id
         LEFT JOIN usuarios u  ON u.id  = t.creado_por
         LEFT JOIN rep r       ON r.orden_id = t.id
         WHERE t.estado != 'ARCHIVADO'
         ORDER BY
             CASE t.estado
                 WHEN 'PENDIENTE'  THEN 1
                 WHEN 'EN_PROCESO' THEN 2
                 WHEN 'LISTO'      THEN 3
                 WHEN 'ENTREGADO'  THEN 4
                 ELSE 5
             END,
             t.fecha_ingreso DESC",
    )
    .fetch_all(pool)
    .await?;

    let total_pendiente = ordenes.iter().filter(|o| o.estado == "PENDIENTE").count() as i64;
    let total_en_proceso = ordenes.iter().filter(|o| o.estado == "EN_PROCESO").count() as i64;
    let total_listo = ordenes.iter().filter(|o| o.estado == "LISTO").count() as i64;
    let total_entregado = ordenes.iter().filter(|o| o.estado == "ENTREGADO").count() as i64;

    // ingresos_mes con CTE para evitar N+1
    let ingresos_mes: f64 = sqlx::query_scalar(
        "WITH rep AS (
            SELECT orden_id, SUM(subtotal) AS total
            FROM taller_detalles
            GROUP BY orden_id
        )
        SELECT COALESCE(SUM(
            t.costo_mano_obra + COALESCE(r.total, 0.0)
        ), 0.0)
        FROM taller_ordenes t
        LEFT JOIN rep r ON r.orden_id = t.id
        WHERE t.fecha_entrega >= ?1
          AND t.fecha_entrega <  ?2
          AND t.estado IN ('ENTREGADO', 'ARCHIVADO')",
    )
    .bind(&p.inicio_mes)
    .bind(&p.fin_hoy)
    .fetch_one(pool)
    .await?;

    Ok(TallerResumen {
        ordenes,
        total_pendiente,
        total_en_proceso,
        total_listo,
        total_entregado,
        ingresos_mes,
    })
}

async fn query_top_productos(
    pool: &SqlitePool,
    p: &PeriodoParams,
) -> Result<Vec<TopProducto>, sqlx::Error> {
    sqlx::query_as::<_, TopProducto>(
        "SELECT
            p.nombre,
            p.sku,
            COALESCE(c.nombre, 'Sin categoría') AS categoria,
            SUM(vd.cantidad)                    AS cantidad_vendida,
            SUM(vd.subtotal)                    AS total_generado
         FROM ventas_detalles vd
         JOIN ventas v            ON v.id  = vd.venta_id
         JOIN inventario_lotes il ON il.id = vd.lote_id
         JOIN productos p         ON p.id  = il.producto_id
         LEFT JOIN categorias c   ON c.id  = p.categoria_id
         WHERE v.fecha >= ?1 AND v.fecha < ?2
         GROUP BY p.id
         ORDER BY total_generado DESC
         LIMIT 10",
    )
    .bind(&p.inicio)
    .bind(&p.fin_hoy)
    .fetch_all(pool)
    .await
}

// =============================================================================
// COMANDOS TAURI PÚBLICOS
// =============================================================================

#[tauri::command]
pub async fn get_dashboard_data(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<DashboardData, String> {
    let dias = params.dias;
    let p = pool.inner();

    let (
        kpis,
        ventas_diarias,
        por_categoria,
        stock_critico,
        actividad_reciente,
        taller,
        top_productos,
    ) = tokio::try_join!(
        query_kpis(p, &params),
        query_ventas_diarias(p, &params),
        query_ventas_por_categoria(p, &params),
        query_stock_critico(p),
        query_actividad_reciente(p, &params),
        query_taller_resumen(p, &params),
        query_top_productos(p, &params),
    )
    .map_err(|e| e.to_string())?;

    Ok(DashboardData {
        kpis,
        ventas_diarias,
        por_categoria,
        stock_critico,
        actividad_reciente,
        taller,
        top_productos,
        periodo_dias: dias,
    })
}

#[tauri::command]
pub async fn get_kpis(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<KpiPrincipal, String> {
    query_kpis(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_taller_resumen(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<TallerResumen, String> {
    query_taller_resumen(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_stock_critico(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<ProductoStockCritico>, String> {
    query_stock_critico(pool.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_actividad_reciente(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<Vec<ActividadReciente>, String> {
    query_actividad_reciente(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ventas_por_categoria(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<Vec<VentaCategoria>, String> {
    query_ventas_por_categoria(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_ventas_por_dia(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<Vec<PuntoVentaDiaria>, String> {
    query_ventas_diarias(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_top_productos(
    pool: tauri::State<'_, SqlitePool>,
    params: PeriodoParams,
) -> Result<Vec<TopProducto>, String> {
    query_top_productos(pool.inner(), &params)
        .await
        .map_err(|e| e.to_string())
}

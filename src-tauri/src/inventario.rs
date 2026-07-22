//src-tauri/src/inveantario.rs

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

// ==========================================
// 1. DTOs
// ==========================================

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct BodegaItemVista {
    pub lote_id: String,
    pub color: Option<String>,
    pub cantidad: i64,
    pub ubicacion: String,
    pub producto_nombre: String,
    pub sku: String,
    pub es_vehiculo: i64,
    pub stock_minimo: i64,
    pub categoria_nombre: Option<String>,
    pub marca_nombre: Option<String>,
    pub ultimo_ingreso: i64,
    pub stock_anterior: i64,
    pub fecha_ultima_modificacion: Option<String>,
}

#[derive(Serialize)]
pub struct PaginatedBodega {
    pub items: Vec<BodegaItemVista>,
    pub total: i64,
}

#[derive(Serialize, Deserialize)]
pub struct VarianteBodega {
    pub lote_id: String,
    pub color: Option<String>,
    pub cantidad: i64,
    pub ubicacion: String,
    pub ultimo_ingreso: i64,
    pub stock_anterior: i64,
    pub fecha_ultima_modificacion: Option<String>,
}

#[derive(Serialize)]
pub struct ProductoBodega {
    pub producto_id: String,
    pub producto_nombre: String,
    pub sku: String,
    pub es_vehiculo: i64,
    pub stock_total: i64,
    pub stock_minimo: i64,
    pub stock_critico: bool,
    pub categoria_nombre: Option<String>,
    pub marca_nombre: Option<String>,
    pub variantes: Vec<VarianteBodega>,
}

#[derive(sqlx::FromRow)]
struct ProductoBodegaRow {
    producto_id: String,
    producto_nombre: String,
    sku: String,
    es_vehiculo: i64,
    stock_total: i64,
    stock_minimo: i64,
    stock_critico: i64,
    categoria_nombre: Option<String>,
    marca_nombre: Option<String>,
    variantes_raw: String,
}

#[derive(Serialize)]
pub struct PaginatedProductosBodega {
    pub items: Vec<ProductoBodega>,
    pub total: i64,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct InventarioRecienteVista {
    pub id: String,
    pub nombre: String,
    pub sku: String,
    pub es_vehiculo: i64,
    pub categoria_nombre: Option<String>,
    pub marca_nombre: Option<String>,
    pub stock_actual: i64,
    pub stock_anterior: i64,
    pub ultimo_ingreso: i64,
    pub fecha_ultima_modificacion: String,
}

#[derive(Serialize)]
pub struct PaginatedInventarioResponse {
    pub data: Vec<InventarioRecienteVista>,
    pub total_registros: i64,
    pub pagina_actual: i64,
    pub total_paginas: i64,
}

// ==========================================
// 2. HELPER: crear índices al iniciar
// ==========================================
// Llama a esta función desde tu setup de pool (ej: main.rs o setup.rs)
// para garantizar que los índices existan antes de recibir peticiones.

// pub async fn crear_indices_rendimiento(pool: &SqlitePool) -> Result<(), sqlx::Error> {
//     // ...
//     Ok(())
// }

// ==========================================
// 3. COMANDO: REGISTRAR INGRESO
// ==========================================

#[tauri::command]
pub async fn registrar_ingreso_seguro(
    producto_id: String,
    cantidad: i32,
    usuario_id: String,
    color: Option<String>,
    ubicacion: String,
    motivo: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    if cantidad <= 0 {
        return Err("La cantidad debe ser mayor a cero.".to_string());
    }

    let color_limpio = color.as_deref().map(|c| c.trim().to_uppercase());
    let ubicacion_limpia = ubicacion.trim().to_uppercase();
    let motivo_limpio = motivo.trim().to_uppercase();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let lote_id_existente: Option<String> = if let Some(ref c) = color_limpio {
        sqlx::query_scalar(
            "SELECT id FROM inventario_lotes WHERE producto_id = ? AND color = ? LIMIT 1",
        )
        .bind(&producto_id)
        .bind(c)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
    } else {
        sqlx::query_scalar(
            "SELECT id FROM inventario_lotes WHERE producto_id = ? AND color IS NULL LIMIT 1",
        )
        .bind(&producto_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?
    };

    let lote_id = if let Some(id) = lote_id_existente {
        sqlx::query(
            "UPDATE inventario_lotes SET cantidad = cantidad + ?, ubicacion = ? WHERE id = ?",
        )
        .bind(cantidad)
        .bind(&ubicacion_limpia)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        id
    } else {
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO inventario_lotes (id, producto_id, color, cantidad, ubicacion)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&new_id)
        .bind(&producto_id)
        .bind(&color_limpio)
        .bind(cantidad)
        .bind(&ubicacion_limpia)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        new_id
    };

    let kardex_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario)
         VALUES (?, ?, 'ENTRADA', ?, ?, ?)",
    )
    .bind(&kardex_id)
    .bind(&lote_id)
    .bind(cantidad)
    .bind(&motivo_limpio)
    .bind(&usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 4. COMANDO: RECARGAR STOCK EN LOTE EXISTENTE
// ==========================================

#[tauri::command]
pub async fn agregar_stock_existente_seguro(
    lote_id: String,
    cantidad: i32,
    usuario_id: String,
    motivo: String,
    tipo_movimiento: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    if cantidad <= 0 {
        return Err("La cantidad debe ser mayor a cero.".to_string());
    }

    let motivo_limpio = motivo.trim().to_uppercase();
    let tipo = tipo_movimiento
        .as_deref()
        .unwrap_or("ENTRADA")
        .trim()
        .to_uppercase();

    let tipo_valido = matches!(tipo.as_str(), "ENTRADA" | "DEVOLUCION_TALLER");
    if !tipo_valido {
        return Err(format!("Tipo de movimiento inválido: {}", tipo));
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query("UPDATE inventario_lotes SET cantidad = cantidad + ? WHERE id = ?")
        .bind(cantidad)
        .bind(&lote_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err(
            "Error de integridad: El lote especificado no existe en la base de datos.".to_string(),
        );
    }

    let kardex_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&kardex_id)
    .bind(&lote_id)
    .bind(&tipo)
    .bind(cantidad)
    .bind(&motivo_limpio)
    .bind(&usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 5. COMANDO: INVENTARIO RECIENTE
// ==========================================

#[tauri::command]
pub async fn obtener_inventario_reciente(
    pagina: i64,
    limite: i64,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<PaginatedInventarioResponse, String> {
    let offset = ((pagina - 1) * limite).max(0);

    let total_registros: i64 = sqlx::query_scalar("SELECT COUNT(id) FROM productos")
        .fetch_one(&*pool)
        .await
        .map_err(|e| format!("Error al contar registros: {}", e))?;

    let total_paginas = ((total_registros as f64 / limite as f64).ceil() as i64).max(1);

    let query = "
        WITH StockTotal AS (
            SELECT producto_id, SUM(cantidad) as stock_actual
            FROM inventario_lotes
            GROUP BY producto_id
        ),
        UltimoKardex AS (
            SELECT
                il.producto_id,
                k.cantidad   AS ultimo_ingreso,
                k.fecha      AS fecha_movimiento,
                ROW_NUMBER() OVER (
                    PARTITION BY il.producto_id
                    ORDER BY k.fecha DESC
                ) AS rn
            FROM kardex k
            JOIN inventario_lotes il ON k.lote_id = il.id
            WHERE k.tipo_movimiento IN ('ENTRADA', 'DEVOLUCION_TALLER')
        )
        SELECT
            p.id,
            p.nombre,
            p.sku,
            p.es_vehiculo,
            c.nombre  AS categoria_nombre,
            m.nombre  AS marca_nombre,
            COALESCE(s.stock_actual, 0)                                          AS stock_actual,
            COALESCE(uk.ultimo_ingreso, 0)                                       AS ultimo_ingreso,
            -- ✅ FRAGMENTO A: MAX(0, ...)
            MAX(0, COALESCE(s.stock_actual, 0) - COALESCE(uk.ultimo_ingreso, 0)) AS stock_anterior,
            COALESCE(uk.fecha_movimiento, p.fecha_registro)                      AS fecha_ultima_modificacion
        FROM productos p
        LEFT JOIN categorias c      ON p.categoria_id = c.id
        LEFT JOIN marcas m          ON p.marca_id     = m.id
        LEFT JOIN StockTotal s      ON p.id           = s.producto_id
        LEFT JOIN UltimoKardex uk   ON p.id           = uk.producto_id AND uk.rn = 1
        ORDER BY fecha_ultima_modificacion DESC
        LIMIT ? OFFSET ?
    ";

    let data = sqlx::query_as::<_, InventarioRecienteVista>(query)
        .bind(limite)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener inventario reciente: {}", e))?;

    Ok(PaginatedInventarioResponse {
        data,
        total_registros,
        pagina_actual: pagina,
        total_paginas,
    })
}

// ==========================================
// 6. COMANDO: STOCK DE BODEGA POR LOTE
// ==========================================

#[tauri::command]
pub async fn obtener_stock_bodega(
    buscar: Option<String>,
    categoria_id: Option<String>,
    marca_id: Option<String>,
    pagina: u32,
    limite: u32,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<PaginatedBodega, String> {
    let offset = (pagina - 1) * limite;
    let search_term = buscar.unwrap_or_default();
    let cat_id = categoria_id.unwrap_or_default();
    let mar_id = marca_id.unwrap_or_default();

    let count_query = "
        SELECT COUNT(*)
        FROM inventario_lotes il
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE il.cantidad > 0
        AND (? = '' OR p.categoria_id = ?)
        AND (? = '' OR p.marca_id = ?)
        AND (
            LOWER(p.nombre) LIKE '%' || LOWER(?) || '%' OR
            LOWER(p.sku)    LIKE '%' || LOWER(?) || '%' OR
            LOWER(IFNULL(il.color, '')) LIKE '%' || LOWER(?) || '%' OR
            LOWER(IFNULL(c.nombre, '')) LIKE '%' || LOWER(?) || '%'
        )
    ";

    let total: i64 = sqlx::query_scalar(count_query)
        .bind(&cat_id)
        .bind(&cat_id)
        .bind(&mar_id)
        .bind(&mar_id)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .fetch_one(&*pool)
        .await
        .unwrap_or(0);

    let data_query = "
        WITH FiltroBase AS (
            SELECT
                il.id AS lote_id, il.color, il.cantidad, il.ubicacion,
                p.nombre AS producto_nombre, p.sku, p.es_vehiculo,
                COALESCE(p.stock_minimo, 2) AS stock_minimo,
                c.nombre AS categoria_nombre, m.nombre AS marca_nombre
            FROM inventario_lotes il
            JOIN productos p ON il.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN marcas m ON p.marca_id = m.id
            WHERE il.cantidad > 0
            AND (? = '' OR p.categoria_id = ?)
            AND (? = '' OR p.marca_id = ?)
            AND (
                LOWER(p.nombre) LIKE '%' || LOWER(?) || '%' OR
                LOWER(p.sku)    LIKE '%' || LOWER(?) || '%' OR
                LOWER(IFNULL(il.color, '')) LIKE '%' || LOWER(?) || '%' OR
                LOWER(IFNULL(c.nombre, '')) LIKE '%' || LOWER(?) || '%'
            )
        ),
        -- ✅ FRAGMENTO B: JOIN directo en lugar de IN()
        UltimaEntrada AS (
            SELECT k.lote_id, k.cantidad AS ultimo_ingreso, k.fecha AS fecha_ultima_modificacion
            FROM (
                SELECT
                    k2.lote_id,
                    k2.cantidad,
                    k2.fecha,
                    ROW_NUMBER() OVER (
                        PARTITION BY k2.lote_id
                        ORDER BY k2.fecha DESC
                    ) AS rn
                FROM kardex k2
                JOIN FiltroBase fb ON k2.lote_id = fb.lote_id
                WHERE k2.tipo_movimiento = 'ENTRADA'
            ) k WHERE rn = 1
        ),
        ResultadoFinal AS (
            SELECT
                fb.*,
                COALESCE(ue.ultimo_ingreso, 0)                       AS ultimo_ingreso,
                -- ✅ FRAGMENTO A: MAX(0, ...)
                MAX(0, fb.cantidad - COALESCE(ue.ultimo_ingreso, 0)) AS stock_anterior,
                ue.fecha_ultima_modificacion
            FROM FiltroBase fb
            LEFT JOIN UltimaEntrada ue ON fb.lote_id = ue.lote_id
        )
        SELECT *
        FROM ResultadoFinal
        ORDER BY fecha_ultima_modificacion DESC NULLS LAST, producto_nombre ASC
        LIMIT ? OFFSET ?
    ";

    let items = sqlx::query_as::<_, BodegaItemVista>(data_query)
        .bind(&cat_id)
        .bind(&cat_id)
        .bind(&mar_id)
        .bind(&mar_id)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .bind(limite as i64)
        .bind(offset as i64)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener stock: {}", e))?;

    Ok(PaginatedBodega { items, total })
}

// ==========================================
// 7. COMANDO: STOCK AGRUPADO POR PRODUCTO
// ==========================================

#[tauri::command]
pub async fn obtener_stock_bodega_agrupado(
    buscar: Option<String>,
    categoria_id: Option<String>,
    marca_id: Option<String>,
    pagina: u32,
    limite: u32,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<PaginatedProductosBodega, String> {
    let offset = (pagina - 1) * limite;
    let search_term = buscar.unwrap_or_default();
    let cat_id = categoria_id.unwrap_or_default();
    let mar_id = marca_id.unwrap_or_default();

    let count_query = "
        SELECT COUNT(DISTINCT p.id)
        FROM inventario_lotes il
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE il.cantidad > 0
        AND (? = '' OR p.categoria_id = ?)
        AND (? = '' OR p.marca_id = ?)
        AND (
            LOWER(p.nombre) LIKE '%' || LOWER(?) || '%' OR
            LOWER(p.sku)    LIKE '%' || LOWER(?) || '%' OR
            LOWER(IFNULL(c.nombre, '')) LIKE '%' || LOWER(?) || '%'
        )
    ";

    let total: i64 = sqlx::query_scalar(count_query)
        .bind(&cat_id)
        .bind(&cat_id)
        .bind(&mar_id)
        .bind(&mar_id)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .fetch_one(&*pool)
        .await
        .unwrap_or(0);

    let data_query = "
        WITH ProductosFiltrados AS (
            SELECT DISTINCT p.id AS producto_id
            FROM productos p
            JOIN inventario_lotes il ON p.id = il.producto_id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE il.cantidad > 0
            AND (? = '' OR p.categoria_id = ?)
            AND (? = '' OR p.marca_id = ?)
            AND (
                LOWER(p.nombre) LIKE '%' || LOWER(?) || '%' OR
                LOWER(p.sku)    LIKE '%' || LOWER(?) || '%' OR
                LOWER(IFNULL(c.nombre, '')) LIKE '%' || LOWER(?) || '%'
            )
            ORDER BY p.nombre ASC
            LIMIT ? OFFSET ?
        ),
        LotesFiltrados AS (
            SELECT il.id AS lote_id, il.producto_id
            FROM inventario_lotes il
            JOIN ProductosFiltrados pf ON il.producto_id = pf.producto_id
            WHERE il.cantidad > 0
        ),
        UltimaEntrada AS (
            SELECT
                k.lote_id,
                k.cantidad AS ultimo_ingreso,
                k.fecha    AS fecha_ultima_modificacion
            FROM (
                SELECT
                    k2.lote_id,
                    k2.cantidad,
                    k2.fecha,
                    ROW_NUMBER() OVER (
                        PARTITION BY k2.lote_id
                        ORDER BY k2.fecha DESC
                    ) AS rn
                FROM kardex k2
                WHERE k2.tipo_movimiento = 'ENTRADA'
                  AND k2.lote_id IN (SELECT lote_id FROM LotesFiltrados)
            ) k WHERE rn = 1
        )
        SELECT
            p.id                        AS producto_id,
            p.nombre                    AS producto_nombre,
            p.sku,
            p.es_vehiculo,
            SUM(il.cantidad)            AS stock_total,
            COALESCE(p.stock_minimo, 2) AS stock_minimo,
            CASE WHEN MIN(il.cantidad) <= COALESCE(p.stock_minimo, 2)
                 THEN 1 ELSE 0 END      AS stock_critico,
            c.nombre                    AS categoria_nombre,
            m.nombre                    AS marca_nombre,
            json_group_array(json_object(
                'lote_id',                    il.id,
                'color',                      il.color,
                'cantidad',                   il.cantidad,
                'ubicacion',                  il.ubicacion,
                'ultimo_ingreso',             COALESCE(ue.ultimo_ingreso, 0),
                -- ✅ FRAGMENTO A: MAX(0, ...)
                'stock_anterior',             MAX(0, il.cantidad - COALESCE(ue.ultimo_ingreso, 0)),
                'fecha_ultima_modificacion',  ue.fecha_ultima_modificacion
            )) AS variantes_raw
        FROM ProductosFiltrados pf
        JOIN productos p            ON p.id = pf.producto_id
        JOIN inventario_lotes il    ON il.producto_id = p.id AND il.cantidad > 0
        LEFT JOIN categorias c      ON p.categoria_id = c.id
        LEFT JOIN marcas m          ON p.marca_id = m.id
        LEFT JOIN UltimaEntrada ue  ON il.id = ue.lote_id
        GROUP BY p.id
        ORDER BY MAX(ue.fecha_ultima_modificacion) DESC NULLS LAST, p.nombre ASC
    ";

    let rows = sqlx::query_as::<_, ProductoBodegaRow>(data_query)
        .bind(&cat_id)
        .bind(&cat_id)
        .bind(&mar_id)
        .bind(&mar_id)
        .bind(&search_term)
        .bind(&search_term)
        .bind(&search_term)
        .bind(limite as i64)
        .bind(offset as i64)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener stock agrupado: {}", e))?;

    let items = rows
        .into_iter()
        .map(|row| ProductoBodega {
            producto_id: row.producto_id,
            producto_nombre: row.producto_nombre,
            sku: row.sku,
            es_vehiculo: row.es_vehiculo,
            stock_total: row.stock_total,
            stock_minimo: row.stock_minimo,
            stock_critico: row.stock_critico != 0,
            categoria_nombre: row.categoria_nombre,
            marca_nombre: row.marca_nombre,
            variantes: serde_json::from_str::<Vec<VarianteBodega>>(&row.variantes_raw)
                .unwrap_or_default(),
        })
        .collect();

    Ok(PaginatedProductosBodega { items, total })
}

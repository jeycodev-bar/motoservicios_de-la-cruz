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
// 2. COMANDO: REGISTRAR INGRESO
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

    // 1. PRE-CHECK: ¿Ya existe el lote con este color?
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

    // 2. ACTUALIZACIÓN O INSERCIÓN (Upsert)
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

    // 3. REGISTRO EN KARDEX
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
// 3. COMANDO: RECARGAR STOCK EN LOTE EXISTENTE
// ==========================================

#[tauri::command]
pub async fn agregar_stock_existente_seguro(
    lote_id: String,
    cantidad: i32,
    usuario_id: String,
    motivo: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    if cantidad <= 0 {
        return Err("La cantidad debe ser mayor a cero.".to_string());
    }

    let motivo_limpio = motivo.trim().to_uppercase();
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
// 4. COMANDO: INVENTARIO RECIENTE (sin cambios — CTE con ROW_NUMBER correcto)
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

    // CTE con ROW_NUMBER — patrón correcto y eficiente, se mantiene intacto
    let query = "
        WITH StockTotal AS (
            SELECT producto_id, SUM(cantidad) as stock_actual
            FROM inventario_lotes
            GROUP BY producto_id
        ),
        UltimoKardex AS (
            SELECT 
                il.producto_id,
                k.cantidad as ultimo_ingreso,
                k.fecha as fecha_movimiento,
                ROW_NUMBER() OVER (PARTITION BY il.producto_id ORDER BY k.fecha DESC) as rn
            FROM kardex k
            JOIN inventario_lotes il ON k.lote_id = il.id
        )
        SELECT 
            p.id,
            p.nombre,
            p.sku,
            p.es_vehiculo,
            c.nombre AS categoria_nombre,
            m.nombre AS marca_nombre,
            COALESCE(s.stock_actual, 0) AS stock_actual,
            COALESCE(uk.ultimo_ingreso, 0) AS ultimo_ingreso,
            (COALESCE(s.stock_actual, 0) - COALESCE(uk.ultimo_ingreso, 0)) AS stock_anterior,
            COALESCE(uk.fecha_movimiento, p.fecha_registro) AS fecha_ultima_modificacion
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN StockTotal s ON p.id = s.producto_id
        LEFT JOIN UltimoKardex uk ON p.id = uk.producto_id AND uk.rn = 1
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
// 5. COMANDO: STOCK DE BODEGA
//    ✅ FIX 1 — Transacción que cubre COUNT + SELECT (elimina race condition en WAL)
//    ✅ FIX 2 — stock_anterior movido al CTE (elimina N subconsultas correlacionadas)
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
    let search_term = format!("%{}%", buscar.unwrap_or_default().to_lowercase());
    let cat_id = categoria_id.unwrap_or_default();
    let mar_id = marca_id.unwrap_or_default();

    // ✅ FIX 1: Abrimos transacción de LECTURA para que COUNT y SELECT
    //    sean atómicos entre sí. En WAL mode, esto garantiza que ambas
    //    queries ven el mismo snapshot — nunca habrá "Página 3 de 5" con 4 filas.
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let count_query = "
        SELECT COUNT(*)
        FROM inventario_lotes il
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE il.cantidad > 0
        AND (? = '' OR p.categoria_id = ?)
        AND (? = '' OR p.marca_id = ?)
        AND (
            LOWER(p.nombre) LIKE ? OR
            LOWER(p.sku) LIKE ? OR
            LOWER(IFNULL(il.color, '')) LIKE ? OR
            LOWER(IFNULL(c.nombre, '')) LIKE ?
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
        .fetch_one(&mut *tx) // ← usa la transacción
        .await
        .unwrap_or(0);

    // ✅ FIX 2: stock_anterior calculado en el CTE StockAnterior (1 query total)
    //    en lugar de la subconsulta correlacionada que ejecutaba 1 query por fila.
    //    Con 100 lotes: antes = 100 queries al kardex. Ahora = 1 query total.
    let data_query = "
        WITH UltimaEntrada AS (
            -- Último movimiento ENTRADA por lote (para obtener ultimo_ingreso y su fecha)
            SELECT
                lote_id,
                cantidad AS ultimo_ingreso,
                fecha    AS fecha_ultima_modificacion,
                ROW_NUMBER() OVER (PARTITION BY lote_id ORDER BY fecha DESC) AS rn
            FROM kardex
            WHERE tipo_movimiento = 'ENTRADA'
        ),
        StockAnterior AS (
            -- ✅ Stock acumulado ANTES de la última entrada — calculado una sola vez
            -- para todos los lotes relevantes, no con una subconsulta por fila.
            SELECT
                k.lote_id,
                SUM(
                    CASE WHEN k.tipo_movimiento = 'ENTRADA'
                         THEN  k.cantidad
                         ELSE -k.cantidad
                    END
                ) AS stock_anterior
            FROM kardex k
            JOIN UltimaEntrada ue ON k.lote_id = ue.lote_id AND ue.rn = 1
            WHERE k.fecha < ue.fecha_ultima_modificacion
            GROUP BY k.lote_id
        )
        SELECT
            il.id               AS lote_id,
            il.color,
            il.cantidad,
            il.ubicacion,
            p.nombre            AS producto_nombre,
            p.sku,
            p.es_vehiculo,
            COALESCE(p.stock_minimo, 2) AS stock_minimo,
            c.nombre            AS categoria_nombre,
            m.nombre            AS marca_nombre,
            COALESCE(ue.ultimo_ingreso, 0)   AS ultimo_ingreso,
            COALESCE(sa.stock_anterior, 0)   AS stock_anterior,
            ue.fecha_ultima_modificacion
        FROM inventario_lotes il
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        LEFT JOIN UltimaEntrada ue ON il.id = ue.lote_id AND ue.rn = 1
        LEFT JOIN StockAnterior sa ON il.id = sa.lote_id   -- ← JOIN al CTE, no subconsulta
        WHERE il.cantidad > 0
        AND (? = '' OR p.categoria_id = ?)
        AND (? = '' OR p.marca_id = ?)
        AND (
            LOWER(p.nombre) LIKE ? OR
            LOWER(p.sku) LIKE ? OR
            LOWER(IFNULL(il.color, '')) LIKE ? OR
            LOWER(IFNULL(c.nombre, '')) LIKE ?
        )
        ORDER BY ue.fecha_ultima_modificacion DESC NULLS LAST, p.nombre ASC
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
        .fetch_all(&mut *tx) // ← usa la misma transacción que el COUNT
        .await
        .map_err(|e| format!("Error al obtener stock de bodega: {}", e))?;

    // Transacción de solo lectura — el commit libera el snapshot
    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(PaginatedBodega { items, total })
}

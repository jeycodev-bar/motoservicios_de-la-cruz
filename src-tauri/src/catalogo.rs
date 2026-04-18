use serde_json::{json, Value};
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};
use uuid::Uuid;

// ==========================================
// 1. STRUCT INTERNO: Snapshot del producto en BD
// ==========================================

/// Representa el estado actual de un producto leído desde la BD.
///
/// Reemplaza la tupla de 10 elementos `(Option<String>, Option<String>, String, ...)`
/// que era ilegible e imposible de mantener — `current.4` no dice nada,
/// `current.precio_venta_referencial` sí.
///
/// Si se añade un campo nuevo a `productos`, se agrega aquí y el compilador
/// señala exactamente dónde actualizar el resto del código.
#[derive(sqlx::FromRow)]
struct ProductoSnapshot {
    categoria_id: Option<String>,
    marca_id: Option<String>,
    nombre: String,
    sku: String,
    precio_compra_referencial: f64,
    precio_venta_referencial: f64,
    es_vehiculo: i32,
    stock_minimo: i32,
    cilindraje: Option<i32>,
    modelo: Option<String>,
}

// ==========================================
// 2. LECTURA OPTIMIZADA CON PAGINACIÓN Y FILTROS
// ==========================================

#[tauri::command]
pub async fn obtener_productos_paginados(
    buscar: Option<String>,
    categoria_id: Option<String>,
    marca_id: Option<String>,
    pagina: u32,
    limite: u32,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Value, String> {
    let offset = (pagina.saturating_sub(1)) * limite;

    let mut query = QueryBuilder::<'_, Sqlite>::new(
        "SELECT p.*,
                c.nombre as categoria_nombre,
                m.nombre as marca_nombre,
                COALESCE(SUM(il.cantidad), 0) as stock_actual
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         LEFT JOIN marcas m ON p.marca_id = m.id
         LEFT JOIN inventario_lotes il ON p.id = il.producto_id
         WHERE 1=1",
    );

    let mut count_query =
        QueryBuilder::<'_, Sqlite>::new("SELECT COUNT(*) FROM productos p WHERE 1=1");

    // ── Filtros dinámicos ────────────────────────────────────────────────────
    if let Some(ref b) = buscar {
        if !b.trim().is_empty() {
            let like_term = format!("%{}%", b.trim().to_uppercase());

            query.push(" AND (p.nombre LIKE ");
            query.push_bind(like_term.clone());
            query.push(" OR p.sku LIKE ");
            query.push_bind(like_term.clone());
            query.push(")");

            count_query.push(" AND (p.nombre LIKE ");
            count_query.push_bind(like_term.clone());
            count_query.push(" OR p.sku LIKE ");
            count_query.push_bind(like_term);
            count_query.push(")");
        }
    }

    if let Some(ref cat) = categoria_id {
        if !cat.trim().is_empty() {
            query.push(" AND p.categoria_id = ");
            query.push_bind(cat.clone());
            count_query.push(" AND p.categoria_id = ");
            count_query.push_bind(cat.clone());
        }
    }

    if let Some(ref mar) = marca_id {
        if !mar.trim().is_empty() {
            query.push(" AND p.marca_id = ");
            query.push_bind(mar.clone());
            count_query.push(" AND p.marca_id = ");
            count_query.push_bind(mar.clone());
        }
    }

    // GROUP BY obligatorio por el SUM() — antes del ORDER BY y paginación
    query.push(" GROUP BY p.id ORDER BY p.nombre ASC LIMIT ");
    query.push_bind(limite);
    query.push(" OFFSET ");
    query.push_bind(offset);

    // ── Ejecución ────────────────────────────────────────────────────────────
    let total_records: (i64,) = count_query
        .build_query_as()
        .fetch_one(&*pool)
        .await
        .map_err(|e| format!("Error al contar productos: {}", e))?;

    let rows = query
        .build()
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener datos de productos: {}", e))?;

    // ── Mapeo a JSON ─────────────────────────────────────────────────────────
    let productos: Vec<Value> = rows
        .iter()
        .map(|row| {
            json!({
                "id":                          row.try_get::<String, _>("id").unwrap_or_default(),
                "categoria_id":                row.try_get::<Option<String>, _>("categoria_id").unwrap_or_default(),
                "marca_id":                    row.try_get::<Option<String>, _>("marca_id").unwrap_or_default(),
                "nombre":                      row.try_get::<String, _>("nombre").unwrap_or_default(),
                "sku":                         row.try_get::<String, _>("sku").unwrap_or_default(),
                "precio_compra_referencial":   row.try_get::<f64, _>("precio_compra_referencial").unwrap_or(0.0),
                "precio_venta_referencial":    row.try_get::<f64, _>("precio_venta_referencial").unwrap_or(0.0),
                "es_vehiculo":                 row.try_get::<i32, _>("es_vehiculo").unwrap_or(0),
                "stock_minimo":                row.try_get::<i32, _>("stock_minimo").unwrap_or(0),
                "cilindraje":                  row.try_get::<Option<i32>, _>("cilindraje").unwrap_or_default(),
                "modelo":                      row.try_get::<Option<String>, _>("modelo").unwrap_or_default(),
                "categoria_nombre":            row.try_get::<Option<String>, _>("categoria_nombre").unwrap_or_default(),
                "marca_nombre":                row.try_get::<Option<String>, _>("marca_nombre").unwrap_or_default(),
                "stock_actual":                row.try_get::<i64, _>("stock_actual").unwrap_or(0),
            })
        })
        .collect();

    Ok(json!({
        "data":         productos,
        "total":        total_records.0,
        "pagina_actual": pagina,
        "limite":       limite,
    }))
}

// ==========================================
// 3. CREACIÓN CON RESOLUCIÓN DE SKU ESCALABLE (O(1) Query)
// ==========================================

// ✅ BIEN HECHO — se mantiene intacto.
// El algoritmo trae el SKU exacto + todos sus derivados (BASE-1, BASE-2) en
// una sola query y resuelve el sufijo en memoria de Rust. Sin bucle de reintentos,
// sin N queries. Elegante y eficiente para millones de registros.
#[tauri::command]
pub async fn crear_producto_seguro(
    categoria_id: Option<String>,
    marca_id: Option<String>,
    nombre: String,
    sku: String,
    precio_compra_referencial: f64,
    precio_venta_referencial: f64,
    es_vehiculo: bool,
    stock_minimo: i32,
    cilindraje: Option<i32>,
    modelo: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    let sku_limpio = sku.trim().to_uppercase();
    let nombre_limpio = nombre.trim().to_uppercase();
    let modelo_limpio = modelo.map(|m| m.trim().to_uppercase());

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Una sola query trae el SKU exacto y todos sus derivados
    let pattern = format!("{}-%", sku_limpio);
    let skus_existentes: Vec<(String,)> =
        sqlx::query_as("SELECT sku FROM productos WHERE sku = ? OR sku LIKE ?")
            .bind(&sku_limpio)
            .bind(&pattern)
            .fetch_all(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

    let mut sku_final = sku_limpio.clone();

    if !skus_existentes.is_empty() {
        let mut exact_match = false;
        let mut max_suffix = 0u32;

        for (existing_sku,) in skus_existentes {
            if existing_sku == sku_limpio {
                exact_match = true;
            } else if let Some(suffix_str) = existing_sku.strip_prefix(&format!("{}-", sku_limpio))
            {
                if let Ok(num) = suffix_str.parse::<u32>() {
                    if num > max_suffix {
                        max_suffix = num;
                    }
                }
            }
        }

        if exact_match {
            sku_final = format!("{}-{}", sku_limpio, max_suffix + 1);
        }
    }

    sqlx::query(
        "INSERT INTO productos
             (id, categoria_id, marca_id, nombre, sku,
              precio_compra_referencial, precio_venta_referencial,
              es_vehiculo, stock_minimo, cilindraje, modelo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&categoria_id)
    .bind(&marca_id)
    .bind(&nombre_limpio)
    .bind(&sku_final)
    .bind(precio_compra_referencial)
    .bind(precio_venta_referencial)
    .bind(if es_vehiculo { 1 } else { 0 })
    .bind(stock_minimo)
    .bind(&cilindraje)
    .bind(&modelo_limpio)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 4. ACTUALIZACIÓN DINÁMICA
// ==========================================

#[tauri::command]
pub async fn actualizar_producto_seguro(
    id: String,
    payload: Value,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let obj = payload.as_object().ok_or("Datos inválidos")?;

    // 1. PRE-CHECK de SKU duplicado (solo si el payload lo incluye)
    if let Some(sku_val) = obj.get("sku").and_then(|v| v.as_str()) {
        let sku_limpio = sku_val.trim().to_uppercase();
        let duplicado: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM productos WHERE sku = ? AND id != ?")
                .bind(&sku_limpio)
                .bind(&id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

        if duplicado.0 > 0 {
            return Err("SKU_DUPLICADO".to_string());
        }
    }

    // 2. Leer estado actual con ProductoSnapshot — nombres en lugar de índices
    //    ✅ Reemplaza la tupla de 10 elementos (current.0 … current.9) que era
    //    ilegible y rompía silenciosamente si se reordenaban los campos.
    let mut snap: ProductoSnapshot = sqlx::query_as(
        "SELECT categoria_id, marca_id, nombre, sku,
                precio_compra_referencial, precio_venta_referencial,
                es_vehiculo, stock_minimo, cilindraje, modelo
         FROM productos WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| "PRODUCTO_NO_ENCONTRADO".to_string())?;

    // 3. Fusión de datos (merge) — cada campo identificado por nombre
    if let Some(v) = obj.get("categoria_id") {
        snap.categoria_id = if v.is_null() {
            None
        } else {
            v.as_str().map(|s| s.to_string())
        };
    }
    if let Some(v) = obj.get("marca_id") {
        snap.marca_id = if v.is_null() {
            None
        } else {
            v.as_str().map(|s| s.to_string())
        };
    }
    if let Some(v) = obj.get("nombre").and_then(|v| v.as_str()) {
        snap.nombre = v.trim().to_uppercase();
    }
    if let Some(v) = obj.get("sku").and_then(|v| v.as_str()) {
        snap.sku = v.trim().to_uppercase();
    }
    if let Some(v) = obj
        .get("precio_compra_referencial")
        .and_then(|v| v.as_f64())
    {
        snap.precio_compra_referencial = v;
    }
    if let Some(v) = obj.get("precio_venta_referencial").and_then(|v| v.as_f64()) {
        snap.precio_venta_referencial = v;
    }
    if let Some(v) = obj.get("es_vehiculo").and_then(|v| v.as_bool()) {
        snap.es_vehiculo = if v { 1 } else { 0 };
    }
    if let Some(v) = obj.get("stock_minimo").and_then(|v| v.as_i64()) {
        snap.stock_minimo = v as i32;
    }
    if let Some(v) = obj.get("cilindraje") {
        snap.cilindraje = if v.is_null() {
            None
        } else {
            v.as_i64().map(|n| n as i32)
        };
    }
    if let Some(v) = obj.get("modelo") {
        snap.modelo = if v.is_null() {
            None
        } else {
            v.as_str().map(|s| s.trim().to_uppercase())
        };
    }

    // 4. Actualización con campos nombrados — sin ambigüedad de posición
    sqlx::query(
        "UPDATE productos SET
             categoria_id               = ?,
             marca_id                   = ?,
             nombre                     = ?,
             sku                        = ?,
             precio_compra_referencial  = ?,
             precio_venta_referencial   = ?,
             es_vehiculo                = ?,
             stock_minimo               = ?,
             cilindraje                 = ?,
             modelo                     = ?
         WHERE id = ?",
    )
    .bind(snap.categoria_id)
    .bind(snap.marca_id)
    .bind(snap.nombre)
    .bind(snap.sku)
    .bind(snap.precio_compra_referencial)
    .bind(snap.precio_venta_referencial)
    .bind(snap.es_vehiculo)
    .bind(snap.stock_minimo)
    .bind(snap.cilindraje)
    .bind(snap.modelo)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 5. ELIMINACIÓN SEGURA
// ==========================================

#[tauri::command]
pub async fn eliminar_producto_seguro(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // PRE-CHECK: no eliminar si tiene stock vinculado
    let vinculacion: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM inventario_lotes WHERE producto_id = ?")
            .bind(&id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

    if vinculacion.0 > 0 {
        return Err("VINCULACION_INVENTARIO".to_string());
    }

    let result = sqlx::query("DELETE FROM productos WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("PRODUCTO_NO_ENCONTRADO".to_string());
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// Nuevo comando añadido
#[tauri::command]
pub async fn verificar_sku_duplicado(
    sku: String,
    id_excluir: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<bool, String> {
    let sku_limpio = sku.trim().to_uppercase();

    // Usamos query_scalar porque solo nos interesa el COUNT (i64)
    let count: i64 = match id_excluir {
        Some(id) if !id.trim().is_empty() => {
            sqlx::query_scalar("SELECT COUNT(*) FROM productos WHERE sku = ? AND id != ?")
                .bind(&sku_limpio)
                .bind(id)
                .fetch_one(&*pool)
                .await
                .map_err(|e| e.to_string())?
        }
        _ => sqlx::query_scalar("SELECT COUNT(*) FROM productos WHERE sku = ?")
            .bind(&sku_limpio)
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?,
    };

    Ok(count > 0)
}

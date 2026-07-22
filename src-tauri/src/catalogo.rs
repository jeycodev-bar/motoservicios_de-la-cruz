//src-tauri/src/catalogo.rs

use serde::Serialize;
use serde_json::Value;
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
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

// 1. DTO EXCLUSIVO PARA LA RESPUESTA (Adiós al mapeo manual)
#[derive(Serialize, sqlx::FromRow)]
pub struct ProductoVistaDTO {
    pub id: String,
    pub categoria_id: Option<String>,
    pub marca_id: Option<String>,
    pub nombre: String,
    pub sku: String,
    pub precio_compra_referencial: f64,
    pub precio_venta_referencial: f64,
    pub es_vehiculo: i32,
    pub stock_minimo: i32,
    pub cilindraje: Option<i32>,
    pub modelo: Option<String>,
    pub categoria_nombre: Option<String>,
    pub marca_nombre: Option<String>,
    pub stock_actual: i64,
}

#[derive(Serialize)]
pub struct PaginatedProductosResponse {
    pub data: Vec<ProductoVistaDTO>,
    pub total: i64,
    pub pagina_actual: u32,
    pub limite: u32,
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
) -> Result<PaginatedProductosResponse, String> {
    let offset = (pagina.saturating_sub(1)) * limite;

    // 🚀 TRANSACCIÓN ACID: Previene paginación fantasma (Excelente que lo hayas mantenido)
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // --- 1. CONSTRUCTOR DEL COUNT ---
    // 🚀 MEJORA: El COUNT no necesita hacer JOIN con marcas ni categorías.
    // Como categoria_id y marca_id viven en la tabla productos, contar es rapidísimo.
    let mut count_builder: QueryBuilder<'_, Sqlite> =
        QueryBuilder::new("SELECT COUNT(p.id) FROM productos p WHERE 1=1");

    // --- 2. CONSTRUCTOR DEL SELECT PRINCIPAL ---
    let mut query_builder: QueryBuilder<'_, Sqlite> = QueryBuilder::new(
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

    // --- 3. INYECCIÓN DINÁMICA DE FILTROS (Zero-Allocation + SARGable) ---

    // Filtro: Categoría
    if let Some(cat) = &categoria_id {
        if !cat.trim().is_empty() {
            count_builder.push(" AND p.categoria_id = ");
            count_builder.push_bind(cat);

            query_builder.push(" AND p.categoria_id = ");
            query_builder.push_bind(cat);
        }
    }

    // Filtro: Marca
    if let Some(mar) = &marca_id {
        if !mar.trim().is_empty() {
            count_builder.push(" AND p.marca_id = ");
            count_builder.push_bind(mar);

            query_builder.push(" AND p.marca_id = ");
            query_builder.push_bind(mar);
        }
    }

    // Filtro: Búsqueda (Texto)
    if let Some(termino) = &buscar {
        if !termino.trim().is_empty() {
            // Delegamos la concatenación a SQLite para no gastar RAM en Rust
            count_builder.push(" AND (LOWER(p.nombre) LIKE '%' || LOWER(");
            count_builder.push_bind(termino);
            count_builder.push(") || '%' OR LOWER(p.sku) LIKE '%' || LOWER(");
            count_builder.push_bind(termino);
            count_builder.push(") || '%')");

            query_builder.push(" AND (LOWER(p.nombre) LIKE '%' || LOWER(");
            query_builder.push_bind(termino);
            query_builder.push(") || '%' OR LOWER(p.sku) LIKE '%' || LOWER(");
            query_builder.push_bind(termino);
            query_builder.push(") || '%')");
        }
    }

    // --- 4. EJECUTAR EL COUNT ---
    let total_records: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&mut *tx) // Usamos la transacción atómica
        .await
        .map_err(|e| format!("Error al contar productos: {}", e))?;

    // --- 5. FINALIZAR QUERY Y EJECUTAR SELECT ---
    // IMPORTANTE: El GROUP BY va después de los WHERE y antes del ORDER/LIMIT
    query_builder.push(" GROUP BY p.id ORDER BY p.nombre ASC LIMIT ");
    query_builder.push_bind(limite);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    let data = query_builder
        .build_query_as::<ProductoVistaDTO>() // Mapeo automático directo al DTO
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Error al obtener datos de productos: {}", e))?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(PaginatedProductosResponse {
        data,
        total: total_records,
        pagina_actual: pagina,
        limite,
    })
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

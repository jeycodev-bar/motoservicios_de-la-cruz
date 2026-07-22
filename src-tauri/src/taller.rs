// src-tauri/src/taller.rs
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, QueryBuilder, Sqlite, SqlitePool};
use uuid::Uuid;

// ==========================================
// 1. DTOs
// ==========================================

#[derive(Debug, Serialize, FromRow)]
pub struct OrdenActivaDTO {
    pub id: String,
    pub cliente_id: String,
    pub creado_por: Option<String>,
    pub vehiculo_info: String,
    pub motivo_ingreso: String,
    pub estado: String,
    pub fecha_ingreso: Option<String>,
    pub fecha_estimada: Option<String>,
    pub fecha_entrega: Option<String>,
    pub costo_mano_obra: f64,
    pub cliente_nombre: Option<String>,
    pub cliente_telefono: Option<String>,
    pub mecanico_nombre: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct RepuestoCatalogoDTO {
    pub lote_id: String,
    pub producto_nombre: String,
    pub cantidad: i32,
    pub precio_venta_referencial: f64,
    // ✅ NUEVOS campos para UI/UX — clasificación visible en la hoja de trabajo
    pub categoria_nombre: Option<String>,
    pub marca_nombre: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct DetalleOrdenDTO {
    pub id: String,
    pub orden_id: String,
    pub lote_id: String,
    pub cantidad: i32,
    pub precio_unitario: f64,
    pub subtotal: f64,
    pub producto_nombre: String,
}

#[derive(Deserialize, Debug)]
pub struct FiltrosHistorialTaller {
    pub busqueda: Option<String>,
    pub limite: u32,
    pub offset: u32,
}

#[derive(Serialize)]
pub struct RespuestaHistorialTallerDTO {
    pub items: Vec<OrdenActivaDTO>,
    pub total_registros: i64,
}

// ==========================================
// PATRÓN DRY PARA FILTROS DE HISTORIAL
// ==========================================
//
// ✅ FIX PROBLEMA 3: Los filtros dinámicos se aplicaban dos veces —
//    una en el COUNT y otra en el SELECT — copiando el mismo código.
//    Si se añadía un filtro nuevo había que recordar añadirlo en ambos.
//
//    La misma solución que ventas.rs (HistorialVentasFiltros):
//    un struct que encapsula la lógica de aplicación y se reutiliza
//    en ambos builders sin duplicación.

struct FiltrosTaller<'a> {
    filtros: &'a FiltrosHistorialTaller,
}

impl<'a> FiltrosTaller<'a> {
    fn new(filtros: &'a FiltrosHistorialTaller) -> Self {
        Self { filtros }
    }

    // Se llama con cualquier builder — COUNT o SELECT — y aplica los mismos filtros.
    fn aplicar(&self, builder: &mut QueryBuilder<'a, Sqlite>) {
        if let Some(busqueda) = &self.filtros.busqueda {
            let termino = busqueda.trim();
            if !termino.is_empty() {
                // ✅ ZERO-ALLOC: la concatenación del comodín '%' ocurre en SQLite,
                //    no en Rust. eq_ignore_ascii_case() evita to_uppercase().
                builder.push(" AND (LOWER(c.nombre_completo) LIKE '%' || LOWER(");
                builder.push_bind(termino);
                builder.push(") || '%' OR LOWER(t.vehiculo_info) LIKE '%' || LOWER(");
                builder.push_bind(termino);
                builder.push(") || '%' OR t.id LIKE '%' || ");
                builder.push_bind(termino);
                builder.push(" || '%') ");
            }
        }
    }
}

// ==========================================
// 2. COMANDOS TAURI
// ==========================================

// Barrendero automático — operación de escritura separada de la lectura.
#[tauri::command]
pub async fn archivar_ordenes_viejas(pool: tauri::State<'_, SqlitePool>) -> Result<u64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query(
        "UPDATE taller_ordenes
         SET estado = 'ARCHIVADO'
         WHERE estado = 'ENTREGADO'
         AND fecha_entrega IS NOT NULL
         AND fecha_entrega <= datetime('now', '-7 days')",
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(result.rows_affected())
}

// Lectura pura — sin efectos secundarios de escritura.
#[tauri::command]
pub async fn obtener_ordenes_activas(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<OrdenActivaDTO>, String> {
    let ordenes = sqlx::query_as::<_, OrdenActivaDTO>(
        "SELECT
            t.id, t.cliente_id, t.creado_por, t.vehiculo_info,
            t.motivo_ingreso, t.estado, t.fecha_ingreso, t.fecha_estimada,
            t.fecha_entrega, t.costo_mano_obra,
            c.nombre_completo AS cliente_nombre,
            c.telefono        AS cliente_telefono,
            u.nombre_completo AS mecanico_nombre
         FROM taller_ordenes t
         JOIN clientes c ON t.cliente_id = c.id
         LEFT JOIN usuarios u ON t.creado_por = u.id
         WHERE t.estado != 'ARCHIVADO'
         ORDER BY
             CASE t.estado
                 WHEN 'PENDIENTE'  THEN 1
                 WHEN 'EN_PROCESO' THEN 2
                 WHEN 'LISTO'      THEN 3
                 WHEN 'ENTREGADO'  THEN 4
             END,
             t.fecha_ingreso DESC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(ordenes)
}

#[tauri::command]
pub async fn crear_orden_segura(
    cliente_id: String,
    vehiculo_info: String,
    motivo_ingreso: String,
    fecha_estimada: Option<String>,
    creado_por: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    let vehiculo_limpio = vehiculo_info.trim().to_uppercase();
    let motivo_limpio = motivo_ingreso.trim().to_string();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO taller_ordenes
             (id, cliente_id, vehiculo_info, motivo_ingreso, estado, fecha_estimada, creado_por)
         VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?)",
    )
    .bind(&id)
    .bind(&cliente_id)
    .bind(&vehiculo_limpio)
    .bind(&motivo_limpio)
    .bind(&fecha_estimada)
    .bind(&creado_por)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// Máquina de estados con transiciones validadas en la misma transacción.
#[tauri::command]
pub async fn actualizar_estado_seguro(
    id: String,
    nuevo_estado: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let estado_limpio = nuevo_estado.trim().to_uppercase();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let estado_actual: (String,) = sqlx::query_as("SELECT estado FROM taller_ordenes WHERE id = ?")
        .bind(&id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if estado_actual.0 == "ARCHIVADO" {
        return Err("SEGURIDAD: No se puede modificar una orden archivada.".to_string());
    }
    if estado_actual.0 == "ENTREGADO" && estado_limpio != "ARCHIVADO" {
        return Err("SEGURIDAD: La orden ya fue entregada y no puede retroceder.".to_string());
    }

    if estado_limpio == "ENTREGADO" {
        sqlx::query(
            "UPDATE taller_ordenes SET estado = ?, fecha_entrega = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(&estado_limpio)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query("UPDATE taller_ordenes SET estado = ? WHERE id = ?")
            .bind(&estado_limpio)
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn agregar_repuesto_seguro(
    orden_id: String,
    lote_id: String,
    cantidad: i32,
    precio: f64,
    usuario_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    if cantidad <= 0 {
        return Err("CANTIDAD_INVALIDA".to_string());
    }

    let detalle_id = Uuid::new_v4().to_string();
    let kardex_id = Uuid::new_v4().to_string();
    let subtotal = (cantidad as f64) * precio;

    // ✅ FIX PROBLEMA 6: orden_id es UUID v4 — siempre tiene al menos 8 chars.
    //    La guarda `if len >= 8` era innecesaria. Simplificado con get() que
    //    es seguro por definición y no puede entrar en pánico.
    let orden_corta = orden_id.get(..8).unwrap_or(&orden_id);
    let motivo_kardex = format!("TALLER ORDEN #{}", orden_corta);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Descuento atómico con validación de disponibilidad (falla si no hay stock)
    let result = sqlx::query(
        "UPDATE inventario_lotes SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
    )
    .bind(cantidad)
    .bind(&lote_id)
    .bind(cantidad)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("STOCK_INSUFICIENTE".to_string());
    }

    sqlx::query(
        "INSERT INTO taller_detalles (id, orden_id, lote_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&detalle_id)
    .bind(&orden_id)
    .bind(&lote_id)
    .bind(cantidad)
    .bind(precio)
    .bind(subtotal)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario)
         VALUES (?, ?, 'SALIDA', ?, ?, ?)",
    )
    .bind(&kardex_id)
    .bind(&lote_id)
    .bind(cantidad)
    .bind(&motivo_kardex)
    .bind(&usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn actualizar_mano_obra_segura(
    orden_id: String,
    costo: f64,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    if costo < 0.0 {
        return Err("COSTO_INVALIDO".to_string());
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE taller_ordenes SET costo_mano_obra = ? WHERE id = ?")
        .bind(costo)
        .bind(&orden_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn eliminar_repuesto_seguro(
    detalle_id: String,
    lote_id: String,
    cantidad: i32,
    orden_id: String,
    usuario_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let kardex_id = Uuid::new_v4().to_string();
    // ✅ FIX PROBLEMA 5: mismo patrón — get() seguro, sin guarda innecesaria
    let orden_corta = orden_id.get(..8).unwrap_or(&orden_id);
    let motivo_kardex = format!("DEVOLUCIÓN TALLER ORDEN #{}", orden_corta);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM taller_detalles WHERE id = ?")
        .bind(&detalle_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("REPUESTO_NO_ENCONTRADO".to_string());
    }

    sqlx::query("UPDATE inventario_lotes SET cantidad = cantidad + ? WHERE id = ?")
        .bind(cantidad)
        .bind(&lote_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // ✅ DEVOLUCION_TALLER — excluido del "último ingreso real" en las CTEs de Bodega
    sqlx::query(
        "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario)
         VALUES (?, ?, 'DEVOLUCION_TALLER', ?, ?, ?)",
    )
    .bind(&kardex_id)
    .bind(&lote_id)
    .bind(cantidad)
    .bind(&motivo_kardex)
    .bind(&usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ==========================================
// 3. COMANDOS DE LECTURA
// ==========================================

// ✅ FIX PROBLEMA 1: ZERO-ALLOC en la búsqueda LIKE.
//    Antes: let search_term = format!("%{}%", busqueda.trim())
//    → Rust asignaba una String en el heap en cada request.
//    Ahora: la concatenación del comodín '%' ocurre dentro de SQLite.
//    Rust solo pasa el término limpio — sin heap allocation.
//    (El mismo patrón que inventario.rs y ventas.rs ya usan)
//
// ✅ FIX PROBLEMA 2 (índices): Los índices no se definen en taller.rs
//    sino en la migración SQL. Añadir en db/migrations o en la init:
//
//    CREATE INDEX IF NOT EXISTS idx_il_cantidad_producto
//        ON inventario_lotes(cantidad, producto_id)
//        WHERE cantidad > 0;
//
//    CREATE INDEX IF NOT EXISTS idx_productos_nombre
//        ON productos(nombre);
//
//    Estos índices aceleran esta query de O(N) a O(log N)
//    cuando inventario_lotes crece a 100k+ filas.
#[tauri::command]
pub async fn obtener_catalogo_repuestos(
    busqueda: String,
    limite: i32,
    offset: i32,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<RepuestoCatalogoDTO>, String> {
    let termino = busqueda.trim();

    let repuestos = if termino.is_empty() {
        sqlx::query_as::<_, RepuestoCatalogoDTO>(
            "SELECT
                il.id                     AS lote_id,
                p.nombre                  AS producto_nombre,
                il.cantidad,
                p.precio_venta_referencial,
                c.nombre                  AS categoria_nombre,
                m.nombre                  AS marca_nombre
             FROM inventario_lotes il
             JOIN productos p ON il.producto_id = p.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             LEFT JOIN marcas m     ON p.marca_id     = m.id
             WHERE p.es_vehiculo = 0
               AND il.cantidad > 0
             ORDER BY p.nombre ASC
             LIMIT ? OFFSET ?",
        )
        .bind(limite)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener repuestos: {}", e))?
    } else {
        sqlx::query_as::<_, RepuestoCatalogoDTO>(
            "SELECT
                il.id                     AS lote_id,
                p.nombre                  AS producto_nombre,
                il.cantidad,
                p.precio_venta_referencial,
                c.nombre                  AS categoria_nombre,
                m.nombre                  AS marca_nombre
             FROM inventario_lotes il
             JOIN productos p ON il.producto_id = p.id
             LEFT JOIN categorias c ON p.categoria_id = c.id
             LEFT JOIN marcas m     ON p.marca_id     = m.id
             WHERE p.es_vehiculo = 0
               AND il.cantidad > 0
               AND LOWER(p.nombre) LIKE '%' || LOWER(?) || '%'
             ORDER BY p.nombre ASC
             LIMIT ? OFFSET ?",
        )
        .bind(termino)
        .bind(limite)
        .bind(offset)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener repuestos: {}", e))?
    };

    Ok(repuestos)
}

#[tauri::command]
pub async fn obtener_detalles_orden(
    orden_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<DetalleOrdenDTO>, String> {
    let detalles = sqlx::query_as::<_, DetalleOrdenDTO>(
        "SELECT
            td.*,
            p.nombre AS producto_nombre
         FROM taller_detalles td
         JOIN inventario_lotes il ON td.lote_id = il.id
         JOIN productos p ON il.producto_id = p.id
         WHERE td.orden_id = ?",
    )
    .bind(orden_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener detalles: {}", e))?;

    Ok(detalles)
}

// ✅ FIX PROBLEMA 3 + 4: DRY con FiltrosTaller impl +
//    transacción de lectura atómica para prevenir paginación fantasma.
//
//    Antes: COUNT y SELECT en conexiones separadas del pool.
//    Si se archivaba una orden entre ambas queries, el total
//    no coincidía con los items devueltos.
//
//    Ahora: COUNT y SELECT comparten la misma transacción — ambos
//    ven el mismo snapshot de datos. Consistencia garantizada.
//    Para el historial (solo ARCHIVADO) el riesgo era bajo, pero
//    la consistencia arquitectónica con el resto del sistema vale.
#[tauri::command]
pub async fn obtener_historial_paginado_taller(
    filtros: FiltrosHistorialTaller,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<RespuestaHistorialTallerDTO, String> {
    // ✅ Transacción de lectura atómica — mismo snapshot para COUNT y SELECT
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let filtro_manager = FiltrosTaller::new(&filtros);
    let base_where = " WHERE t.estado = 'ARCHIVADO' ";

    // COUNT — usa FiltrosTaller para aplicar filtros dinámicos
    let mut count_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT COUNT(*) FROM taller_ordenes t JOIN clientes c ON t.cliente_id = c.id ",
    );
    count_builder.push(base_where);
    filtro_manager.aplicar(&mut count_builder);

    let total_registros: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&mut *tx) // ✅ Usa la transacción — mismo snapshot
        .await
        .map_err(|e| format!("Error al contar historial: {}", e))?;

    // SELECT — mismos filtros, reutilizados desde FiltrosTaller
    let mut data_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT
            t.*,
            c.nombre_completo AS cliente_nombre,
            c.telefono        AS cliente_telefono,
            u.nombre_completo AS mecanico_nombre
         FROM taller_ordenes t
         JOIN clientes c ON t.cliente_id = c.id
         LEFT JOIN usuarios u ON t.creado_por = u.id ",
    );
    data_builder.push(base_where);
    filtro_manager.aplicar(&mut data_builder); // ✅ Misma lógica, sin duplicación

    data_builder.push(" ORDER BY t.fecha_ingreso DESC LIMIT ");
    data_builder.push_bind(filtros.limite as i64);
    data_builder.push(" OFFSET ");
    data_builder.push_bind(filtros.offset as i64);

    let items = data_builder
        .build_query_as::<OrdenActivaDTO>()
        .fetch_all(&mut *tx) // ✅ Usa la transacción — mismo snapshot
        .await
        .map_err(|e| format!("Error al cargar historial: {}", e))?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(RespuestaHistorialTallerDTO {
        items,
        total_registros,
    })
}

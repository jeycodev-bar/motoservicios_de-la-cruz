use serde::{Serialize, Deserialize};
use sqlx::{FromRow, SqlitePool};
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
    // ✨ NUEVO: Añadimos el campo para el nombre del mecánico/usuario
    pub mecanico_nombre: Option<String>,
}

//NUEVOS DTOS AGREGADOS (---------------------------)
#[derive(Debug, Serialize, FromRow)]
pub struct RepuestoCatalogoDTO {
    pub lote_id: String,
    pub producto_nombre: String,
    pub cantidad: i32,
    pub precio_venta_referencial: f64,
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

// Lo que recibimos de React
#[derive(Deserialize, Debug)]
pub struct FiltrosHistorialTaller {
    pub busqueda: Option<String>,
    pub limite: u32,
    pub offset: u32,
}

// Lo que enviamos a React
#[derive(Serialize)]
pub struct RespuestaHistorialTallerDTO {
    pub items: Vec<OrdenActivaDTO>,
    pub total_registros: i64,
}

// ==========================================
// 2. COMANDOS TAURI
// ==========================================

// ✅ NUEVO COMANDO SEPARADO: El barrendero automático
//    Antes vivía dentro de obtener_ordenes_activas() — un efecto de escritura
//    oculto dentro de una función de lectura, lo que viola el principio de
//    menor sorpresa y hace imposible el testing independiente de ambas operaciones.
//
//    Ahora es un comando propio que el frontend llama explícitamente
//    (por ejemplo: al iniciar sesión, al montar el módulo de taller,
//    o desde un intervalo programado con setInterval en el layout principal).
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

    // Devolvemos cuántas filas se archivaron — útil para logging en el frontend
    Ok(result.rows_affected())
}

// ✅ LECTURA PURA: sin efectos secundarios de escritura
//    Antes ejecutaba un UPDATE antes de la SELECT dentro de la misma función.
//    Ahora es estrictamente de solo lectura — predecible, testeable, sin sorpresas.
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
                 WHEN 'PENDIENTE'   THEN 1
                 WHEN 'EN_PROCESO'  THEN 2
                 WHEN 'LISTO'       THEN 3
                 WHEN 'ENTREGADO'   THEN 4
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

// ✅ BIEN HECHO — Máquina de estados correcta, se mantiene intacta
#[tauri::command]
pub async fn actualizar_estado_seguro(
    id: String,
    nuevo_estado: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let estado_limpio = nuevo_estado.trim().to_uppercase();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Validar el estado actual ANTES de hacer nada
    let estado_actual: (String,) = sqlx::query_as("SELECT estado FROM taller_ordenes WHERE id = ?")
        .bind(&id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Máquina de estados — transiciones inválidas rechazadas dentro de la transacción
    if estado_actual.0 == "ARCHIVADO" {
        return Err(
            "SEGURIDAD: No se puede modificar una orden que ya está archivada.".to_string(),
        );
    }
    if estado_actual.0 == "ENTREGADO" && estado_limpio != "ARCHIVADO" {
        return Err(
            "SEGURIDAD: La orden ya fue entregada y no puede retroceder de estado.".to_string(),
        );
    }

    if estado_limpio == "ENTREGADO" {
        // Timestamp del servidor al entregar — práctica correcta
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
    let orden_corta = if orden_id.len() >= 8 {
        &orden_id[..8]
    } else {
        &orden_id
    };
    let motivo_kardex = format!("TALLER ORDEN #{}", orden_corta);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Descuento atómico de stock con validación de disponibilidad
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

    // 2. Registrar el detalle en la orden
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

    // 3. Registrar en Kardex
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
    let orden_corta = if orden_id.len() >= 8 {
        &orden_id[..8]
    } else {
        &orden_id
    };
    let motivo_kardex = format!("DEVOLUCIÓN TALLER ORDEN #{}", orden_corta);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Eliminar el repuesto de la orden
    let result = sqlx::query("DELETE FROM taller_detalles WHERE id = ?")
        .bind(&detalle_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("REPUESTO_NO_ENCONTRADO".to_string());
    }

    // 2. Devolver el stock al lote original
    sqlx::query("UPDATE inventario_lotes SET cantidad = cantidad + ? WHERE id = ?")
        .bind(cantidad)
        .bind(&lote_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 3. Registrar devolución en Kardex
    sqlx::query(
        "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario)
         VALUES (?, ?, 'ENTRADA', ?, ?, ?)",
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
// 3. NUEVOS COMANDOS TAURI DE LECTURA
// ==========================================
// ✅ COMANDO: Catálogo de Repuestos
#[tauri::command]
pub async fn obtener_catalogo_repuestos(
    busqueda: String,
    limite: i32,
    offset: i32,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<RepuestoCatalogoDTO>, String> {
    let search_term = format!("%{}%", busqueda.trim());
    
    let repuestos = sqlx::query_as::<_, RepuestoCatalogoDTO>(
        "SELECT
            il.id as lote_id,
            p.nombre as producto_nombre,
            il.cantidad,
            p.precio_venta_referencial
         FROM inventario_lotes il
         JOIN productos p ON il.producto_id = p.id
         WHERE p.es_vehiculo = 0
           AND il.cantidad > 0
           AND p.nombre LIKE ?
         ORDER BY p.nombre ASC
         LIMIT ? OFFSET ?"
    )
    .bind(search_term)
    .bind(limite)
    .bind(offset)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener repuestos: {}", e))?;

    Ok(repuestos)
}

// ✅ COMANDO: Detalles de Orden
#[tauri::command]
pub async fn obtener_detalles_orden(
    orden_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<DetalleOrdenDTO>, String> {
    let detalles = sqlx::query_as::<_, DetalleOrdenDTO>(
        "SELECT
            td.*,
            p.nombre as producto_nombre
         FROM taller_detalles td
         JOIN inventario_lotes il ON td.lote_id = il.id
         JOIN productos p ON il.producto_id = p.id
         WHERE td.orden_id = ?"
    )
    .bind(orden_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener detalles: {}", e))?;

    Ok(detalles)
}

// ✅ COMANDO: Historial Paginado (Usando QueryBuilder para seguridad)
#[tauri::command]
pub async fn obtener_historial_paginado_taller(
    filtros: FiltrosHistorialTaller,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<RespuestaHistorialTallerDTO, String> {
    let base_where = "WHERE t.estado = 'ARCHIVADO'";

    let mut count_builder = sqlx::QueryBuilder::new(
        "SELECT COUNT(*) FROM taller_ordenes t JOIN clientes c ON t.cliente_id = c.id "
    );
    count_builder.push(base_where);

    let mut data_builder = sqlx::QueryBuilder::new(
        "SELECT
            t.*,
            c.nombre_completo as cliente_nombre,
            c.telefono as cliente_telefono,
            u.nombre_completo as mecanico_nombre
         FROM taller_ordenes t
         JOIN clientes c ON t.cliente_id = c.id
         LEFT JOIN usuarios u ON t.creado_por = u.id "
    );
    data_builder.push(base_where);

    // Búsqueda dinámica
    if let Some(busqueda) = &filtros.busqueda {
        if !busqueda.trim().is_empty() {
            let like_term = format!("%{}%", busqueda.trim());
            
            let filter_sql = " AND (c.nombre_completo LIKE ";
            
            count_builder.push(filter_sql);
            count_builder.push_bind(like_term.clone());
            count_builder.push(" OR t.vehiculo_info LIKE ");
            count_builder.push_bind(like_term.clone());
            count_builder.push(" OR t.id LIKE ");
            count_builder.push_bind(like_term.clone());
            count_builder.push(")");

            data_builder.push(filter_sql);
            data_builder.push_bind(like_term.clone());
            data_builder.push(" OR t.vehiculo_info LIKE ");
            data_builder.push_bind(like_term.clone());
            data_builder.push(" OR t.id LIKE ");
            data_builder.push_bind(like_term);
            data_builder.push(")");
        }
    }

    // 1. Ejecutar COUNT
    let total_registros: i64 = count_builder
        .build_query_scalar()
        .fetch_one(&*pool)
        .await
        .map_err(|e| format!("Error al contar historial: {}", e))?;

    // 2. Ejecutar datos con paginación
    data_builder.push(" ORDER BY t.fecha_ingreso DESC LIMIT ");
    data_builder.push_bind(filtros.limite as i64);
    data_builder.push(" OFFSET ");
    data_builder.push_bind(filtros.offset as i64);

    let items = data_builder
        .build_query_as::<OrdenActivaDTO>()
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al cargar historial: {}", e))?;

    Ok(RespuestaHistorialTallerDTO {
        items,
        total_registros,
    })
}
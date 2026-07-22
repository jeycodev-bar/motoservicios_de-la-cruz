//src-tauri/src/vehiculos.rs

use serde::{Deserialize, Serialize};
use sqlx::{FromRow, QueryBuilder, Row, Sqlite, SqlitePool};
use uuid::Uuid;

// 1. EL STRUCT: Mapeo exacto de lo que devuelve la consulta SQL
#[derive(Serialize, Deserialize, FromRow, Debug)]
pub struct VehiculoFisicoDetalle {
    pub id: String,
    pub numero_chasis: String,
    pub numero_motor: String,
    pub estado: String,
    pub fecha_ingreso: Option<String>,
    pub color: Option<String>,
    pub producto_nombre: String,
    pub sku: String,
    pub marca_nombre: Option<String>,
}

// 📌 IMPORTANTE: En sqlx con SQLite, la función COUNT() devuelve un i64.
// Usamos i32 para la cantidad asumiendo que tu columna original es un entero normal.
#[derive(Serialize, FromRow, Debug)]
pub struct LotePendienteDTO {
    pub lote_id: String,
    pub cantidad_en_bodega: i32,
    pub color: Option<String>,
    pub producto_nombre: String,
    pub chasis_registrados: i64,
}

// Para enviar los datos y el conteo juntos al frontend
#[derive(Serialize)]
pub struct RespuestaPaginadaVehiculos {
    pub data: Vec<VehiculoFisicoDetalle>,
    pub total_registros: i64,
}

// ==========================================
// HELPER PRIVADO: Aplicar filtros UNA SOLA VEZ
// ==========================================

/// Aplica los filtros de búsqueda y estado al QueryBuilder dado.
/// Se llama tanto para el COUNT como para el SELECT — definición única.
fn aplicar_filtros_vehiculos<'args>(
    builder: &mut QueryBuilder<'args, Sqlite>,
    busqueda_formateada: &'args str,
    estado_filtro: &'args Option<String>,
) {
    // Filtro de búsqueda por chasis, motor o nombre de producto
    builder.push(" AND (v.numero_chasis LIKE ");
    builder.push_bind(busqueda_formateada);
    builder.push(" OR v.numero_motor LIKE ");
    builder.push_bind(busqueda_formateada);
    builder.push(" OR p.nombre LIKE ");
    builder.push_bind(busqueda_formateada);
    builder.push(")");

    // Filtro de estado (opcional)
    if let Some(estado) = estado_filtro {
        builder.push(" AND v.estado = ");
        builder.push_bind(estado.as_str());
    }
}

// ==========================================
// COMANDOS TAURI
// ==========================================

#[tauri::command]
pub async fn registrar_vehiculo_fisico_seguro(
    lote_id: String,
    numero_chasis: String,
    numero_motor: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let chasis_limpio = numero_chasis.trim().to_uppercase();
    let motor_limpio = numero_motor.trim().to_uppercase();
    let id = Uuid::new_v4().to_string();

    // Iniciar la transacción atómica
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. PRE-CHECK DE DUPLICADOS
    let duplicado = sqlx::query(
        "SELECT id FROM vehiculos_fisicos WHERE numero_chasis = ? OR numero_motor = ? LIMIT 1",
    )
    .bind(&chasis_limpio)
    .bind(&motor_limpio)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if duplicado.is_some() {
        return Err("CHASIS_MOTOR_DUPLICADO".to_string());
    }

    // 2. BLINDAJE DE LÍMITES (Validar espacio en el lote)
    let validacion_lote = sqlx::query(
        "SELECT 
            il.cantidad as cantidad_total,
            COUNT(v.id) as chasis_actuales
        FROM inventario_lotes il
        LEFT JOIN vehiculos_fisicos v ON il.id = v.lote_id AND v.estado != 'VENDIDO'
        WHERE il.id = ?
        GROUP BY il.id",
    )
    .bind(&lote_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(row) = validacion_lote {
        let cantidad_total: i32 = row.try_get("cantidad_total").unwrap_or(0);
        let chasis_actuales: i64 = row.try_get("chasis_actuales").unwrap_or(0);

        if chasis_actuales >= (cantidad_total as i64) {
            return Err("LOTE_LLENO".to_string());
        }
    } else {
        return Err("LOTE_NO_ENCONTRADO".to_string());
    }

    // 3. REGISTRO SEGURO
    sqlx::query(
        "INSERT INTO vehiculos_fisicos (id, lote_id, numero_chasis, numero_motor, estado) 
         VALUES (?, ?, ?, ?, 'DISPONIBLE')",
    )
    .bind(&id)
    .bind(&lote_id)
    .bind(&chasis_limpio)
    .bind(&motor_limpio)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Confirmar los cambios
    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn obtener_vehiculos_fisicos_paginados(
    pagina: u32,
    busqueda: String,
    estado: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<RespuestaPaginadaVehiculos, String> {
    let limite: u32 = 50;
    let offset = (pagina.saturating_sub(1)) * limite;

    // Preparamos los valores de filtro una sola vez
    let busqueda_formateada = format!("%{}%", busqueda.trim().to_uppercase());
    let estado_filtro: Option<String> = match estado.as_deref() {
        Some("TODOS") | Some("") | None => None,
        Some(e) => Some(e.to_string()),
    };

    // Base de JOINs compartida entre COUNT y SELECT
    let base_joins = "FROM vehiculos_fisicos v
         JOIN inventario_lotes il ON v.lote_id = il.id
         JOIN productos p ON il.producto_id = p.id
         LEFT JOIN marcas m ON p.marca_id = m.id
         WHERE 1=1";

    // ─── 1. COUNT — ✅ usa ? vía QueryBuilder, ya no $1/$2 ────────────────────
    let mut count_builder: QueryBuilder<Sqlite> =
        QueryBuilder::new(format!("SELECT COUNT(v.id) {}", base_joins));

    aplicar_filtros_vehiculos(&mut count_builder, &busqueda_formateada, &estado_filtro);

    let total_registros: i64 = count_builder
        .build()
        .fetch_one(&*pool)
        .await
        .map(|row| row.try_get::<i64, _>(0).unwrap_or(0))
        .unwrap_or(0); // Si falla el count, no rompemos la app

    // ─── 2. SELECT — ✅ mismos filtros, mismo helper, sin $N ─────────────────
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(format!(
        "SELECT
            v.id,
            v.numero_chasis,
            v.numero_motor,
            v.estado,
            v.fecha_ingreso,
            il.color,
            p.nombre as producto_nombre,
            p.sku,
            m.nombre as marca_nombre
        {}",
        base_joins
    ));

    aplicar_filtros_vehiculos(&mut query_builder, &busqueda_formateada, &estado_filtro);

    // Ordenamiento y paginación — ✅ también con push_bind(), no $3/$4
    query_builder.push(" ORDER BY v.fecha_ingreso DESC LIMIT ");
    query_builder.push_bind(limite as i64);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset as i64);

    let vehiculos = query_builder
        .build_query_as::<VehiculoFisicoDetalle>()
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener vehículos paginados: {}", e))?;

    Ok(RespuestaPaginadaVehiculos {
        data: vehiculos,
        total_registros,
    })
}

//-----------------------------------------------------
//LECTURA PURA
//-----------------------------------------------------
#[tauri::command]
pub async fn obtener_lotes_pendientes_de_chasis(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<LotePendienteDTO>, String> {
    // Ejecutamos tu misma consulta blindada
    let lotes = sqlx::query_as::<_, LotePendienteDTO>(
        "SELECT 
            il.id as lote_id,
            il.cantidad as cantidad_en_bodega,
            il.color,
            p.nombre as producto_nombre,
            COUNT(v.id) as chasis_registrados
        FROM inventario_lotes il
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN vehiculos_fisicos v ON il.id = v.lote_id AND v.estado != 'VENDIDO'
        WHERE p.es_vehiculo = 1 AND il.cantidad > 0
        GROUP BY il.id
        HAVING chasis_registrados < cantidad_en_bodega",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener lotes pendientes: {}", e))?;

    Ok(lotes)
}

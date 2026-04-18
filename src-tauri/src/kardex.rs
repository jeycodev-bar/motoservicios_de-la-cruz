use serde::{Deserialize, Serialize};
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};
use tauri::State;

// ==========================================
// 1. ESTRUCTURAS DE DATOS (DTOs)
// ==========================================

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct KardexMovimiento {
    pub id: String,
    pub tipo_movimiento: String,
    pub cantidad: i64,
    pub motivo: Option<String>,
    pub fecha: Option<String>,
    pub usuario_id: Option<String>,
    pub usuario_nombre: Option<String>,
    pub color: Option<String>,
    pub producto_nombre: String,
    pub sku: Option<String>,
    pub es_vehiculo: i64,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total_registros: i64,
    pub pagina_actual: i64,
    pub total_paginas: i64,
}

// ==========================================
// 2. PATRÓN FILTROS — struct + impl
// ==========================================

/// Agrupa todos los criterios de filtrado del kardex en una unidad cohesiva.
///
/// Ventajas sobre la función libre anterior:
/// - Los filtros viajan juntos — agregar un campo nuevo es un solo lugar.
/// - `.aplicar()` es self-documenting: `filtros.aplicar(&mut builder)`.
/// - Extensible: se puede derivar `Debug`, `Clone`, o añadir validaciones en `new()`.
/// - Consistente con el patrón Repository/FilterBuilder de Rust idiomático.
struct KardexFiltros {
    fecha_inicio: Option<String>,
    fecha_fin: Option<String>,
    termino: Option<String>,
}

impl KardexFiltros {
    /// Construye los filtros a partir de los parámetros del comando Tauri.
    fn new(
        fecha_inicio: Option<String>,
        fecha_fin: Option<String>,
        termino_busqueda: Option<String>,
    ) -> Self {
        Self {
            fecha_inicio,
            fecha_fin,
            termino: termino_busqueda,
        }
    }

    /// Aplica las cláusulas WHERE dinámicas al QueryBuilder recibido.
    ///
    /// Se llama UNA VEZ por builder (COUNT y SELECT) — definición única de la lógica.
    /// Para agregar o modificar un filtro, solo se edita AQUÍ.
    fn aplicar<'a>(&'a self, builder: &mut QueryBuilder<'a, Sqlite>) {
        if let Some(inicio) = &self.fecha_inicio {
            builder.push(" AND k.fecha >= ");
            builder.push_bind(format!("{} 00:00:00", inicio));
        }

        if let Some(fin) = &self.fecha_fin {
            builder.push(" AND k.fecha <= ");
            builder.push_bind(format!("{} 23:59:59", fin));
        }

        if let Some(termino) = &self.termino {
            if !termino.trim().is_empty() {
                let like_pattern = format!("%{}%", termino);
                builder.push(" AND (p.nombre LIKE ");
                builder.push_bind(like_pattern.clone());
                builder.push(" OR p.sku LIKE ");
                builder.push_bind(like_pattern);
                builder.push(")");
            }
        }
    }
}

// ==========================================
// 3. COMANDO TAURI: LECTURA OPTIMIZADA
// ==========================================

#[tauri::command]
pub async fn obtener_kardex_paginado(
    pool: State<'_, SqlitePool>,
    pagina: i64,
    limite: i64,
    fecha_inicio: Option<String>,
    fecha_fin: Option<String>,
    termino_busqueda: Option<String>,
) -> Result<PaginatedResponse<KardexMovimiento>, String> {
    // 1. OFFSET seguro
    let offset = ((pagina - 1) * limite).max(0);

    // 2. Construimos los filtros UNA SOLA VEZ — se reutilizan en COUNT y SELECT
    let filtros = KardexFiltros::new(fecha_inicio, fecha_fin, termino_busqueda);

    // 3. Cláusula FROM + JOINs compartida entre COUNT y SELECT
    let base_joins = "
        FROM kardex k
        JOIN inventario_lotes il ON k.lote_id = il.id
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN usuarios u ON k.usuario = u.id
        WHERE 1=1
    ";

    // ─── 4. COUNT ────────────────────────────────────────────────────────────
    let mut count_builder: QueryBuilder<Sqlite> =
        QueryBuilder::new(format!("SELECT COUNT(k.id) as total {}", base_joins));

    filtros.aplicar(&mut count_builder); // ← una llamada limpia

    let total_registros: i64 = count_builder
        .build()
        .fetch_one(&*pool)
        .await
        .map(|row| row.try_get("total").unwrap_or(0))
        .map_err(|e| format!("Error al contar registros: {}", e))?;

    // ─── 5. SELECT ───────────────────────────────────────────────────────────
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(format!(
        "SELECT
            k.id, k.tipo_movimiento, k.cantidad, k.motivo, k.fecha,
            k.usuario as usuario_id, u.nombre_completo as usuario_nombre,
            il.color, p.nombre as producto_nombre, p.sku, p.es_vehiculo
        {}",
        base_joins
    ));

    filtros.aplicar(&mut query_builder); // ← misma llamada, misma lógica

    // 6. Ordenamiento y Paginación
    query_builder.push(" ORDER BY k.fecha DESC LIMIT ");
    query_builder.push_bind(limite);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    // 7. Ejecutar y mapear
    let data = query_builder
        .build_query_as::<KardexMovimiento>()
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener datos del kardex: {}", e))?;

    // 8. Total de páginas (mínimo 1)
    let total_paginas = ((total_registros as f64 / limite as f64).ceil() as i64).max(1);

    Ok(PaginatedResponse {
        data,
        total_registros,
        pagina_actual: pagina,
        total_paginas,
    })
}

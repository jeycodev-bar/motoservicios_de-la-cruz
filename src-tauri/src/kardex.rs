//src-tauri/src/kardex.rs

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
// 2. PATRÓN FILTROS (ZERO-ALLOCATION)
// ==========================================

struct KardexFiltros {
    fecha_inicio: Option<String>,
    fecha_fin: Option<String>,
    termino: Option<String>,
}

impl KardexFiltros {
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

    fn aplicar<'a>(&'a self, builder: &mut QueryBuilder<'a, Sqlite>) {
        if let Some(inicio) = &self.fecha_inicio {
            if !inicio.trim().is_empty() {
                // El frontend envía "2026-04-17 05:00:00"
                builder.push(" AND k.fecha >= ");
                builder.push_bind(inicio);
            }
        }

        if let Some(fin) = &self.fecha_fin {
            if !fin.trim().is_empty() {
                // El frontend envía "2026-04-18 04:59:59"
                builder.push(" AND k.fecha <= ");
                builder.push_bind(fin);
            }
        }

        if let Some(termino) = &self.termino {
            if !termino.trim().is_empty() {
                // SQLite maneja los comodines % y pasamos los textos a LOWER
                builder.push(" AND (LOWER(p.nombre) LIKE '%' || LOWER(");
                builder.push_bind(termino);
                builder.push(") || '%' OR LOWER(p.sku) LIKE '%' || LOWER(");
                builder.push_bind(termino); // Reutilizamos referencia, cero copias
                builder.push(") || '%')");
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
    let offset = ((pagina - 1) * limite).max(0);

    // 🚀 MEJORA 1: Snapshot Atómico de Lectura.
    // Garantiza que el COUNT y el SELECT vean exactamente los mismos datos.
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let filtros = KardexFiltros::new(fecha_inicio, fecha_fin, termino_busqueda);

    // Fragmento estático (no usamos format! aquí)
    let base_joins = "
        FROM kardex k
        JOIN inventario_lotes il ON k.lote_id = il.id
        JOIN productos p ON il.producto_id = p.id
        LEFT JOIN usuarios u ON k.usuario = u.id
        WHERE 1=1
    ";

    // ─── 4. COUNT ────────────────────────────────────────────────────────────
    // 🚀 MEJORA 2: Uso correcto del QueryBuilder sin `format!`
    let mut count_builder: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT COUNT(k.id) as total ");
    count_builder.push(base_joins);

    filtros.aplicar(&mut count_builder);

    let total_registros: i64 = count_builder
        .build()
        .fetch_one(&mut *tx) // Usamos la transacción
        .await
        .map(|row| row.try_get("total").unwrap_or(0))
        .map_err(|e| format!("Error al contar registros: {}", e))?;

    // ─── 5. SELECT ───────────────────────────────────────────────────────────
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT 
            k.id, k.tipo_movimiento, k.cantidad, k.motivo, k.fecha, 
            k.usuario as usuario_id, u.nombre_completo as usuario_nombre, 
            il.color, p.nombre as producto_nombre, p.sku, p.es_vehiculo ",
    );
    query_builder.push(base_joins); // Se concatena limpiamente sin alojamiento extra en Heap

    filtros.aplicar(&mut query_builder);

    query_builder.push(" ORDER BY k.fecha DESC LIMIT ");
    query_builder.push_bind(limite);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    let data = query_builder
        .build_query_as::<KardexMovimiento>()
        .fetch_all(&mut *tx) // Usamos la transacción
        .await
        .map_err(|e| format!("Error al obtener datos del kardex: {}", e))?;

    // Liberamos el snapshot atómico
    tx.commit().await.map_err(|e| e.to_string())?;

    let total_paginas = ((total_registros as f64 / limite as f64).ceil() as i64).max(1);

    Ok(PaginatedResponse {
        data,
        total_registros,
        pagina_actual: pagina,
        total_paginas,
    })
}

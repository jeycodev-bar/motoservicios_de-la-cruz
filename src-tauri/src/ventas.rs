//src-tauri/src/ventas.rs

use serde::{Deserialize, Serialize};
use sqlx::{FromRow, QueryBuilder, Sqlite, SqlitePool};
use tauri::State;
use uuid::Uuid;

// ==========================================
// 1. ESTRUCTURAS DE DATOS
// ==========================================

// Definimos cómo recibimos los datos del carrito desde React (TypeScript)
#[derive(Deserialize)]
pub struct CarritoItem {
    pub lote_id: String,
    pub vehiculo_fisico_id: Option<String>,
    pub cantidad: i32,
    pub precio_unitario: f64,
    pub subtotal: f64,
}

// Estructura para el catalogo de productos en el modulo de ventas
#[derive(Serialize, sqlx::FromRow)]
pub struct ProductoCatalogo {
    pub producto_id: String,
    pub producto_nombre: String,
    pub sku: Option<String>,
    pub es_vehiculo: i32,
    pub precio_venta_referencial: f64,
    pub marca_nombre: Option<String>,
    pub categoria_nombre: Option<String>,
    pub cantidad_total: i64,
    pub variantes: String,
}

// Esta será la estructura que React enviará a Rust para el historial de ventas
#[derive(Deserialize, Debug)]
pub struct FiltrosVentas {
    pub fecha_inicio: Option<String>,
    pub fecha_fin: Option<String>,
    pub busqueda_cliente: Option<String>,
    pub usuario_id: Option<i64>,
    pub limite: u32,
    pub offset: u32,
}

// Lo que enviamos a React (El formato de tu fila actual)
#[derive(Serialize, FromRow)]
pub struct VentaHistorialDTO {
    pub id: String,
    pub cliente_nombre: String,
    pub total: f64,
    pub fecha: String,
    pub vendedor_nombre: Option<String>,
}

#[derive(Serialize, FromRow)]
pub struct ChasisDisponibleDTO {
    pub id: String,
    pub numero_chasis: String,
    pub numero_motor: Option<String>,
}

#[derive(Serialize, FromRow)]
pub struct VentaDetalleDTO {
    pub cantidad: i32,
    pub precio_unitario: f64,
    pub subtotal: f64,
    pub producto_nombre: String,
    pub color: Option<String>,
    pub numero_chasis: Option<String>,
}

// El envoltorio para soportar paginación real
#[derive(Serialize)]
pub struct RespuestaPaginadaVentas {
    pub items: Vec<VentaHistorialDTO>,
    pub total_registros: i64,
}

// ==========================================
// PATRÓN FILTROS PARA VENTAS (ZERO-ALLOCATION)
// ==========================================

struct HistorialVentasFiltros<'a> {
    filtros: &'a FiltrosVentas,
}

impl<'a> HistorialVentasFiltros<'a> {
    fn new(filtros: &'a FiltrosVentas) -> Self {
        Self { filtros }
    }

    fn aplicar(&self, builder: &mut QueryBuilder<'a, Sqlite>) {
        if let Some(inicio) = &self.filtros.fecha_inicio {
            let inicio_trim = inicio.trim();
            if !inicio_trim.is_empty() {
                // Delegamos a SQLite la gestión de la hora (si la necesitas) o lo dejamos limpio
                builder.push(" AND v.fecha >= (");
                builder.push_bind(inicio_trim);
                builder.push(" || ' 00:00:00')");
            }
        }

        if let Some(fin) = &self.filtros.fecha_fin {
            let fin_trim = fin.trim();
            if !fin_trim.is_empty() {
                builder.push(" AND v.fecha <= (");
                builder.push_bind(fin_trim);
                builder.push(" || ' 23:59:59')");
            }
        }

        if let Some(cliente) = &self.filtros.busqueda_cliente {
            let cliente_trim = cliente.trim();
            if !cliente_trim.is_empty() {
                // Búsqueda LIKE concatenada a nivel SQLite (Zero Rust Allocations)
                builder.push(" AND (LOWER(v.cliente_nombre) LIKE '%' || LOWER(");
                builder.push_bind(cliente_trim);
                builder.push(") || '%' OR LOWER(c.numero_documento) LIKE '%' || LOWER(");
                builder.push_bind(cliente_trim);
                builder.push(") || '%') ");
            }
        }

        if let Some(vendedor_id) = self.filtros.usuario_id {
            builder.push(" AND v.usuario_id = ");
            builder.push_bind(vendedor_id);
        }
    }
}

// ==========================================
// COMANDOS DE LECTURA OPTIMIZADOS
// ==========================================

#[tauri::command]
pub async fn obtener_catalogo_optimizado(
    busqueda: String,
    categoria_id: String,
    marca_id: String,
    limit: i32,
    offset: i32,
    db: State<'_, SqlitePool>,
) -> Result<Vec<ProductoCatalogo>, String> {
    let mut query: sqlx::QueryBuilder<'_, Sqlite> = sqlx::QueryBuilder::new(
        r#"
        SELECT 
            p.id as producto_id, p.nombre as producto_nombre, p.sku, 
            p.es_vehiculo, p.precio_venta_referencial,
            m.nombre as marca_nombre, c.nombre as categoria_nombre,
            SUM(il.cantidad) as cantidad_total,
            json_group_array(
                json_object(
                    'lote_id', il.id, 'color', il.color, 'cantidad', il.cantidad
                )
            ) as variantes
        FROM productos p
        JOIN inventario_lotes il ON p.id = il.producto_id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN marcas m ON p.marca_id = m.id
        WHERE il.cantidad > 0
        "#,
    );

    // 🚀 MEJORA: eq_ignore_ascii_case no asigna memoria (Adiós to_uppercase)
    let cat_trim = categoria_id.trim();
    if !cat_trim.is_empty()
        && !cat_trim.eq_ignore_ascii_case("todos")
        && !cat_trim.eq_ignore_ascii_case("all")
    {
        query.push(" AND p.categoria_id = ");
        query.push_bind(cat_trim);
    }

    let marca_trim = marca_id.trim();
    if !marca_trim.is_empty()
        && !marca_trim.eq_ignore_ascii_case("todos")
        && !marca_trim.eq_ignore_ascii_case("all")
    {
        query.push(" AND p.marca_id = ");
        query.push_bind(marca_trim);
    }

    // 🚀 MEJORA: Búsqueda LIKE concatenada en SQL (Adiós format!)
    let termino = busqueda.trim();
    if !termino.is_empty() {
        // En tu código original hacías `{}%` (Empieza por). Aquí lo respeto en SQL:
        query.push(" AND (LOWER(p.nombre) LIKE LOWER(");
        query.push_bind(termino);
        query.push(") || '%' OR LOWER(p.sku) LIKE LOWER(");
        query.push_bind(termino);
        query.push(") || '%')");
    }

    query.push(" GROUP BY p.id ORDER BY p.nombre ASC LIMIT ");
    query.push_bind(limit);
    query.push(" OFFSET ");
    query.push_bind(offset);

    let rows = query
        .build_query_as::<ProductoCatalogo>()
        .fetch_all(&*db)
        .await
        .map_err(|e| format!("Error en catálogo: {}", e))?;

    Ok(rows)
}

#[tauri::command]
pub async fn obtener_historial_ventas_paginado(
    filtros: FiltrosVentas,
    pool: State<'_, SqlitePool>,
) -> Result<RespuestaPaginadaVentas, String> {
    // 🚀 MEJORA: Transacción de Lectura Atómica (Previene la paginación fantasma)
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let base_joins = "
         FROM ventas v 
         LEFT JOIN usuarios u ON v.usuario_id = u.id 
         LEFT JOIN clientes c ON v.cliente_id = c.id 
         WHERE 1=1
    ";

    let filtro_manager = HistorialVentasFiltros::new(&filtros);

    // 1. COUNT Paginación
    let mut count_builder: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT COUNT(v.id) ");
    count_builder.push(base_joins);
    filtro_manager.aplicar(&mut count_builder); // Aplicamos lógica limpia

    let total_registros: i64 = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(&mut *tx) // Usamos la transacción tx
        .await
        .map_err(|e| format!("Error al contar ventas: {}", e))?;

    // 2. SELECT Datos
    let mut query_builder: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT v.id, v.cliente_nombre, v.total, v.fecha, u.nombre_completo as vendedor_nombre ",
    );
    query_builder.push(base_joins);
    filtro_manager.aplicar(&mut query_builder); // Reutilizamos lógica

    query_builder.push(" ORDER BY v.fecha DESC LIMIT ");
    query_builder.push_bind(filtros.limite as i64);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(filtros.offset as i64);

    let items = query_builder
        .build_query_as::<VentaHistorialDTO>()
        .fetch_all(&mut *tx) // Usamos la transacción tx
        .await
        .map_err(|e| format!("Error al obtener ventas: {}", e))?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(RespuestaPaginadaVentas {
        items,
        total_registros,
    })
}

// ✅ COMANDO: Obtener Chasis Disponibles
#[tauri::command]
pub async fn obtener_chasis_disponibles(
    lote_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<ChasisDisponibleDTO>, String> {
    let chasis = sqlx::query_as::<_, ChasisDisponibleDTO>(
        "SELECT id, numero_chasis, numero_motor 
         FROM vehiculos_fisicos 
         WHERE lote_id = ? AND estado = 'DISPONIBLE'",
    )
    .bind(lote_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener chasis disponibles: {}", e))?;

    Ok(chasis)
}

// ✅ COMANDO: Obtener Detalle de Venta
#[tauri::command]
pub async fn obtener_detalle_venta(
    venta_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<VentaDetalleDTO>, String> {
    let detalles = sqlx::query_as::<_, VentaDetalleDTO>(
        "SELECT 
            vd.cantidad, 
            vd.precio_unitario, 
            vd.subtotal, 
            p.nombre as producto_nombre, 
            il.color, 
            vf.numero_chasis
         FROM ventas_detalles vd
         JOIN inventario_lotes il ON vd.lote_id = il.id
         JOIN productos p ON il.producto_id = p.id
         LEFT JOIN vehiculos_fisicos vf ON vd.vehiculo_fisico_id = vf.id
         WHERE vd.venta_id = ?",
    )
    .bind(venta_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener el detalle de venta: {}", e))?;

    Ok(detalles)
}

// ✅ COMANDO: Obtener Venta por ID
// Usamos VentaHistorialDTO porque sus campos encajan perfectamente con lo que pides.
#[tauri::command]
pub async fn obtener_venta_por_id(
    venta_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<VentaHistorialDTO>, String> {
    let venta = sqlx::query_as::<_, VentaHistorialDTO>(
        "SELECT 
            v.id, 
            v.cliente_nombre, 
            v.total, 
            v.fecha, 
            u.nombre_completo as vendedor_nombre
         FROM ventas v
         LEFT JOIN usuarios u ON v.usuario_id = u.id
         WHERE v.id = ?",
    )
    .bind(venta_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("Error al obtener la cabecera de la venta: {}", e))?;

    Ok(venta)
}

// ==========================================
// 3. COMANDOS DE ESCRITURA (Transacciones)
// ==========================================

#[tauri::command]
pub async fn procesar_venta_segura(
    usuario_id: String,
    cliente_id: Option<String>,
    cliente_nombre: String,
    total: f64,
    carrito: Vec<CarritoItem>,
    pool: State<'_, SqlitePool>,
) -> Result<String, String> {
    // 🔥 INICIAMOS LA TRANSACCIÓN ACID
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Error al iniciar transacción: {}", e))?;

    let venta_id = Uuid::new_v4().to_string();

    // 1. Insertar Cabecera de Venta
    sqlx::query(
        "INSERT INTO ventas (id, cliente_nombre, total, fecha, cliente_id, usuario_id) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)",
    )
    .bind(&venta_id)
    .bind(&cliente_nombre)
    .bind(total)
    .bind(&cliente_id)
    .bind(&usuario_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Error al insertar cabecera de venta: {}", e))?;

    // 2. Procesar cada ítem del carrito
    for item in carrito {
        let detalle_id = Uuid::new_v4().to_string();

        // A. Insertar Detalle de Venta
        sqlx::query(
            "INSERT INTO ventas_detalles (id, venta_id, lote_id, vehiculo_fisico_id, cantidad, precio_unitario, subtotal) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&detalle_id)
        .bind(&venta_id)
        .bind(&item.lote_id)
        .bind(&item.vehiculo_fisico_id)
        .bind(item.cantidad)
        .bind(item.precio_unitario)
        .bind(item.subtotal)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error al insertar detalle: {}", e))?;

        // B. Descontar Stock del Lote (Validación estricta — falla si no hay stock)
        let result = sqlx::query(
            "UPDATE inventario_lotes SET cantidad = cantidad - ? WHERE id = ? AND cantidad >= ?",
        )
        .bind(item.cantidad)
        .bind(&item.lote_id)
        .bind(item.cantidad)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error al actualizar stock: {}", e))?;

        if result.rows_affected() == 0 {
            return Err(format!(
                "Stock insuficiente o lote no encontrado para el ID: {}",
                item.lote_id
            ));
        }

        // C. Registrar en Kardex (Auditoría de inventario)
        let kardex_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO kardex (id, lote_id, tipo_movimiento, cantidad, motivo, usuario) 
             VALUES (?, ?, 'SALIDA', ?, ?, ?)",
        )
        .bind(&kardex_id)
        .bind(&item.lote_id)
        .bind(item.cantidad)
        .bind(format!("Venta {}", venta_id))
        .bind(&usuario_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error al registrar en kardex: {}", e))?;

        // D. Si es un vehículo físico, cambiar su estado a VENDIDO
        if let Some(vehiculo_id) = item.vehiculo_fisico_id {
            sqlx::query("UPDATE vehiculos_fisicos SET estado = 'VENDIDO' WHERE id = ?")
                .bind(&vehiculo_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("Error al actualizar vehículo físico: {}", e))?;
        }
    }

    // SI TODO SALIÓ BIEN, CONSOLIDAMOS LOS DATOS
    tx.commit()
        .await
        .map_err(|e| format!("Error al hacer commit: {}", e))?;

    Ok(venta_id)
}

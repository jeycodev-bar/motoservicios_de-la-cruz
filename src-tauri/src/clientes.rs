use serde::{Deserialize, Serialize};
use sqlx::{FromRow, QueryBuilder, Sqlite, SqlitePool};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ClienteRegistroDTO {
    pub id: String,
    pub tipo_documento: String,
    pub numero_documento: String,
    pub nombre_completo: String,
    pub telefono: Option<String>,
    pub email: Option<String>,
    pub direccion: Option<String>,
    pub fecha_registro: Option<String>,
}

#[derive(Serialize)]
pub struct RespuestaPaginadaClientes {
    pub data: Vec<ClienteRegistroDTO>,
    pub total: i64,
}

#[tauri::command]
pub async fn guardar_cliente_seguro(
    tipo_documento: String,
    numero_documento: String,
    nombre_completo: String,
    telefono: Option<String>,
    email: Option<String>,
    direccion: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<String, String> {
    // ✨ CAMBIO 1: Ahora devolvemos Result<String, String>
    let id = Uuid::new_v4().to_string();
    let doc_limpio = numero_documento.trim().to_string();
    let nombre_limpio = nombre_completo.trim().to_uppercase();

    // Filtramos strings vacíos para que guarden un NULL real en base de datos
    let tel_limpio = telefono
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let email_limpio = email
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let dir_limpia = direccion
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. PRE-CHECK: ¿Existe el documento?
    let existe: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM clientes WHERE numero_documento = ?")
        .bind(&doc_limpio)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if existe.0 > 0 {
        return Err("DOCUMENTO_DUPLICADO".to_string());
    }

    // 2. INSERCIÓN
    sqlx::query(
        "INSERT INTO clientes (id, tipo_documento, numero_documento, nombre_completo, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&tipo_documento)
    .bind(&doc_limpio)
    .bind(&nombre_limpio)
    .bind(&tel_limpio)
    .bind(&email_limpio)
    .bind(&dir_limpia)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id) // ✨ CAMBIO 2: Devolvemos el ID generado
}

#[tauri::command]
pub async fn actualizar_cliente_seguro(
    id: String,
    tipo_documento: String,
    numero_documento: String,
    nombre_completo: String,
    telefono: Option<String>,
    email: Option<String>,
    direccion: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let doc_limpio = numero_documento.trim().to_string();
    let nombre_limpio = nombre_completo.trim().to_uppercase();

    let tel_limpio = telefono
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let email_limpio = email
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let dir_limpia = direccion
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. PRE-CHECK: Que no choque con OTRO cliente
    let existe: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM clientes WHERE numero_documento = ? AND id != ?")
            .bind(&doc_limpio)
            .bind(&id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

    if existe.0 > 0 {
        return Err("DOCUMENTO_DUPLICADO".to_string());
    }

    // 2. ACTUALIZACIÓN
    let result = sqlx::query(
        "UPDATE clientes SET tipo_documento = ?, numero_documento = ?, nombre_completo = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?"
    )
    .bind(&tipo_documento)
    .bind(&doc_limpio)
    .bind(&nombre_limpio)
    .bind(&tel_limpio)
    .bind(&email_limpio)
    .bind(&dir_limpia)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Qué pasa si el cliente ya no existe
    if result.rows_affected() == 0 {
        return Err("CLIENTE_NO_ENCONTRADO".to_string());
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ─── NUEVOS COMANDOS DE LECTURA ───────────────────────────────────────────────
#[tauri::command]
pub async fn buscar_cliente_por_documento(
    numero_documento: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Option<ClienteRegistroDTO>, String> {
    let doc_limpio = numero_documento.trim();

    let cliente = sqlx::query_as::<_, ClienteRegistroDTO>(
        "SELECT * FROM clientes WHERE numero_documento = ? LIMIT 1",
    )
    .bind(doc_limpio)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| format!("Error al buscar cliente por documento: {}", e))?;

    Ok(cliente)
}

#[tauri::command]
pub async fn obtener_clientes_paginados(
    pagina: u32,
    limite: u32,
    termino_busqueda: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<RespuestaPaginadaClientes, String> {
    let offset = (pagina.saturating_sub(1)) * limite;
    let termino = termino_busqueda.trim();

    let mut count_builder: QueryBuilder<Sqlite> =
        QueryBuilder::new("SELECT COUNT(*) FROM clientes");
    let mut data_builder: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM clientes");

    // Construcción condicional del WHERE
    if !termino.is_empty() {
        let like_term = format!("%{}%", termino.to_uppercase());
        let where_clause = " WHERE nombre_completo LIKE ";

        count_builder.push(where_clause);
        count_builder.push_bind(like_term.clone());
        count_builder.push(" OR numero_documento LIKE ");
        count_builder.push_bind(like_term.clone());

        data_builder.push(where_clause);
        data_builder.push_bind(like_term.clone());
        data_builder.push(" OR numero_documento LIKE ");
        data_builder.push_bind(like_term);
    }

    // 1. Obtener el total
    let total: (i64,) = count_builder
        .build_query_as()
        .fetch_one(&*pool)
        .await
        .unwrap_or((0,));

    // 2. Obtener los datos con orden, límite y offset
    data_builder.push(" ORDER BY fecha_registro DESC LIMIT ");
    data_builder.push_bind(limite as i64);
    data_builder.push(" OFFSET ");
    data_builder.push_bind(offset as i64);

    let data = data_builder
        .build_query_as::<ClienteRegistroDTO>()
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error al obtener clientes paginados: {}", e))?;

    Ok(RespuestaPaginadaClientes {
        data,
        total: total.0,
    })
}

#[tauri::command]
pub async fn buscar_clientes_rapido(
    texto: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<ClienteRegistroDTO>, String> {
    let termino = texto.trim();

    // Comportamiento 1: Vacío -> Traer los últimos 5
    if termino.is_empty() {
        let clientes = sqlx::query_as::<_, ClienteRegistroDTO>(
            "SELECT * FROM clientes ORDER BY fecha_registro DESC LIMIT 5",
        )
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Error en búsqueda rápida vacía: {}", e))?;

        return Ok(clientes);
    }

    // Comportamiento 2: 1 solo caracter -> Retornar vacío (Evitar saturar BD)
    if termino.len() == 1 {
        return Ok(vec![]);
    }

    // Comportamiento 3: Búsqueda real
    let like_term = format!("%{}%", termino.to_uppercase());
    let clientes = sqlx::query_as::<_, ClienteRegistroDTO>(
        "SELECT * FROM clientes WHERE numero_documento LIKE ? OR nombre_completo LIKE ? ORDER BY nombre_completo ASC LIMIT 10"
    )
    .bind(&like_term)
    .bind(&like_term)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error en búsqueda rápida por término: {}", e))?;

    Ok(clientes)
}

//src-tauri/src/mestros.rs

use serde::Serialize;
use sqlx::{FromRow, SqlitePool};
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
pub struct CategoriaDTO {
    pub id: String,
    pub nombre: String,
    pub descripcion: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct MarcaDTO {
    pub id: String,
    pub nombre: String,
    pub categoria_id: String,
}

#[tauri::command]
pub async fn crear_categoria_segura(
    nombre: String,
    descripcion: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let nombre_limpio = nombre.trim().to_uppercase();
    let desc_limpia = descripcion.trim().to_string();
    let id = Uuid::new_v4().to_string();

    // 🛡️ PRE-CHECK: ¿Ya existe? (Lectura directa del pool, sin bloquear transacciones)
    let existe: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM categorias WHERE nombre = ?")
        .bind(&nombre_limpio)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if existe.0 > 0 {
        return Err("CATEGORIA_DUPLICADA".to_string());
    }

    // 💾 Transacción iniciada SOLO para la mutación
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO categorias (id, nombre, descripcion) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&nombre_limpio)
        .bind(&desc_limpia)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn eliminar_categoria_segura(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    // ✨ VALIDACIÓN 1: Marcas asociadas (Lectura directa del pool)
    let marcas_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM marcas WHERE categoria_id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if marcas_count.0 > 0 {
        return Err("VINCULACION_MARCAS".to_string());
    }

    // ✨ VALIDACIÓN 2: Productos asociados (Lectura directa del pool)
    let prod_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM productos WHERE categoria_id = ?")
            .bind(&id)
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    if prod_count.0 > 0 {
        return Err("VINCULACION_PRODUCTOS".to_string());
    }

    // 💾 Transacción iniciada SOLO para la mutación
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM categorias WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("CATEGORIA_NO_ENCONTRADA".to_string());
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn crear_marca_segura(
    nombre: String,
    categoria_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let nombre_limpio = nombre.trim().to_uppercase();
    let id = Uuid::new_v4().to_string();

    // 🛡️ PRE-CHECK: Marca duplicada en la misma categoría (Lectura directa del pool)
    let existe: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM marcas WHERE nombre = ? AND categoria_id = ?")
            .bind(&nombre_limpio)
            .bind(&categoria_id)
            .fetch_one(&*pool)
            .await
            .map_err(|e| e.to_string())?;

    if existe.0 > 0 {
        return Err("MARCA_DUPLICADA".to_string());
    }

    // 💾 Transacción iniciada SOLO para la mutación
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO marcas (id, nombre, categoria_id) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&nombre_limpio)
        .bind(&categoria_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn eliminar_marca_segura(
    id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    // ✨ VALIDACIÓN: Productos asociados (Lectura directa del pool)
    let prod_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM productos WHERE marca_id = ?")
        .bind(&id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if prod_count.0 > 0 {
        return Err("VINCULACION_PRODUCTOS".to_string());
    }

    // 💾 Transacción iniciada SOLO para la mutación
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    let result = sqlx::query("DELETE FROM marcas WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        return Err("MARCA_NO_ENCONTRADA".to_string());
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

//---------------------------------|
// LECTURA PURA
//---------------------------------|
// ✅ COMANDO: Obtener todas las categorías
#[tauri::command]
pub async fn obtener_categorias(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<CategoriaDTO>, String> {
    let categorias = sqlx::query_as::<_, CategoriaDTO>(
        "SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener categorías: {}", e))?;

    Ok(categorias)
}

// ✅ COMANDO: Obtener todas las marcas
#[tauri::command]
pub async fn obtener_marcas(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<MarcaDTO>, String> {
    let marcas = sqlx::query_as::<_, MarcaDTO>(
        "SELECT id, nombre, categoria_id FROM marcas ORDER BY nombre ASC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener marcas: {}", e))?;

    Ok(marcas)
}

// ✅ COMANDO: Obtener marcas filtradas por categoría
#[tauri::command]
pub async fn obtener_marcas_por_categoria(
    categoria_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<MarcaDTO>, String> {
    let marcas = sqlx::query_as::<_, MarcaDTO>(
        "SELECT id, nombre, categoria_id FROM marcas WHERE categoria_id = ? ORDER BY nombre ASC",
    )
    .bind(categoria_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al obtener marcas por categoría: {}", e))?;

    Ok(marcas)
}

// //src-tauri/src/db.rs
// use sqlx::{
//     sqlite::{SqliteConnectOptions, SqliteJournalMode},
//     SqlitePool,
// };
// use std::path::Path;
// use std::str::FromStr;
// use std::time::Duration;
// use uuid::Uuid;

// // Nota: Asegúrate de importar tu función de auth o la librería de hashing que uses.
// use crate::auth::hashear_password; // Función ficticia, usa la que tengas implementada

// pub async fn inicializar_base_datos(app_dir: &Path) -> Result<SqlitePool, String> {
//     // NUEVO: Crear la carpeta de datos si no existe para solucionar el error de que la carpeta que contiene  a la db no este presente
//     std::fs::create_dir_all(app_dir)
//         .map_err(|e| format!("No se pudo crear el directorio de datos: {}", e))?;

//     let db_path = app_dir.join("sistema_taller_v1.db");
//     let db_url = format!("sqlite:{}", db_path.display());

//     // 1. Configuración de alta concurrencia
//     let options = SqliteConnectOptions::from_str(&db_url)
//         .map_err(|e| format!("URL de BD inválida: {}", e))?
//         .create_if_missing(true)
//         .journal_mode(SqliteJournalMode::Wal)
//         .busy_timeout(Duration::from_secs(5));

//     // 2. Iniciar el Pool
//     let pool = SqlitePool::connect_with(options)
//         .await
//         .map_err(|e| format!("No se pudo conectar a la BD: {}", e))?;

//     // 3. Ejecutar Migraciones
//     sqlx::migrate!("./migrations")
//         .run(&pool)
//         .await
//         .map_err(|e| format!("Fallo al ejecutar las migraciones: {}", e))?;

//     // 4. ✨ SEEDER DE SEGURIDAD (Recuperado de TS a Rust) ✨
//     ejecutar_seeder_inicial(&pool).await?;

//     Ok(pool)
// }

// /// Función privada para garantizar que siempre exista un Super Admin
// async fn ejecutar_seeder_inicial(pool: &SqlitePool) -> Result<(), String> {
//     let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM usuarios")
//         .fetch_one(pool)
//         .await
//         .map_err(|e| format!("Error al contar usuarios: {}", e))?;

//     if count.0 == 0 {
//         let admin_id = Uuid::new_v4().to_string();

//         // Hashea la contraseña nativamente en Rust
//         let hashed_password = hashear_password("inefable".to_string()).await?;

//         // Transacción para asegurar consistencia entre usuario y log
//         let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

//         sqlx::query(
//             "INSERT INTO usuarios (id, dni, nombre_completo, username, password, rol)
//              VALUES (?, ?, ?, ?, ?, ?)",
//         )
//         .bind(&admin_id)
//         .bind("00000000")
//         .bind("Administrador Principal")
//         .bind("admin")
//         .bind(&hashed_password)
//         .bind("ADMINISTRADOR")
//         .execute(&mut *tx)
//         .await
//         .map_err(|e| e.to_string())?;

//         let log_id = Uuid::new_v4().to_string();
//         sqlx::query(
//             "INSERT INTO auditoria_logs (id, usuario_id, accion, entidad, entidad_id, detalles)
//              VALUES (?, ?, ?, ?, ?, ?)",
//         )
//         .bind(&log_id)
//         .bind("SISTEMA")
//         .bind("CREACION_INICIAL")
//         .bind("USUARIOS")
//         .bind(&admin_id)
//         .bind("{\"nota\": \"Creación automática del superadmin\"}")
//         .execute(&mut *tx)
//         .await
//         .map_err(|e| e.to_string())?;

//         tx.commit().await.map_err(|e| e.to_string())?;
//         println!("🔒 Bóveda y Auditoría inicializadas con éxito desde Rust.");
//     }

//     Ok(())
// }

use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode},
    SqlitePool,
};
use std::path::Path;
use std::time::Duration;
use uuid::Uuid;

use crate::auth::hashear_password;

pub async fn inicializar_base_datos(app_dir: &Path) -> Result<SqlitePool, String> {
    // 1. Crear directorio seguro si no existe
    std::fs::create_dir_all(app_dir)
        .map_err(|e| format!("No se pudo crear el directorio de datos: {}", e))?;

    let db_path = app_dir.join("sistema_taller_v1.db");

    // 2. Usar `.filename(&db_path)` directamente evita fallos de parseo de URL en Windows (acentos/espacios)
    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(Duration::from_secs(10)); // Aumentado a 10s por si OneDrive ralentiza el disco

    // 3. Iniciar el Pool
    let pool = SqlitePool::connect_with(options)
        .await
        .map_err(|e| format!("No se pudo conectar a la BD ({:?}): {}", db_path, e))?;

    // 4. Ejecutar Migraciones
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| format!("Fallo al ejecutar las migraciones: {}", e))?;

    // 5. Seeder inicial
    ejecutar_seeder_inicial(&pool).await?;

    Ok(pool)
}

/// Función privada para garantizar que siempre exista un Super Admin
async fn ejecutar_seeder_inicial(pool: &SqlitePool) -> Result<(), String> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM usuarios")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error al contar usuarios: {}", e))?;

    if count.0 == 0 {
        let admin_id = Uuid::new_v4().to_string();
        let hashed_password = hashear_password("inefable".to_string()).await?;

        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

        sqlx::query(
            "INSERT INTO usuarios (id, dni, nombre_completo, username, password, rol) 
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&admin_id)
        .bind("00000000")
        .bind("Administrador Principal")
        .bind("admin")
        .bind(&hashed_password)
        .bind("ADMINISTRADOR")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let log_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO auditoria_logs (id, usuario_id, accion, entidad, entidad_id, detalles) 
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&log_id)
        .bind("SISTEMA")
        .bind("CREACION_INICIAL")
        .bind("USUARIOS")
        .bind(&admin_id)
        .bind("{\"nota\": \"Creación automática del superadmin\"}")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;
        println!("🔒 Bóveda y Auditoría inicializadas con éxito desde Rust.");
    }

    Ok(())
}

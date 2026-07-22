//src-tauri/src/auth.rs
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::Serialize;
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

// ==========================================
// 1. DTOs
// ==========================================

/// Sesión limpia que se entrega al frontend tras el login.
/// El campo `password` (hash bcrypt) NUNCA forma parte de este struct.
#[derive(Serialize)]
pub struct UsuarioSesion {
    pub id: String,
    pub nombre_completo: String,
    pub username: String,
    pub rol: String,
    pub dni: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub struct UsuarioVista {
    pub id: String,
    pub dni: String,
    pub nombre_completo: String,
    pub username: String,
    pub rol: String,
    pub estado: i32,
}

// ==========================================
// 2. HELPERS PRIVADOS
// ==========================================

// 🛡️ GUARDIA DE AUTORIZACIÓN — verifica dentro de la misma transacción (anti-TOCTOU)
async fn verificar_autorizacion(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    usuario_id: &str,
    roles_permitidos: &[&str],
) -> Result<(), String> {
    let usuario: Option<(String, i32)> =
        sqlx::query_as("SELECT rol, estado FROM usuarios WHERE id = ?")
            .bind(usuario_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

    match usuario {
        Some((rol, estado)) => {
            if estado == 0 {
                return Err("ACCESO_DENEGADO_USUARIO_INACTIVO".to_string());
            }
            if !roles_permitidos.contains(&rol.as_str()) {
                return Err("ACCESO_DENEGADO_PERMISOS_INSUFICIENTES".to_string());
            }
        }
        None => return Err("USUARIO_NO_ENCONTRADO".to_string()),
    }
    Ok(())
}

// 🕵️ HELPER: Registrar auditoría atómica dentro de la transacción activa
async fn registrar_auditoria_interna(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    usuario_id: &str,
    accion: &str,
    entidad: &str,
    entidad_id: Option<&str>,
    detalles: serde_json::Value,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    let detalles_str = detalles.to_string();

    sqlx::query(
        "INSERT INTO auditoria_logs (id, usuario_id, accion, entidad, entidad_id, detalles)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(usuario_id)
    .bind(accion)
    .bind(entidad)
    .bind(entidad_id)
    .bind(detalles_str)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ==========================================
// 3. COMANDOS TAURI
// ==========================================

// ✅ Login end-to-end en Rust — el hash bcrypt NUNCA viaja al frontend.
//    Antes: auth.ts hacía SELECT con password, traía el hash a TypeScript,
//    y luego llamaba invoke('verificar_password', { hash: user.password }).
//    Ahora: un único comando recibe username + password_plana y devuelve
//    UsuarioSesion sin ningún campo sensible.
#[tauri::command]
pub async fn login_seguro(
    username: String,
    password_plana: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<UsuarioSesion, String> {
    let usuario: Option<(String, String, String, String, String, String, i32)> = sqlx::query_as(
        "SELECT id, dni, nombre_completo, username, rol, password, estado
             FROM usuarios WHERE username = ? LIMIT 1",
    )
    .bind(&username)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    match usuario {
        None => Err("CREDENCIALES_INVALIDAS".to_string()),
        Some((id, dni, nombre, uname, rol, hash_bd, estado)) => {
            if estado == 0 {
                return Err("USUARIO_INACTIVO".to_string());
            }

            // ✅ bcrypt::verify en thread pool — NO bloquea el runtime de Tokio
            let es_valida = tokio::task::spawn_blocking(move || {
                verify(&password_plana, &hash_bd).unwrap_or(false)
            })
            .await
            .map_err(|e| e.to_string())?;

            if !es_valida {
                return Err("CREDENCIALES_INVALIDAS".to_string());
            }

            // ✅ Solo la sesión limpia sale de Rust — el hash queda aquí
            Ok(UsuarioSesion {
                id,
                nombre_completo: nombre,
                username: uname,
                rol,
                dni,
            })
        }
    }
}

// ✅ COMANDO: Crear Usuario Seguro
#[tauri::command]
pub async fn crear_usuario_seguro(
    dni: String,
    nombre_completo: String,
    username: String,
    password: String,
    rol: String,
    admin_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let dni_limpio = dni.trim().to_string();
    let nombre_limpio = nombre_completo.trim().to_uppercase();
    let username_limpio = username.trim().to_string();
    let rol_limpio = rol.trim().to_uppercase();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Solo ADMINISTRADOR puede crear usuarios
    verificar_autorizacion(&mut tx, &admin_id, &["ADMINISTRADOR"]).await?;

    // 2. PRE-CHECK: ¿Ya existe el DNI o Username?
    let existe: Option<(String,)> =
        sqlx::query_as("SELECT id FROM usuarios WHERE username = ? OR dni = ? LIMIT 1")
            .bind(&username_limpio)
            .bind(&dni_limpio)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

    if existe.is_some() {
        return Err("USUARIO_O_DNI_EXISTENTE".to_string());
    }

    // ✅ bcrypt::hash en thread pool — no bloquea Tokio
    let hashed_password = tokio::task::spawn_blocking(move || {
        hash(&password, DEFAULT_COST).map_err(|e| format!("Error encriptando contraseña: {}", e))
    })
    .await
    .map_err(|e| e.to_string())??;

    // 3. Crear el usuario
    let nuevo_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO usuarios (id, dni, nombre_completo, username, password, rol, estado)
         VALUES (?, ?, ?, ?, ?, ?, 1)",
    )
    .bind(&nuevo_id)
    .bind(&dni_limpio)
    .bind(&nombre_limpio)
    .bind(&username_limpio)
    .bind(&hashed_password)
    .bind(&rol_limpio)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // 4. Registrar en Auditoría
    registrar_auditoria_interna(
        &mut tx,
        &admin_id,
        "CREAR_USUARIO",
        "USUARIOS",
        Some(&nuevo_id),
        json!({
            "dni": dni_limpio,
            "nombre_completo": nombre_limpio,
            "username": username_limpio,
            "rol": rol_limpio
        }),
    )
    .await?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ✅ COMANDO: Actualizar Usuario Seguro
//    FIX IMPORTANTE: VENDEDOR y MECANICO solo pueden editar su propio perfil
//    (id == admin_id) y no pueden cambiar su propio rol.
//    Antes: cualquier rol listado podía editar cualquier usuario — un VENDEDOR
//    podía modificar datos de otro usuario o escalar privilegios cambiando su rol.
#[tauri::command]
pub async fn actualizar_usuario_seguro(
    id: String,
    dni: String,
    nombre_completo: String,
    username: String,
    rol: String,
    admin_id: String,
    password_actual: Option<String>,
    nueva_password: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let dni_limpio = dni.trim().to_string();
    let nombre_limpio = nombre_completo.trim().to_uppercase();
    let username_limpio = username.trim().to_string();
    let rol_limpio = rol.trim().to_uppercase();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Verificar que el actor tiene un rol válido en el sistema
    verificar_autorizacion(
        &mut tx,
        &admin_id,
        &["ADMINISTRADOR", "VENDEDOR", "MECANICO"],
    )
    .await?;

    // ✅ FIX: Recuperar el rol real del actor para aplicar restricciones
    let (rol_actor,): (String,) = sqlx::query_as("SELECT rol FROM usuarios WHERE id = ?")
        .bind(&admin_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let es_admin = rol_actor.as_str() == "ADMINISTRADOR";

    // ✅ FIX: No-admins solo pueden editar su propio perfil
    if !es_admin && id != admin_id {
        return Err("ACCESO_DENEGADO: Solo puedes editar tu propio perfil.".to_string());
    }

    // ✅ FIX: No-admins no pueden cambiar su propio rol (escalada de privilegios)
    if !es_admin {
        let (rol_actual,): (String,) = sqlx::query_as("SELECT rol FROM usuarios WHERE id = ?")
            .bind(&id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        if rol_limpio != rol_actual {
            return Err("ACCESO_DENEGADO: No tienes permisos para cambiar el rol.".to_string());
        }
    }

    // 2. PRE-CHECK colisiones de username/dni
    let existe: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM usuarios WHERE (username = ? OR dni = ?) AND id != ? LIMIT 1",
    )
    .bind(&username_limpio)
    .bind(&dni_limpio)
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if existe.is_some() {
        return Err("USUARIO_O_DNI_EXISTENTE".to_string());
    }

    // 3. Lógica de cambio de contraseña
    let mut hash_para_actualizar: Option<String> = None;

    if let Some(nueva_pass) = nueva_password {
        if let Some(pass_actual) = password_actual {
            let hash_bd: Option<(String,)> =
                sqlx::query_as("SELECT password FROM usuarios WHERE id = ?")
                    .bind(&id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;

            match hash_bd {
                Some((hash_guardado,)) => {
                    // ✅ verify en thread pool — no bloquea Tokio
                    let es_valida = tokio::task::spawn_blocking(move || {
                        verify(&pass_actual, &hash_guardado).unwrap_or(false)
                    })
                    .await
                    .map_err(|e| e.to_string())?;

                    if !es_valida {
                        return Err("PASSWORD_ACTUAL_INCORRECTA".to_string());
                    }
                }
                None => return Err("USUARIO_NO_ENCONTRADO".to_string()),
            }

            // ✅ hash en thread pool — no bloquea Tokio
            let nuevo_hash = tokio::task::spawn_blocking(move || {
                hash(&nueva_pass, DEFAULT_COST).map_err(|e| e.to_string())
            })
            .await
            .map_err(|e| e.to_string())??;

            hash_para_actualizar = Some(nuevo_hash);
        } else {
            return Err("PASSWORD_ACTUAL_REQUERIDA".to_string());
        }
    }

    // 4. Actualizar (con o sin password)
    if let Some(pwd) = hash_para_actualizar {
        sqlx::query(
            "UPDATE usuarios SET dni = ?, nombre_completo = ?, username = ?, rol = ?, password = ? WHERE id = ?",
        )
        .bind(&dni_limpio)
        .bind(&nombre_limpio)
        .bind(&username_limpio)
        .bind(&rol_limpio)
        .bind(&pwd)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(
            "UPDATE usuarios SET dni = ?, nombre_completo = ?, username = ?, rol = ? WHERE id = ?",
        )
        .bind(&dni_limpio)
        .bind(&nombre_limpio)
        .bind(&username_limpio)
        .bind(&rol_limpio)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // 5. Auditoría
    registrar_auditoria_interna(
        &mut tx,
        &admin_id,
        "EDITAR_USUARIO",
        "USUARIOS",
        Some(&id),
        json!({
            "dni": dni_limpio,
            "nombre_completo": nombre_limpio,
            "username": username_limpio,
            "rol": rol_limpio
        }),
    )
    .await?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ✅ COMANDO: Cambiar Estado de Usuario — solo ADMINISTRADOR
#[tauri::command]
pub async fn cambiar_estado_usuario_seguro(
    id: String,
    nuevo_estado: i32,
    admin_id: String,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    verificar_autorizacion(&mut tx, &admin_id, &["ADMINISTRADOR"]).await?;

    sqlx::query("UPDATE usuarios SET estado = ? WHERE id = ?")
        .bind(nuevo_estado)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let accion = if nuevo_estado == 1 {
        "ACTIVAR_USUARIO"
    } else {
        "DESACTIVAR_USUARIO"
    };

    registrar_auditoria_interna(
        &mut tx,
        &admin_id,
        accion,
        "USUARIOS",
        Some(&id),
        json!({ "estado": nuevo_estado }),
    )
    .await?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ✅ COMANDO: Modo Sudo Admin — verifica contraseña del admin antes de editar cualquier usuario
#[tauri::command]
pub async fn actualizar_usuario_por_admin(
    id: String,
    dni: String,
    nombre_completo: String,
    username: String,
    rol: String,
    admin_id: String,
    admin_password_sudo: String,
    nueva_password: Option<String>,
    pool: tauri::State<'_, SqlitePool>,
) -> Result<(), String> {
    let dni_limpio = dni.trim().to_string();
    let nombre_limpio = nombre_completo.trim().to_uppercase();
    let username_limpio = username.trim().to_string();
    let rol_limpio = rol.trim().to_uppercase();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Solo admins
    verificar_autorizacion(&mut tx, &admin_id, &["ADMINISTRADOR"]).await?;

    // 2. Validar contraseña sudo del admin
    let admin_hash: Option<(String,)> =
        sqlx::query_as("SELECT password FROM usuarios WHERE id = ?")
            .bind(&admin_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

    match admin_hash {
        Some((hash_guardado,)) => {
            // ✅ verify en thread pool — no bloquea Tokio
            let es_valida = tokio::task::spawn_blocking(move || {
                verify(&admin_password_sudo, &hash_guardado).unwrap_or(false)
            })
            .await
            .map_err(|e| e.to_string())?;

            if !es_valida {
                return Err("PASSWORD_ADMIN_INCORRECTA".to_string());
            }
        }
        None => return Err("ADMIN_NO_ENCONTRADO".to_string()),
    }

    // 3. PRE-CHECK colisiones
    let existe: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM usuarios WHERE (username = ? OR dni = ?) AND id != ? LIMIT 1",
    )
    .bind(&username_limpio)
    .bind(&dni_limpio)
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if existe.is_some() {
        return Err("USUARIO_O_DNI_EXISTENTE".to_string());
    }

    // ✅ hash en thread pool — no bloquea Tokio
    let hashed_pwd: Option<String> = match nueva_password {
        Some(pwd) => {
            let h = tokio::task::spawn_blocking(move || {
                hash(&pwd, DEFAULT_COST).map_err(|e| e.to_string())
            })
            .await
            .map_err(|e| e.to_string())??;
            Some(h)
        }
        None => None,
    };

    // 4. Actualizar usuario
    if let Some(pwd_encriptada) = &hashed_pwd {
        sqlx::query(
            "UPDATE usuarios SET dni = ?, nombre_completo = ?, username = ?, rol = ?, password = ? WHERE id = ?",
        )
        .bind(&dni_limpio)
        .bind(&nombre_limpio)
        .bind(&username_limpio)
        .bind(&rol_limpio)
        .bind(pwd_encriptada)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(
            "UPDATE usuarios SET dni = ?, nombre_completo = ?, username = ?, rol = ? WHERE id = ?",
        )
        .bind(&dni_limpio)
        .bind(&nombre_limpio)
        .bind(&username_limpio)
        .bind(&rol_limpio)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    // 5. Auditoría
    registrar_auditoria_interna(
        &mut tx,
        &admin_id,
        "ACTUALIZAR_USUARIO_SUDO",
        "USUARIOS",
        Some(&id),
        json!({
            "dni": dni_limpio,
            "username": username_limpio,
            "rol": rol_limpio,
            "cambio_password": hashed_pwd.is_some()
        }),
    )
    .await?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// ✅ COMANDO AYUDANTE: Hashear contraseña — async + spawn_blocking, no bloquea Tokio
#[tauri::command]
pub async fn hashear_password(password: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || hash(&password, DEFAULT_COST).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

// ✅ COMANDO AYUDANTE: Verificar contraseña — async + spawn_blocking, no bloquea Tokio
#[tauri::command]
pub async fn verificar_password(
    password_plana: String,
    hash_guardado: String,
) -> Result<bool, String> {
    tokio::task::spawn_blocking(
        move || Ok(verify(&password_plana, &hash_guardado).unwrap_or(false)),
    )
    .await
    .map_err(|e| e.to_string())?
}

//Nuevo
#[tauri::command]
pub async fn obtener_usuarios_seguro(
    pool: tauri::State<'_, SqlitePool>,
) -> Result<Vec<UsuarioVista>, String> {
    let usuarios = sqlx::query_as::<_, UsuarioVista>(
        "SELECT id, dni, nombre_completo, username, rol, estado 
         FROM usuarios 
         ORDER BY fecha_creacion DESC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Error al consultar usuarios: {}", e))?;

    Ok(usuarios)
}

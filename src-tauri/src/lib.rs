// use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
// use std::str::FromStr;
// use tauri::Manager;

// // Enlazamos nuestros módulos (Arquitectura limpia, cada dominio en su lugar)
// mod auth;
// mod catalogo;
// mod clientes;
// mod inventario;
// mod maestros;
// mod taller;
// mod vehiculos;
// mod ventas;

// mod kardex;

// // Comando de prueba básico
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hola, {}! Bienvenido al sistema Moto Rezzio.", name)
// }

// // --- CONFIGURACIÓN DEL RUNTIME ---
// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         // Registramos los plugins necesarios
//         .plugin(tauri_plugin_sql::Builder::default().build())
//         .plugin(tauri_plugin_opener::init())
//         // 🚀 CONFIGURACIÓN DEL BACKEND ROBUSTO (Conexión sqlx)
//         .setup(|app| {
//             let handle = app.handle().clone();

//             // 1. Obtenemos la ruta exacta de la base de datos que usa Tauri
//             let app_dir = handle
//                 .path()
//                 .app_data_dir()
//                 .expect("No se pudo obtener el directorio de la app");

//             // SOLUCIÓN CEREBRO DIVIDIDO: Ahora Rust apunta EXACTAMENTE al mismo archivo que db.ts
//             let db_path = app_dir.join("sistema_taller_v1.db");
//             let db_url = format!("sqlite:{}", db_path.display());

//             // 2. Configuramos la conexión con las reglas de alta concurrencia
//             let options = SqliteConnectOptions::from_str(&db_url)
//                 .expect("URL de BD inválida")
//                 .create_if_missing(true)
//                 .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal) // Previene Database Locks
//                 .busy_timeout(std::time::Duration::from_secs(5));

//             // 3. Iniciamos el Pool asíncrono y lo guardamos en el estado global de la app (nuevo, para aplicar la migración de indices)
//             tauri::async_runtime::block_on(async {
//                 let pool = SqlitePool::connect_with(options)
//                     .await
//                     .expect("No se pudo conectar a la base de datos desde Rust");

//                 // ✨ ¡LA MAGIA DE LAS MIGRACIONES AQUÍ! ✨
//                 // Esto lee la carpeta "migrations", incrusta los SQL en el binario,
//                 // y los ejecuta automáticamente si la BD no los tiene.
//                 sqlx::migrate!("./migrations")
//                     .run(&pool)
//                     .await
//                     .expect("Fallo al ejecutar las migraciones de la base de datos");

//                 // Compartimos la piscina de conexiones con toda la app
//                 app.manage(pool);
//             });

//             Ok(())
//         })
//         // Registramos todos nuestros comandos (SIN DUPLICADOS)
//         .invoke_handler(tauri::generate_handler![
//             greet,
//             ventas::procesar_venta_segura,
//             vehiculos::registrar_vehiculo_fisico_seguro,
//             vehiculos::obtener_vehiculos_fisicos_paginados,
//             taller::crear_orden_segura,
//             taller::actualizar_estado_seguro,
//             taller::agregar_repuesto_seguro,
//             taller::actualizar_mano_obra_segura,
//             taller::eliminar_repuesto_seguro,
//             taller::obtener_ordenes_activas,
//             taller::archivar_ordenes_viejas,
//             maestros::crear_categoria_segura,
//             maestros::eliminar_categoria_segura,
//             maestros::crear_marca_segura,
//             maestros::eliminar_marca_segura,
//             inventario::registrar_ingreso_seguro,
//             inventario::obtener_inventario_reciente,
//             inventario::obtener_stock_bodega,
//             inventario::agregar_stock_existente_seguro,
//             catalogo::crear_producto_seguro,
//             catalogo::actualizar_producto_seguro,
//             catalogo::eliminar_producto_seguro,
//             catalogo::obtener_productos_paginados,
//             catalogo::verificar_sku_duplicado,
//             clientes::guardar_cliente_seguro,
//             clientes::actualizar_cliente_seguro,
//             // Dominio Auth (Todo delegado correctamente a auth.rs)
//             auth::login_seguro,
//             auth::crear_usuario_seguro,
//             auth::actualizar_usuario_seguro,
//             auth::cambiar_estado_usuario_seguro,
//             auth::actualizar_usuario_por_admin, // Asegúrate de que este exista en auth.rs si lo vas a usar
//             auth::hashear_password,
//             auth::verificar_password,
//             kardex::obtener_kardex_paginado,
//             ventas::obtener_catalogo_optimizado,
//             ventas::obtener_historial_ventas_paginado,
//         ])
//         .run(tauri::generate_context!())
//         .expect("Error al ejecutar la aplicación Tauri.");
// }

use tauri::Manager;

// --- MÓDULOS DEL SISTEMA ---
// Arquitectura modular: Infraestructura
mod db;

// Arquitectura modular: Dominios
mod auth;
mod catalogo;
mod clientes;
mod inventario;
mod kardex;
mod maestros;
mod taller;
mod vehiculos;
mod ventas;

// Comando de prueba básico
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hola, {}! Bienvenido al sistema Moto Rezzio.", name)
}

// --- CONFIGURACIÓN DEL RUNTIME ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Registramos los plugins estrictamente necesarios
        .plugin(tauri_plugin_opener::init())
        // 🚀 INICIALIZACIÓN DEL BACKEND
        .setup(|app| {
            let handle = app.handle().clone();

            let app_dir = handle
                .path()
                .app_data_dir()
                .expect("CRÍTICO: No se pudo obtener el directorio de datos de la app");

            // Bloqueamos el hilo de Tauri solo lo necesario para levantar la persistencia
            tauri::async_runtime::block_on(async {
                let pool = db::inicializar_base_datos(&app_dir).await.expect(
                    "Fallo crítico durante la inicialización o migración de la base de datos",
                );

                // Inyectamos el pool de DB en el estado global para los handlers
                app.manage(pool);
            });

            Ok(())
        })
        // --- REGISTRO DE ENDPOINTS (COMANDOS) ---
        .invoke_handler(tauri::generate_handler![
            greet,
            // Ventas
            ventas::procesar_venta_segura,
            ventas::obtener_catalogo_optimizado,
            ventas::obtener_historial_ventas_paginado,
            ventas::obtener_chasis_disponibles,
            ventas::obtener_detalle_venta,
            ventas::obtener_venta_por_id,
            // Vehículos
            vehiculos::registrar_vehiculo_fisico_seguro,
            vehiculos::obtener_vehiculos_fisicos_paginados,
            vehiculos::obtener_lotes_pendientes_de_chasis,
            // Taller
            taller::crear_orden_segura,
            taller::actualizar_estado_seguro,
            taller::agregar_repuesto_seguro,
            taller::actualizar_mano_obra_segura,
            taller::eliminar_repuesto_seguro,
            taller::obtener_ordenes_activas,
            taller::archivar_ordenes_viejas,
            taller::obtener_catalogo_repuestos,        // ✨ NUEVO
            taller::obtener_detalles_orden,            // ✨ NUEVO
            taller::obtener_historial_paginado_taller, // ✨ NUEVO
            // Maestros
            maestros::crear_categoria_segura,
            maestros::eliminar_categoria_segura,
            maestros::crear_marca_segura,
            maestros::eliminar_marca_segura,
            maestros::obtener_categorias,           // ✨ NUEVO
            maestros::obtener_marcas,               // ✨ NUEVO
            maestros::obtener_marcas_por_categoria, // ✨ NUEVO
            // Inventario
            inventario::registrar_ingreso_seguro,
            inventario::obtener_inventario_reciente,
            inventario::obtener_stock_bodega,
            inventario::agregar_stock_existente_seguro,
            // Catálogo
            catalogo::crear_producto_seguro,
            catalogo::actualizar_producto_seguro,
            catalogo::eliminar_producto_seguro,
            catalogo::obtener_productos_paginados,
            catalogo::verificar_sku_duplicado, // ✨ Nuevo comando integrado con éxito
            // Clientes
            clientes::guardar_cliente_seguro,
            clientes::actualizar_cliente_seguro,
            clientes::buscar_cliente_por_documento, // ✨ NUEVO
            clientes::obtener_clientes_paginados,   // ✨ NUEVO
            clientes::buscar_clientes_rapido,        // ✨ NUEVO
            // Auth
            auth::login_seguro,
            auth::crear_usuario_seguro,
            auth::actualizar_usuario_seguro,
            auth::cambiar_estado_usuario_seguro,
            auth::actualizar_usuario_por_admin,
            auth::hashear_password,
            auth::verificar_password,
            auth::obtener_usuarios_seguro,
            // Kardex
            kardex::obtener_kardex_paginado,
        ])
        .run(tauri::generate_context!())
        .expect("Error irrecuperable al ejecutar el motor de la aplicación Tauri");
}

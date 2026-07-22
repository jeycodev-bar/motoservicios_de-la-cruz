//src-tauri/src/lib.rs

use tauri::Manager;

// --- MÓDULOS DEL SISTEMA ---
// Arquitectura modular: Infraestructura
mod db;

// Arquitectura modular: Dominios
mod auth;
mod catalogo;
mod clientes;
mod dashboard;
mod inventario;
mod kardex;
mod maestros;
mod taller;
mod vehiculos;
mod ventas;

// Comando de prueba básico
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hola, {}! Bienvenido al sistema Moto Rezzio.", name)
// }
#[tauri::command]
fn greet(name: &str) -> Result<String, String> {
    Ok(format!(
        "Hola, {}! Bienvenido al sistema Moto Rezzio.",
        name
    ))
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
            inventario::obtener_stock_bodega_agrupado, // ✨ NUEVO
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
            clientes::buscar_clientes_rapido,       // ✨ NUEVO
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
            //dashboard
            dashboard::get_dashboard_data,
            dashboard::get_kpis,
            dashboard::get_taller_resumen,
            dashboard::get_stock_critico,
            dashboard::get_actividad_reciente,
            dashboard::get_ventas_por_categoria,
            dashboard::get_ventas_por_dia,
            dashboard::get_top_productos,
        ])
        .run(tauri::generate_context!())
        .expect("Error irrecuperable al ejecutar el motor de la aplicación Tauri");
}

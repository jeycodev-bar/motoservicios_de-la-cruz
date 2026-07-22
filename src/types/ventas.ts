/**
 * ventas.ts — Tipos específicos del módulo de ventas (UI y lógica de carrito).
 *
 * REGLA: Este archivo NO redefine Categoria, Marca ni Cliente.
 * Importa las entidades canónicas de database.ts y solo añade
 * lo que es exclusivo del flujo de ventas (carrito, chasis, resultado).
 *
 * MIGRACIÓN: Las interfaces duplicadas de ventas.types.ts quedan aquí
 * con sus nombres correctos. El archivo src/interfaces/ventas.types.ts
 * puede eliminarse o reducirse a re-exportar desde aquí.
 */

import type { Cliente } from './database';
// import type { ProductoCatalogo } from './api';

// Re-exportamos lo que el módulo de ventas necesita de otros archivos,
// para que los componentes importen desde un solo lugar.
export type { Categoria, Marca } from './database';
export type { ProductoCatalogo, VentaHistorialDTO, RespuestaPaginadaVentas } from './api';

// ==========================================
// CATÁLOGO (vista del vendedor)
// ==========================================

/**
 * Ítem del carrito de ventas.
 * Antes llamado IItemCarrito en ventas.types.ts.
 */
export interface ItemCarrito {
    lote_id: string;
    producto_nombre: string;
    sku?: string;
    /** Cantidad que el cliente lleva */
    cantidad: number;
    /** Límite de stock disponible — para validar en UI antes de llamar a Rust */
    stock_maximo: number;
    precio: number;
    es_vehiculo: number;
    /** ID del vehiculo_fisico si es moto — null para repuestos */
    vehiculo_id: string | null;
    /** Número de chasis seleccionado para mostrar en ticket */
    chasis_str: string | null;
    color?: string;
}

// ==========================================
// VEHÍCULOS / CHASIS
// ==========================================

/**
 * Chasis disponible para selección en el modal de ventas.
 * Antes llamado IChasis en ventas.types.ts.
 */
export interface ChasisDisponible {
    id: string;
    numero_chasis: string;
    numero_motor: string;
}

// ==========================================
// CLIENTES (subconjunto para búsqueda rápida)
// ==========================================

/**
 * Proyección de Cliente para el buscador de ventas.
 * Antes llamado ICliente en ventas.types.ts — ahora tipado via Pick
 * para garantizar consistencia con la entidad canónica.
 */
export type ClienteVenta = Pick<
    Cliente,
    'id' | 'nombre_completo' | 'tipo_documento' | 'numero_documento'
>;

// ==========================================
// RESULTADO DE VENTA
// ==========================================

/**
 * Confirmación de venta exitosa devuelta por procesar_venta_segura.
 * Antes llamado IVentaExitosa en ventas.types.ts.
 */
export interface VentaExitosa {
    /** ID de la venta generado por Rust (UUID) */
    id: string;
    cliente: string;
    total: number;
}

// ==========================================
// FILTROS
// ==========================================

/**
 * Parámetros de búsqueda para obtener_historial_ventas_paginado.
 * Refleja FiltrosVentas en ventas.rs.
 */
export interface FiltrosVentas {
    fecha_inicio?: string;
    fecha_fin?: string;
    busqueda_cliente?: string;
    usuario_id?: number;
    limite: number;
    offset: number;
}
/**
 * api.ts — Contratos IPC entre Rust (Tauri commands) y TypeScript.
 *
 * REGLA: Cada tipo aquí refleja exactamente un struct de Rust serializado.
 * Si un campo cambia en Rust, este archivo es el ÚNICO lugar a actualizar en TS.
 * Ningún componente debería definir inline la forma de una respuesta de invoke().
 */

import type {
    Categoria,
    Marca,
    Cliente,
    ProductoVista,
    InventarioLote,
    EstadoVehiculo,
    TipoMovimiento
} from './database';

// ==========================================
// AUTENTICACIÓN
// ==========================================

/**
 * Refleja `UsuarioSesion` en auth.rs.
 * El campo `password` (hash bcrypt) nunca forma parte de este tipo —
 * nunca viaja al frontend.
 */
export interface UsuarioSesion {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
    dni: string;
}

// ==========================================
// RESPUESTAS PAGINADAS GENÉRICAS
// ==========================================

/**
 * Refleja `PaginatedResponse<T>` en kardex.rs e inventario.rs.
 * Usado por: obtener_kardex_paginado, obtener_inventario_reciente.
 */
export interface PaginatedResponse<T> {
    data: T[];
    total_registros: number;
    pagina_actual: number;
    total_paginas: number;
}

/**
 * Refleja `PaginacionResult` en catalogo.rs (obtener_productos_paginados).
 * Nótese la diferencia de forma con PaginatedResponse — son dos structs distintos en Rust.
 */
export interface PaginacionResult<T> {
    data: T[];
    total: number;
    pagina_actual: number;
    limite: number;
}

// ==========================================
// VENTAS
// ==========================================

/**
 * Refleja `VentaHistorialDTO` en ventas.rs.
 */
export interface VentaHistorialDTO {
    id: string;
    cliente_nombre: string;
    total: number;
    fecha: string;
    vendedor_nombre: string | null;
}

/**
 * Refleja `RespuestaPaginadaVentas` en ventas.rs.
 */
export interface RespuestaPaginadaVentas {
    items: VentaHistorialDTO[];
    total_registros: number;
}

/**
 * Refleja `ProductoCatalogo` en ventas.rs (catálogo del módulo de ventas).
 * Distinto de ProductoVista — incluye lote_id, variantes y cantidad de stock por lote.
 */
export interface ProductoCatalogo {
    producto_id: string;
    producto_nombre: string;
    sku: string | null;
    es_vehiculo: number;
    precio_venta_referencial: number;
    marca_nombre: string | null;
    categoria_nombre: string | null;
    cantidad_total: number;
    /** JSON serializado: array de { lote_id, color, cantidad } */
    variantes: string;
}

/**
 * Payload para procesar_venta_segura en ventas.rs.
 */
export interface CarritoItemPayload {
    lote_id: string;
    vehiculo_fisico_id: string | null;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

// ==========================================
// INVENTARIO / BODEGA
// ==========================================

/**
 * Refleja `BodegaItemVista` en inventario.rs.
 */
export interface BodegaItemVista {
    lote_id: string;
    color: string | null;
    cantidad: number;
    ubicacion: string;
    producto_nombre: string;
    sku: string;
    es_vehiculo: number;
    stock_minimo: number;
    categoria_nombre: string | null;
    marca_nombre: string | null;
    ultimo_ingreso: number;
    stock_anterior: number;
    fecha_ultima_modificacion: string | null;
}

/**
 * Refleja `PaginatedBodega` en inventario.rs.
 */
export interface PaginatedBodega {
    items: BodegaItemVista[];
    total: number;
}

// ==========================================
// KARDEX
// ==========================================

/**
 * Refleja `KardexMovimiento` en kardex.rs.
 */
export interface KardexMovimiento {
    id: string;
    tipo_movimiento: TipoMovimiento;
    cantidad: number;
    motivo: string | null;
    fecha: string | null;
    usuario_id: string | null;
    usuario_nombre: string | null;
    color: string | null;
    producto_nombre: string;
    sku: string | null;
    es_vehiculo: number;
}

// ==========================================
// VEHÍCULOS
// ==========================================

/**
 * Refleja `VehiculoFisicoDetalle` en vehiculos.rs.
 * Extiende la entidad base con campos del JOIN.
 */
export interface VehiculoFisicoDetalle {
    id: string;
    numero_chasis: string;
    numero_motor: string;
    estado: EstadoVehiculo;
    fecha_ingreso: string | null;
    color: string | null;
    producto_nombre: string;
    sku: string;
    marca_nombre: string | null;
}

/**
 * Refleja `RespuestaPaginadaVehiculos` en vehiculos.rs.
 */
export interface RespuestaPaginadaVehiculos {
    data: VehiculoFisicoDetalle[];
    total_registros: number;
}
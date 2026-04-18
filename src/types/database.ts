/**
 * database.ts — Entidades canónicas que mapean 1:1 con las tablas de SQLite.
 *
 * REGLA: Este archivo define la "forma de la BD". No importa nada de otros
 * archivos de tipos. Todo lo demás hereda o extiende desde aquí.
 */

// ==========================================
// MAESTROS
// ==========================================

export interface Categoria {
    id: string;
    nombre: string;
    descripcion?: string;
}

export interface Marca {
    id: string;
    nombre: string;
    categoria_id: string;
}

// ==========================================
// PRODUCTOS
// ==========================================

export interface Producto {
    id: string;
    categoria_id: string;
    marca_id: string;
    nombre: string;
    sku: string;
    precio_compra_referencial: number;
    precio_venta_referencial: number;
    /** SQLite no tiene boolean — 0 = false, 1 = true */
    // es_vehiculo: number;
    es_vehiculo: boolean | number;
    stock_minimo: number;
    cilindraje?: number | null;
    modelo?: string | null;
}

/**
 * ProductoVista — Producto enriquecido con JOINs (catálogo admin).
 * Extiende Producto añadiendo los nombres de las relaciones.
 */
export interface ProductoVista extends Producto {
    categoria_nombre: string;
    marca_nombre: string;
    stock_actual: number;
}

/**
 * ProductoDTO — Payload para crear o actualizar un producto.
 * Omite `id` (autogenerado en Rust) y permite es_vehiculo como boolean.
 */
export interface ProductoDTO {
    categoria_id?: string;
    marca_id?: string;
    nombre: string;
    sku: string;
    precio_compra_referencial: number;
    precio_venta_referencial: number;
    es_vehiculo: boolean | number;
    stock_minimo: number;
    cilindraje?: number | null;
    modelo?: string | null;
}

// ==========================================
// INVENTARIO
// ==========================================

export interface InventarioLote {
    id: string;
    producto_id: string;
    /** NULL para repuestos, 'ROJO'/'NEGRO'/etc. para vehículos */
    color?: string | null;
    cantidad: number;
    ubicacion?: string;
}

/**
 * InventarioRecienteVista — Vista enriquecida para el módulo de inventario reciente.
 * Incluye datos de movimientos del kardex.
 */
export interface InventarioRecienteVista extends ProductoVista {
    stock_anterior: number;
    ultimo_ingreso: number;
    fecha_ultima_modificacion: string;
}

// ==========================================
// VEHÍCULOS FÍSICOS
// ==========================================

export type EstadoVehiculo = 'DISPONIBLE' | 'VENDIDO' | 'RESERVADO' | 'EN_TALLER';

export interface VehiculoFisico {
    id: string;
    lote_id: string;
    numero_chasis: string;
    numero_motor: string;
    estado: EstadoVehiculo;
    fecha_ingreso: string;
}

// ==========================================
// CLIENTES
// ==========================================

export interface Cliente {
    id: string;
    tipo_documento: string;
    numero_documento: string;
    nombre_completo: string;
    telefono?: string;
    email?: string;
    direccion?: string;
}

/** ClienteDTO — Para crear o actualizar (omite el id autogenerado) */
export type ClienteDTO = Omit<Cliente, 'id'>;

// ==========================================
// USUARIOS Y AUTENTICACIÓN
// ==========================================

export type RolUsuario = 'ADMINISTRADOR' | 'VENDEDOR' | 'MECANICO';

export interface Usuario {
    id: string;
    dni: string;
    nombre_completo: string;
    username: string;
    rol: RolUsuario;
    /** 1 = Activo, 0 = Inactivo */
    estado: number;
}

// ==========================================
// AUDITORÍA
// ==========================================

export interface AuditoriaLog {
    id: string;
    usuario_id: string;
    accion: string;
    entidad: string;
    entidad_id?: string | null;
    detalles?: string;
    fecha: string;
}

// ==========================================
// KARDEX
// ==========================================

// Corregido: Rust usa 'ENTRADA' y 'SALIDA' — no 'INGRESO'
// Verificar en kardex.rs: tipo_movimiento = 'ENTRADA' | 'SALIDA'
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
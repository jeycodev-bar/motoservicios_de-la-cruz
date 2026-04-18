// // types/taller.ts
// export interface OrdenTaller {
//     id: string;
//     cliente_id: string;
//     cliente_nombre: string;
//     vehiculo_info: string;
//     motivo_ingreso: string;
//     estado: 'PENDIENTE' | 'EN_PROCESO' | 'LISTO' | 'ENTREGADO' | 'ARCHIVADO';
//     fecha_ingreso: string;
//     fecha_estimada?: string;
//     fecha_entrega?: string; // ✨ Añadido al tipado
//     costo_mano_obra?: number;
//     creado_por?: string;
//     mecanico_nombre?: string; // Para el historial
// }

// // ✨ DTO para la creación: Omitimos los campos que se autogeneran
// export type CrearOrdenDTO = Omit<OrdenTaller, 'id' | 'cliente_nombre' | 'estado' | 'fecha_ingreso' | 'costo_mano_obra' | 'mecanico_nombre'>;

// export interface RepuestoCatalogo {
//     id?: string;
//     lote_id: string;
//     producto_nombre: string;
//     cantidad: number; // Stock disponible
//     precio_venta_referencial: number;
// }

// export interface DetalleOrden {
//     id: string;
//     orden_id: string;
//     lote_id: string;
//     producto_nombre: string;
//     cantidad: number;
//     precio_unitario: number;
//     subtotal: number;
// }



/**
 * taller.ts — Tipos del módulo de taller.
 *
 * No duplica Cliente ni Producto — importa las entidades canónicas.
 * OrdenActivaDTO refleja exactamente OrdenActivaDTO en taller.rs.
 */

// ==========================================
// ÓRDENES DE TALLER
// ==========================================

export type EstadoOrden =
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'LISTO'
    | 'ENTREGADO'
    | 'ARCHIVADO';

/**
 * Refleja `OrdenActivaDTO` en taller.rs — incluye los campos del JOIN con clientes.
 * Antes llamado OrdenTaller en types/taller.ts (se unifica aquí).
 */
export interface OrdenActiva {
    id: string;
    cliente_id: string;
    creado_por: string | null;
    vehiculo_info: string;
    motivo_ingreso: string;
    estado: EstadoOrden;
    fecha_ingreso: string | null;
    fecha_estimada: string | null;
    fecha_entrega: string | null;
    costo_mano_obra: number;
    /** Viene del JOIN con clientes en la query de Rust */
    cliente_nombre: string | null;
    cliente_telefono: string | null;
    
    mecanico_nombre: string | null // ✨ NUEVO: Recibimos el nombre del JOIN en Rust
}

/**
 * DTO para crear una nueva orden — omite campos autogenerados por Rust.
 */
export type CrearOrdenDTO = Pick<
    OrdenActiva,
    'cliente_id' | 'vehiculo_info' | 'motivo_ingreso' | 'fecha_estimada' | 'creado_por'
>;

// ==========================================
// REPUESTOS Y DETALLES
// ==========================================

/**
 * Ítem del catálogo de repuestos disponibles para agregar a una orden.
 */
export interface RepuestoCatalogo {
    lote_id: string;
    producto_nombre: string;
    /** Stock disponible en bodega */
    cantidad: number;
    precio_venta_referencial: number;
    color?: string | null;
}

/**
 * Línea de detalle de una orden — refleja la tabla taller_detalles.
 */
export interface DetalleOrden {
    id: string;
    orden_id: string;
    lote_id: string;
    producto_nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}
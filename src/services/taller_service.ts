// src/services/taller.ts
/**
 * services/taller.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - OrdenTaller → OrdenActiva (el tipo fue renombrado al centralizar types/)
 * - params: any[] → (string | number)[] en obtenerHistorialPaginado
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 * - FiltrosHistorialTaller y RespuestaHistorialTaller movidos a este archivo
 *   (son exclusivos del servicio, no necesitan estar en types/)
 */

// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type { OrdenActiva, CrearOrdenDTO, DetalleOrden, RepuestoCatalogo } from '../types';

// ==========================================
// TIPOS LOCALES DEL SERVICIO
// ==========================================

export interface FiltrosHistorialTaller {
    busqueda?: string | null;
    limite: number;
    offset: number;
}

export interface RespuestaHistorialTaller {
    items: OrdenActiva[];
    total_registros: number;
}

// ==========================================
// SERVICIO
// ==========================================

export const TallerService = {

    // ✅ LECTURA PURA — el barrendero fue separado a archivar_ordenes_viejas
    obtenerOrdenes: async (): Promise<OrdenActiva[]> => {
        try {
            return await invoke<OrdenActiva[]>('obtener_ordenes_activas');
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error interno al cargar órdenes'));
        }
    },

    // ✅ Llama al barrendero explícitamente — separado de la lectura
    //    Invocar al montar el módulo de taller (useEffect en el layout)
    archivarOrdenesViejas: async (): Promise<void> => {
        try {
            await invoke('archivar_ordenes_viejas');
        } catch (e: unknown) {
            // Silencioso — el barrendero no debe romper la UI si falla
            console.warn('archivar_ordenes_viejas:', normalizeError(e, 'Error al archivar'));
        }
    },

    crearOrden: async (orden: CrearOrdenDTO): Promise<void> => {
        try {
            await invoke('crear_orden_segura', {
                clienteId: orden.cliente_id,
                vehiculoInfo: orden.vehiculo_info,
                motivoIngreso: orden.motivo_ingreso,
                fechaEstimada: orden.fecha_estimada ?? null,
                creadoPor: orden.creado_por,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al crear orden'));
        }
    },

    actualizarEstado: async (id: string, nuevoEstado: string): Promise<void> => {
        try {
            await invoke('actualizar_estado_seguro', { id, nuevoEstado });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al actualizar estado'));
        }
    },

    // ✅ Delegado a Rust
    obtenerCatalogoRepuestos: async (
        busqueda: string = '',
        limite: number = 8,
        offset: number = 0
    ): Promise<RepuestoCatalogo[]> => {
        try {
            return await invoke<RepuestoCatalogo[]>('obtener_catalogo_repuestos', { busqueda, limite, offset });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar el catálogo de repuestos.'));
        }
    },

    // ✅ Delegado a Rust
    obtenerDetallesOrden: async (ordenId: string): Promise<DetalleOrden[]> => {
        try {
            return await invoke<DetalleOrden[]>('obtener_detalles_orden', { ordenId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar detalles de la orden.'));
        }
    },

    agregarRepuesto: async (
        ordenId: string,
        loteId: string,
        cantidad: number,
        precio: number,
        usuarioId: string
    ): Promise<void> => {
        try {
            await invoke('agregar_repuesto_seguro', {
                ordenId,
                loteId,
                cantidad,
                precio,
                usuarioId,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error interno al agregar repuesto'));
        }
    },

    actualizarManoObra: async (ordenId: string, costo: number): Promise<void> => {
        try {
            await invoke('actualizar_mano_obra_segura', { ordenId, costo });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al actualizar mano de obra'));
        }
    },

    eliminarRepuesto: async (
        detalleId: string,
        loteId: string,
        cantidad: number,
        ordenId: string,
        usuarioId: string
    ): Promise<void> => {
        try {
            await invoke('eliminar_repuesto_seguro', {
                detalleId,
                loteId,
                cantidad,
                ordenId,
                usuarioId,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al eliminar repuesto'));
        }
    },

    // ✅ Delegado a Rust (Historial Paginado)
    obtenerHistorialPaginado: async (
        filtros: FiltrosHistorialTaller
    ): Promise<RespuestaHistorialTaller> => {
        try {
            return await invoke<RespuestaHistorialTaller>('obtener_historial_paginado_taller', { filtros });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar el historial del taller.'));
        }
    },
};
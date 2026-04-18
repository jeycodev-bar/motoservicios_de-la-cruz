// src/services/ventas.ts
/**
 * services/ventas.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - Interfaces duplicadas eliminadas — ahora importan desde @/types:
 *     FiltrosVentas, RespuestaPaginadaVentas, ChasisDisponible,
 *     ItemCarrito, ProductoCatalogo, CarritoItemPayload, VentaHistorialDTO
 * - VarianteProducto y ProductoAgrupadoBackend: ProductoCatalogo de api.ts
 *   ya tiene variantes: string → se parsea aquí a VarianteProducto[]
 * - invoke<any[]> → invoke<ProductoCatalogoBruto[]> con tipo explícito
 * - VentaDetalle y VentaCabecera se mantienen locales (solo usados aquí)
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 */

// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type {
    FiltrosVentas,
    RespuestaPaginadaVentas,
    ChasisDisponible,
    ItemCarrito,
    CarritoItemPayload,
    ProductoCatalogo,
    VentaHistorialDTO,
} from '../types';

// ==========================================
// TIPOS LOCALES DEL SERVICIO
// ==========================================

/** Variante parseada del campo `variantes` (string JSON) de ProductoCatalogo */
export interface VarianteProducto {
    lote_id: string;
    color: string | null;
    cantidad: number;
}

/**
 * ProductoCatalogo con variantes ya parseadas.
 * ProductoCatalogo.variantes es string (SQLite json_group_array).
 * Este tipo representa la versión lista para la UI.
 */
export type ProductoCatalogoUI = Omit<ProductoCatalogo, 'variantes'> & {
    variantes: VarianteProducto[];
};

/** Detalle de línea para el ticket de venta */
export interface VentaDetalle {
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    producto_nombre: string;
    color: string | null;
    numero_chasis: string | null;
}

/** Cabecera de venta para el ticket — misma forma que VentaHistorialDTO */
export type VentaCabecera = VentaHistorialDTO;

// ==========================================
// STOCK PARA UI (PLANO, PERO DERIVADO)
// ==========================================

export type StockVenta =
    VarianteProducto &
    Pick<
        ProductoCatalogoUI,
        | 'producto_id'
        | 'producto_nombre'
        | 'sku'
        | 'es_vehiculo'
        | 'precio_venta_referencial'
        | 'categoria_nombre'
        | 'marca_nombre'
    > & {
        categoria_id: string | null;
        marca_id: string | null;
    };

// ==========================================
// SERVICIO
// ==========================================

export const VentasService = {

    // ✅ invoke tipado como ProductoCatalogo[] — no más any[]
    //    Las variantes (string JSON de SQLite) se parsean a VarianteProducto[]
    obtenerCatalogoOptimizado: async (
        busqueda: string,
        categoriaId: string,
        marcaId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<ProductoCatalogoUI[]> => {
        try {
            const data = await invoke<ProductoCatalogo[]>('obtener_catalogo_optimizado', {
                busqueda,
                categoriaId,
                marcaId,
                limit,
                offset,
            });

            // Parsear variantes: SQLite las envía como string JSON
            return data.map(prod => ({
                ...prod,
                variantes: JSON.parse(prod.variantes) as VarianteProducto[],
            }));
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'No se pudo cargar el catálogo de productos.'));
        }
    },

    // Lectura directa a DB — sin mutaciones
    // obtenerChasisDisponibles: async (loteId: string): Promise<ChasisDisponible[]> => {
    //     const db = await getDb();
    //     return await db.select<ChasisDisponible[]>(
    //         `SELECT id, numero_chasis, numero_motor
    //          FROM vehiculos_fisicos
    //          WHERE lote_id = ? AND estado = 'DISPONIBLE'`,
    //         [loteId]
    //     );
    // },
    // ✅ Delegado a Rust
    obtenerChasisDisponibles: async (loteId: string): Promise<ChasisDisponible[]> => {
        try {
            return await invoke<ChasisDisponible[]>('obtener_chasis_disponibles', { loteId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener chasis disponibles.'));
        }
    },

    procesarVenta: async (
        usuarioId: string,
        clienteId: string | null,
        clienteNombre: string,
        total: number,
        carrito: ItemCarrito[]
    ): Promise<{ id: string }> => {
        if (!usuarioId) throw new Error('USUARIO_REQUERIDO');
        if (carrito.length === 0) throw new Error('CARRITO_VACIO');

        const nombreLimpio = (clienteNombre || 'CLIENTE GENÉRICO').trim().toUpperCase();
        const validTotal = Number(total) || 0;

        // Adaptador: transforma ItemCarrito (UI) → CarritoItemPayload (Rust)
        const carritoParaRust: CarritoItemPayload[] = carrito.map(item => {
            if (!item.lote_id) throw new Error('LOTE_REQUERIDO_EN_ITEM');
            const precioUnitario = Number(item.precio) || 0;
            const cantidad = Number(item.cantidad) || 1;
            return {
                lote_id: item.lote_id,
                vehiculo_fisico_id: item.vehiculo_id ?? null,
                cantidad,
                precio_unitario: precioUnitario,
                subtotal: cantidad * precioUnitario,
            };
        });

        try {
            const ventaId = await invoke<string>('procesar_venta_segura', {
                usuarioId,
                clienteId: clienteId ?? null,
                clienteNombre: nombreLimpio,
                total: validTotal,
                carrito: carritoParaRust,
            });
            return { id: ventaId };
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error interno al procesar la venta en el servidor'));
        }
    },

    obtenerHistorialVentas: async (
        filtros: FiltrosVentas
    ): Promise<RespuestaPaginadaVentas> => {
        try {
            return await invoke<RespuestaPaginadaVentas>(
                'obtener_historial_ventas_paginado',
                { filtros }
            );
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'No se pudo cargar el historial de ventas.'));
        }
    },

    // obtenerDetalleVenta: async (ventaId: string): Promise<VentaDetalle[]> => {
    //     const db = await getDb();
    //     return await db.select<VentaDetalle[]>(`
    //         SELECT
    //             vd.cantidad,
    //             vd.precio_unitario,
    //             vd.subtotal,
    //             p.nombre as producto_nombre,
    //             il.color,
    //             vf.numero_chasis
    //         FROM ventas_detalles vd
    //         JOIN inventario_lotes il ON vd.lote_id = il.id
    //         JOIN productos p ON il.producto_id = p.id
    //         LEFT JOIN vehiculos_fisicos vf ON vd.vehiculo_fisico_id = vf.id
    //         WHERE vd.venta_id = ?
    //     `, [ventaId]);
    // },
    obtenerDetalleVenta: async (ventaId: string): Promise<VentaDetalle[]> => {
        try {
            return await invoke<VentaDetalle[]>('obtener_detalle_venta', { ventaId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar los detalles de la venta.'));
        }
    },

    // obtenerVentaPorId: async (ventaId: string): Promise<VentaCabecera | null> => {
    //     const db = await getDb();
    //     const venta = await db.select<VentaCabecera[]>(`
    //         SELECT
    //             v.id,
    //             v.cliente_nombre,
    //             v.total,
    //             v.fecha,
    //             u.nombre_completo as vendedor_nombre
    //         FROM ventas v
    //         LEFT JOIN usuarios u ON v.usuario_id = u.id
    //         WHERE v.id = ?
    //     `, [ventaId]);
    //     return venta[0] ?? null;
    // },
    // ✅ Delegado a Rust
    obtenerVentaPorId: async (ventaId: string): Promise<VentaCabecera | null> => {
        try {
            return await invoke<VentaCabecera | null>('obtener_venta_por_id', { ventaId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar la cabecera de la venta.'));
        }
    },
};
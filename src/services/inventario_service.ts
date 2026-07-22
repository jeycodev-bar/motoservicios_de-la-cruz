// src/services/inventario_service.ts
/**
 * services/inventario.ts
 *
 * CAMBIOS APLICADOS:
 * - BodegaItemVista y PaginatedBodega eliminados (ahora en types/api.ts)
 * - PaginacionResult → PaginatedResponse (refleja el struct real de Rust)
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 * - Validaciones previas al invoke agrupadas en helper privado
 * - ✅ recargarStockExistente ahora acepta tipoMovimiento (FRAGMENTO 4 aplicado)
 */

import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type {
    InventarioRecienteVista,
    PaginatedResponse,
    PaginatedBodega,
    PaginatedProductosBodega,
    TipoMovimiento
} from '../types';

// ==========================================
// HELPER PRIVADO
// ==========================================

function validarRegistroIngreso(productoId: string, cantidad: number, usuarioId: string): void {
    if (!productoId) throw new Error('El producto es requerido.');
    if (cantidad <= 0) throw new Error('La cantidad debe ser mayor a cero.');
    if (!usuarioId) throw new Error('Sesión de usuario inválida.');
}

// ==========================================
// SERVICIO
// ==========================================

export const InventarioService = {

    obtenerStock: async (
        buscar: string = '',
        categoriaId: string = '',
        marcaId: string = '',
        pagina: number = 1,
        limite: number = 10
    ): Promise<PaginatedBodega> => {
        try {
            return await invoke<PaginatedBodega>('obtener_stock_bodega', {
                buscar: buscar || null,
                categoriaId: categoriaId || null,
                marcaId: marcaId || null,
                pagina,
                limite,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener stock'));
        }
    },

    obtenerStockAgrupado: async (
        buscar: string = '',
        categoriaId: string = '',
        marcaId: string = '',
        pagina: number = 1,
        limite: number = 15
    ): Promise<PaginatedProductosBodega> => {
        try {
            return await invoke<PaginatedProductosBodega>('obtener_stock_bodega_agrupado', {
                buscar: buscar || null,
                categoriaId: categoriaId || null,
                marcaId: marcaId || null,
                pagina,
                limite,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener stock agrupado'));
        }
    },

    obtenerInventarioReciente: async (
        pagina: number = 1,
        limite: number = 5
    ): Promise<PaginatedResponse<InventarioRecienteVista>> => {
        try {
            return await invoke<PaginatedResponse<InventarioRecienteVista>>(
                'obtener_inventario_reciente',
                { pagina, limite }
            );
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener el inventario reciente'));
        }
    },

    registrarIngreso: async (
        productoId: string,
        cantidad: number,
        usuarioId: string,
        color: string | null = null,
        ubicacion: string = 'ALMACÉN PRINCIPAL',
        motivo: string = 'INGRESO MANUAL'
    ): Promise<void> => {
        validarRegistroIngreso(productoId, cantidad, usuarioId);
        try {
            await invoke('registrar_ingreso_seguro', {
                productoId,
                cantidad,
                usuarioId,
                color: color || null,
                ubicacion,
                motivo,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error interno al registrar el ingreso.'));
        }
    },

    // FRAGMENTO 4 APLICADO: 'tipoMovimiento' añadido con valor por defecto
    recargarStockExistente: async (
        loteId: string,
        cantidad: number,
        usuarioId: string,
        motivo: string = 'RECARGA DESDE BODEGA',
        tipoMovimiento: TipoMovimiento = 'ENTRADA'
    ): Promise<void> => {
        if (!loteId) throw new Error('Identificador de lote requerido.');
        if (cantidad <= 0) throw new Error('La cantidad debe ser mayor a cero.');
        if (!usuarioId) throw new Error('Sesión de usuario inválida.');
        try {
            await invoke('agregar_stock_existente_seguro', {
                loteId,
                cantidad,
                usuarioId,
                motivo,
                tipoMovimiento, // Pasamos el parámetro a Rust
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error interno al recargar stock.'));
        }
    },
};
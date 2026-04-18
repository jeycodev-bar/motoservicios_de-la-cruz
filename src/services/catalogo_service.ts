// src/services/catalogo.ts
/**
 * services/catalogo.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - verificarSkuDuplicado: $1/$2 (PostgreSQL) → ? (SQLite)
 * - params: any[] → string[] en verificarSkuDuplicado
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 * - Imports actualizados a @/types
 */

// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type { ProductoDTO, ProductoVista, PaginacionResult } from '../types';

export const CatalogoService = {

    obtenerProductosPaginados: async (
        buscar: string | null = null,
        categoriaId: string | null = null,
        marcaId: string | null = null,
        pagina: number = 1,
        limite: number = 20
    ): Promise<PaginacionResult<ProductoVista>> => {
        try {
            return await invoke<PaginacionResult<ProductoVista>>(
                'obtener_productos_paginados',
                {
                    buscar: buscar?.trim() || null,
                    categoriaId: categoriaId || null,
                    marcaId: marcaId || null,
                    pagina,
                    limite,
                }
            );
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener productos paginados'));
        }
    },

    /**
     * Verifica en tiempo real si un SKU ya existe (útil para validación onBlur).
     * Usa ? (SQLite) — no $1/$2 (PostgreSQL).
     */
    // verificarSkuDuplicado: async (sku: string, idExcluir?: string): Promise<boolean> => {
    //     if (!sku.trim()) return false;

    //     const db = await getDb();
    //     const skuLimpio = sku.trim().toUpperCase();

    //     // ✅ ? en lugar de $1/$2 — consistente con el resto de la codebase
    //     const query = idExcluir
    //         ? 'SELECT id FROM productos WHERE sku = ? AND id != ? LIMIT 1'
    //         : 'SELECT id FROM productos WHERE sku = ? LIMIT 1';

    //     // ✅ string[] en lugar de any[]
    //     const params: string[] = idExcluir
    //         ? [skuLimpio, idExcluir]
    //         : [skuLimpio];

    //     const resultado = await db.select<{ id: string }[]>(query, params);
    //     return resultado.length > 0;
    // },
    verificarSkuDuplicado: async (sku: string, idExcluir?: string): Promise<boolean> => {
        if (!sku.trim()) return false;

        try {
            return await invoke<boolean>('verificar_sku_duplicado', {
                sku,
                idExcluir: idExcluir || null,
            });
        } catch (e: unknown) {
            console.error('Error al verificar SKU:', e);
            // Si falla la verificación, asumimos true para proteger la BD por precaución
            return true;
        }
    },

    crearProducto: async (datos: ProductoDTO): Promise<void> => {
        try {
            await invoke('crear_producto_seguro', {
                categoriaId: datos.categoria_id ?? null,
                marcaId: datos.marca_id ?? null,
                nombre: datos.nombre,
                sku: datos.sku,
                precioCompraReferencial: datos.precio_compra_referencial,
                precioVentaReferencial: datos.precio_venta_referencial,
                esVehiculo: datos.es_vehiculo,
                stockMinimo: datos.stock_minimo,
                cilindraje: datos.cilindraje ?? null,
                modelo: datos.modelo ?? null,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al crear el producto'));
        }
    },

    actualizarProducto: async (id: string, cambios: Partial<ProductoDTO>): Promise<void> => {
        try {
            await invoke('actualizar_producto_seguro', { id, payload: cambios });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al actualizar el producto'));
        }
    },

    eliminarProducto: async (id: string): Promise<void> => {
        try {
            await invoke('eliminar_producto_seguro', { id });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al eliminar el producto'));
        }
    },
};
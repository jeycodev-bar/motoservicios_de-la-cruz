// src/services/maestros.ts
/**
 * services/maestros.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 * - Imports actualizados a @/types
 * - Lógica sin cambios — ya estaba bien estructurado
 */

// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type { Categoria, Marca } from '../types';

export const MaestrosService = {

    // ── Categorías ────────────────────────────────────────────────────────────

    // obtenerCategorias: async (): Promise<Categoria[]> => {
    //     const db = await getDb();
    //     return await db.select<Categoria[]>('SELECT * FROM categorias ORDER BY nombre ASC');
    // },
    // ✅ Delegado a Rust
    obtenerCategorias: async (): Promise<Categoria[]> => {
        try {
            return await invoke<Categoria[]>('obtener_categorias');
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar categorías'));
        }
    },

    crearCategoria: async (nombre: string, descripcion: string = ''): Promise<void> => {
        try {
            await invoke('crear_categoria_segura', { nombre, descripcion });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al crear categoría'));
        }
    },

    eliminarCategoria: async (id: string): Promise<void> => {
        try {
            await invoke('eliminar_categoria_segura', { id });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al eliminar categoría'));
        }
    },

    // ── Marcas ────────────────────────────────────────────────────────────────

    // obtenerMarcas: async (): Promise<Marca[]> => {
    //     const db = await getDb();
    //     return await db.select<Marca[]>('SELECT * FROM marcas ORDER BY nombre ASC');
    // },
    // ✅ Delegado a Rust
    obtenerMarcas: async (): Promise<Marca[]> => {
        try {
            return await invoke<Marca[]>('obtener_marcas');
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar marcas'));
        }
    },

    // obtenerMarcasPorCategoria: async (categoriaId: string): Promise<Marca[]> => {
    //     const db = await getDb();
    //     return await db.select<Marca[]>(
    //         'SELECT * FROM marcas WHERE categoria_id = ? ORDER BY nombre ASC',
    //         [categoriaId]
    //     );
    // },
    // ✅ Delegado a Rust
    obtenerMarcasPorCategoria: async (categoriaId: string): Promise<Marca[]> => {
        try {
            return await invoke<Marca[]>('obtener_marcas_por_categoria', { categoriaId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al cargar marcas de la categoría'));
        }
    },

    crearMarca: async (nombre: string, categoriaId: string): Promise<void> => {
        try {
            await invoke('crear_marca_segura', { nombre, categoriaId });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al crear marca'));
        }
    },

    eliminarMarca: async (id: string): Promise<void> => {
        try {
            await invoke('eliminar_marca_segura', { id });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al eliminar marca'));
        }
    },
};
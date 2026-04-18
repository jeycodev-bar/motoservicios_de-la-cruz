// src/services/clientes.ts
/**
 * services/clientes.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - params: any[] → (string | number)[] en obtenerClientesPaginados
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 * - buscarClientePorDocumento y buscarClientePorDocumentoExacto unificados
 *   (eran idénticos salvo el nombre)
 */

// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type { Cliente, ClienteDTO } from '../types';

export const ClientesService = {

    // Búsqueda exacta por número de documento — para el POS
    // buscarClientePorDocumento: async (numeroDocumento: string): Promise<Cliente | null> => {
    //     const db = await getDb();
    //     const result = await db.select<Cliente[]>(
    //         `SELECT * FROM clientes WHERE numero_documento = ? LIMIT 1`,
    //         [numeroDocumento.trim()]
    //     );
    //     return result[0] ?? null;
    // },
    // ✅ Delegado a Rust (CREO QUE ESTO NO SE USA EN NINGUNA VISTA)
    buscarClientePorDocumento: async (numeroDocumento: string): Promise<Cliente | null> => {
        try {
            return await invoke<Cliente | null>('buscar_cliente_por_documento', { numeroDocumento });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al buscar cliente por documento'));
        }
    },

    // obtenerClientesPaginados: async (
    //     pagina: number = 1,
    //     limite: number = 50,
    //     terminoBusqueda: string = ''
    // ): Promise<{ data: Cliente[]; total: number }> => {
    //     const db = await getDb();
    //     const offset = (pagina - 1) * limite;

    //     // ✅ (string | number)[] en lugar de any[]
    //     const queryParams: (string | number)[] = [];
    //     let whereClause = '';

    //     if (terminoBusqueda.trim()) {
    //         whereClause = `WHERE nombre_completo LIKE ? OR numero_documento LIKE ?`;
    //         const like = `%${terminoBusqueda.trim().toUpperCase()}%`;
    //         queryParams.push(like, like);
    //     }

    //     const countResult = await db.select<{ total: number }[]>(
    //         `SELECT COUNT(*) as total FROM clientes ${whereClause}`,
    //         queryParams
    //     );
    //     const total = countResult[0].total;

    //     const data = await db.select<Cliente[]>(`
    //         SELECT * FROM clientes
    //         ${whereClause}
    //         ORDER BY fecha_registro DESC
    //         LIMIT ? OFFSET ?
    //     `, [...queryParams, limite, offset]);

    //     return { data, total };
    // },
    // ✅ Delegado a Rust
    obtenerClientesPaginados: async (
        pagina: number = 1,
        limite: number = 50,
        terminoBusqueda: string = ''
    ): Promise<{ data: Cliente[]; total: number }> => {
        try {
            return await invoke<{ data: Cliente[]; total: number }>('obtener_clientes_paginados', {
                pagina,
                limite,
                terminoBusqueda
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener clientes paginados'));
        }
    },

    // Autocompletado rápido para el módulo de ventas
    // buscarClientesRapido: async (texto: string): Promise<Cliente[]> => {
    //     const db = await getDb();
    //     const termino = texto.trim();

    //     if (!termino) {
    //         return await db.select<Cliente[]>(
    //             `SELECT * FROM clientes ORDER BY fecha_registro DESC LIMIT 5`
    //         );
    //     }

    //     // Con 1 carácter no buscamos — evitamos saturar la BD
    //     if (termino.length === 1) return [];

    //     const like = `%${termino.toUpperCase()}%`;
    //     return await db.select<Cliente[]>(`
    //         SELECT * FROM clientes
    //         WHERE numero_documento LIKE ? OR nombre_completo LIKE ?
    //         ORDER BY nombre_completo ASC
    //         LIMIT 10
    //     `, [like, like]);
    // },
    // ✅ Delegado a Rust
    buscarClientesRapido: async (texto: string): Promise<Cliente[]> => {
        try {
            return await invoke<Cliente[]>('buscar_clientes_rapido', { texto });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error en la búsqueda rápida de clientes'));
        }
    },

    guardarCliente: async (cliente: ClienteDTO): Promise<string> => {
        try {
            return await invoke<string>('guardar_cliente_seguro', {
                tipoDocumento: cliente.tipo_documento,
                numeroDocumento: cliente.numero_documento,
                nombreCompleto: cliente.nombre_completo,
                telefono: cliente.telefono ?? null,
                email: cliente.email ?? null,
                direccion: cliente.direccion ?? null,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al guardar cliente'));
        }
    },

    actualizarCliente: async (id: string, cliente: ClienteDTO): Promise<void> => {
        try {
            await invoke('actualizar_cliente_seguro', {
                id,
                tipoDocumento: cliente.tipo_documento,
                numeroDocumento: cliente.numero_documento,
                nombreCompleto: cliente.nombre_completo,
                telefono: cliente.telefono ?? null,
                email: cliente.email ?? null,
                direccion: cliente.direccion ?? null,
            });
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al actualizar cliente'));
        }
    },
};
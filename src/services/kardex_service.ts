// src/services/kardex.ts
/**
 * services/kardex.ts
 *
 * CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
 * - KardexMovimiento y PaginatedResponse eliminados (ahora en types/api.ts)
 * - TipoMovimiento corregido: 'INGRESO' → 'ENTRADA' (valor real en la BD)
 * - ObtenerKardexParams se mantiene local (es un parámetro de UI, no un DTO de Rust)
 * - catch(error: any) → catch(e: unknown) + normalizeError()
 */

import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors';
import type { KardexMovimiento, PaginatedResponse } from '../types';

// ==========================================
// TIPOS LOCALES DEL SERVICIO
// ==========================================

// ✅ Corregido: Rust usa 'ENTRADA' y 'SALIDA' — no 'INGRESO'
//    Verificar en kardex.rs: tipo_movimiento = 'ENTRADA' | 'SALIDA'
// export type TipoMovimiento = 'ENTRADA' | 'SALIDA';  //Ahora en types/api.ts

/** Parámetros de UI para la consulta paginada del kardex */
export interface ObtenerKardexParams {
    pagina: number;
    limite: number;
    fechaInicio?: string;
    fechaFin?: string;
    terminoBusqueda?: string;
}

// ==========================================
// SERVICIO
// ==========================================

export const KardexService = {

    obtenerKardexPaginado: async (
        params: ObtenerKardexParams
    ): Promise<PaginatedResponse<KardexMovimiento>> => {
        try {
            return await invoke<PaginatedResponse<KardexMovimiento>>(
                'obtener_kardex_paginado',
                {
                    pagina: params.pagina,
                    limite: params.limite,
                    fechaInicio: params.fechaInicio ?? null,
                    fechaFin: params.fechaFin ?? null,
                    terminoBusqueda: params.terminoBusqueda ?? null,
                }
            );
        } catch (e: unknown) {
            throw new Error(normalizeError(e, 'Error al obtener el kardex'));
        }
    },
};
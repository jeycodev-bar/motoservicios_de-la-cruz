// src/services/vehiculos.ts
// import { getDb } from './db';
import { invoke } from '@tauri-apps/api/core';
import { normalizeError } from '../utils/errors'; // ✨ Asegúrate de importarlo
import type { VehiculoFisicoDetalle } from '../types';


// ✨ DTOs para tipar estrictamente las respuestas y ayudar al Frontend
// export interface VehiculoFisicoDetalle {
//     id: string;
//     numero_chasis: string;
//     numero_motor: string;
//     estado: string;
//     fecha_ingreso: string;
//     color: string | null;
//     producto_nombre: string;
//     sku: string;
//     marca_nombre: string | null;
// }

export interface LotePendiente {
    lote_id: string;
    cantidad_en_bodega: number;
    color: string | null;
    producto_nombre: string;
    chasis_registrados: number;
}

// NUEVA INTERFAZ: Para manejar la respuesta compuesta del backend
export interface PaginacionVehiculosResponse {
    data: VehiculoFisicoDetalle[];
    total_registros: number;
}

export const VehiculosService = {
    // LECTURA: Historial de chasis y motores
    // obtenerVehiculosFisicosPaginados: async (
    //     pagina: number = 1,
    //     busqueda: string = '',
    //     estado: string | null = 'DISPONIBLE'
    // ): Promise<VehiculoFisicoDetalle[]> => {
    //     try {
    //         return await invoke<VehiculoFisicoDetalle[]>('obtener_vehiculos_fisicos_paginados', {
    //             pagina,
    //             busqueda,
    //             estado
    //         });
    //     } catch (error) {
    //         console.error("Error al obtener vehículos paginados:", error);
    //         throw error;
    //     }
    // },
    obtenerVehiculosFisicosPaginados: async (
        pagina: number = 1,
        busqueda: string = '',
        estado: string | null = 'DISPONIBLE'
    ): Promise<PaginacionVehiculosResponse> => {
        try {
            return await invoke<PaginacionVehiculosResponse>('obtener_vehiculos_fisicos_paginados', {
                pagina,
                busqueda,
                estado
            });
        } catch (error) {
            console.error("Error al obtener vehículos paginados:", error);
            throw error;
        }
    },

    // LECTURA PURA: Lotes que aún necesitan registro de chasis/motor
    // obtenerLotesPendientesDeChasis: async (): Promise<LotePendiente[]> => {
    //     const db = await getDb();
    //     return await db.select<LotePendiente[]>(`
    //     SELECT 
    //         il.id as lote_id,
    //         il.cantidad as cantidad_en_bodega,
    //         il.color,
    //         p.nombre as producto_nombre,
    //         COUNT(v.id) as chasis_registrados
    //     FROM inventario_lotes il
    //     JOIN productos p ON il.producto_id = p.id
    //     -- 🔥 EL BLINDAJE: Al hacer el cruce, SOLO contamos los vehículos que NO están vendidos
    //     LEFT JOIN vehiculos_fisicos v ON il.id = v.lote_id AND v.estado != 'VENDIDO'
    //     -- 🔥 EXTRA SEGURIDAD: Solo mostramos lotes que realmente tengan stock > 0
    //     WHERE p.es_vehiculo = 1 AND il.cantidad > 0
    //     GROUP BY il.id
    //     HAVING chasis_registrados < cantidad_en_bodega
    // `);
    // },
    // ✅ Delegado a Rust
    obtenerLotesPendientesDeChasis: async (): Promise<LotePendiente[]> => {
        try {
            return await invoke<LotePendiente[]>('obtener_lotes_pendientes_de_chasis');
        } catch (error: unknown) {
            throw new Error(normalizeError(error, 'Error al cargar lotes pendientes de chasis.'));
        }
    },

    // 🔥 BLINDADO: Evita condiciones de carrera y excesos de registro
    // 🔥 BLINDADO MAXIMO: Delegado a Rust para evitar "database is locked"
    registrarVehiculoFisico: async (
        loteId: string,
        numeroChasis: string,
        numeroMotor: string
    ): Promise<void> => {
        try {
            // Mandamos los datos limpios al backend nativo
            await invoke('registrar_vehiculo_fisico_seguro', {
                loteId: loteId,
                numeroChasis: numeroChasis,
                numeroMotor: numeroMotor
            });
            console.log(`✅ Vehículo registrado exitosamente: ${numeroChasis}`);
        } catch (error: any) {
            console.error("🚨 Error capturado desde Rust:", error);
            // Lanzamos el error con el mismo texto que espera el frontend (ej. 'CHASIS_MOTOR_DUPLICADO')
            throw new Error(typeof error === 'string' ? error : "Error interno al registrar vehículo");
        }
    }
};
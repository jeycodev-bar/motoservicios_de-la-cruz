/**
 * utils/errors.ts — Normalización de errores del puente IPC Tauri → TypeScript.
 *
 * Tauri serializa los errores de Rust como strings cuando el comando
 * devuelve Result<_, String>. Este helper unifica el manejo en un solo lugar,
 * eliminando el patrón `catch (error: any)` repetido en cada servicio.
 *
 * Uso:
 *   } catch (e) {
 *       throw new Error(normalizeError(e, 'Error al procesar venta'));
 *   }
 */

// src/utils/errors.ts
/**
 * Convierte cualquier valor capturado en un catch en un string legible.
 * Si Rust lanzó un string de error (ej: "STOCK_INSUFICIENTE"), lo preserva.
 * Si fue un Error de JS, usa su mensaje.
 * Si fue otro valor, usa el fallback.
 */
export function normalizeError(error: unknown, fallback: string): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return fallback;
}
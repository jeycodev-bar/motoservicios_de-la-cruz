// src/utils/fechas.ts
// =============================================================================
// Utilidades de fecha — Enterprise-grade, timezone Lima (UTC-5, sin DST)
// =============================================================================
//
// PRINCIPIO DE DISEÑO:
//   - La BD almacena SIEMPRE en UTC (sin sufijo Z, formato "YYYY-MM-DD HH:MM:SS").
//   - El usuario vive en Lima (America/Lima, UTC-5, sin DST).
//   - Todo cálculo de límites de período se hace aquí, nunca en SQL.
//   - Las funciones son puras: sin side-effects, sin state, sin llamadas externas.
//
// OFFSET Lima: UTC-5 fijo. América/Lima no tiene horario de verano.
//   00:00 Lima = 05:00 UTC del mismo día calendario Lima.
//   23:59:59 Lima = 04:59:59 UTC del día siguiente calendario Lima.
//
// CONVENCIÓN DE SALIDA PARA SQLITE:
//   Todas las funciones que producen timestamps para SQLite devuelven el formato
//   "YYYY-MM-DD HH:MM:SS" (sin Z, sin T) porque es lo que SQLite interpreta
//   directamente en comparaciones de string con BETWEEN / >= / <.
// =============================================================================

const LIMA_OFFSET_HOURS = 5; // UTC-5, constante, sin DST

// -----------------------------------------------------------------------------
// INTERNO — construir un timestamp UTC "YYYY-MM-DD HH:MM:SS" para SQLite
// a partir de un Date de JS (que ya es UTC internamente).
// -----------------------------------------------------------------------------
const toSQLiteUTC = (d: Date): string =>
    d.toISOString().replace('T', ' ').substring(0, 19);

// -----------------------------------------------------------------------------
// INTERNO — dado un string "YYYY-MM-DD" (fecha calendario Lima) y una hora
// Lima HH:MM:SS, devuelve el Date UTC correspondiente.
// -----------------------------------------------------------------------------
const limaDateToUTC = (fechaLima: string, horaLima: string): Date => {
    // Parsear sin new Date(string) para evitar ambigüedad de timezone del navegador.
    const [y, m, d] = fechaLima.split('-').map(Number);
    const [hh, mm, ss] = horaLima.split(':').map(Number);
    // Lima = UTC-5 → hora UTC = hora Lima + 5
    return new Date(Date.UTC(y, m - 1, d, hh + LIMA_OFFSET_HOURS, mm, ss));
};

// =============================================================================
// API PÚBLICA
// =============================================================================

/**
 * Formatea un timestamp UTC almacenado en SQLite ("YYYY-MM-DD HH:MM:SS" sin Z)
 * a una cadena legible en la zona horaria de Lima.
 *
 * Ejemplo: "2026-04-22 14:30:00" → "22 abr 2026, 09:30 a. m."
 */
export const formatearFechaLocal = (fechaUtc: string | null | undefined): string => {
    if (!fechaUtc) return '---';

    // Normalizar a ISO 8601 con Z para forzar interpretación UTC en todos los navegadores.
    // SQLite devuelve "YYYY-MM-DD HH:MM:SS" → lo convertimos a "YYYY-MM-DDTHH:MM:SSZ".
    const iso = fechaUtc.includes('Z') || fechaUtc.includes('+')
        ? fechaUtc
        : fechaUtc.replace(' ', 'T') + 'Z';

    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '---';

    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Lima',
    }).format(fecha);
};

/**
 * Formatea un timestamp UTC solo como fecha (sin hora) en Lima.
 *
 * Ejemplo: "2026-04-22 14:30:00" → "22 abr 2026"
 */
export const formatearSoloFecha = (fechaUtc: string | null | undefined): string => {
    if (!fechaUtc) return '---';

    const iso = fechaUtc.includes('Z') || fechaUtc.includes('+')
        ? fechaUtc
        : fechaUtc.replace(' ', 'T') + 'Z';

    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '---';

    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Lima',
    }).format(fecha);
};

/**
 * Obtiene el timestamp UTC del INICIO de un día calendario Lima
 * (00:00:00 Lima = 05:00:00 UTC del mismo día).
 *
 * @param fechaLima "YYYY-MM-DD" — fecha en el calendario de Lima
 * @returns "YYYY-MM-DD HH:MM:SS" en UTC, listo para SQLite.
 *
 * Ejemplo: "2026-04-22" → "2026-04-22 05:00:00"
 */
export const inicioDelDiaUTC = (fechaLima: string): string =>
    toSQLiteUTC(limaDateToUTC(fechaLima, '00:00:00'));

/**
 * Obtiene el timestamp UTC del FIN EXCLUSIVO de un día calendario Lima.
 * "Fin exclusivo" = 00:00:00 Lima del día siguiente = 05:00:00 UTC del día siguiente.
 * Se usa en comparaciones `fecha < fin_exclusivo` (más seguro que 23:59:59).
 *
 * @param fechaLima "YYYY-MM-DD" — fecha en el calendario de Lima
 * @returns "YYYY-MM-DD HH:MM:SS" en UTC del día siguiente, listo para SQLite.
 *
 * Ejemplo: "2026-04-22" → "2026-04-23 05:00:00"
 */
export const finExclusivoDelDiaUTC = (fechaLima: string): string => {
    const [y, m, d] = fechaLima.split('-').map(Number);
    // Date.UTC maneja desbordamiento de mes automáticamente (ej. d=32 → mes siguiente).
    return toSQLiteUTC(new Date(Date.UTC(y, m - 1, d + 1, LIMA_OFFSET_HOURS, 0, 0)));
};

/**
 * Compatibilidad con código existente — mantiene la firma original.
 * Internamente delega a inicioDelDiaUTC / finExclusivoDelDiaUTC.
 *
 * @param fechaInput "YYYY-MM-DD" desde un <input type="date">
 * @param limite     'INICIO' → 00:00:00 Lima en UTC
 *                   'FIN'    → 23:59:59 Lima en UTC (= siguiente día 04:59:59 UTC)
 *
 * NOTA: Para filtros SQLite, preferir `inicioDelDiaUTC` + `finExclusivoDelDiaUTC`
 * con `fecha >= inicio AND fecha < fin_exclusivo` en lugar de BETWEEN con 23:59:59,
 * porque evita perder registros con segundos fraccionarios.
 */
export const obtenerLimitesUTCDelDia = (
    fechaInput: string,
    limite: 'INICIO' | 'FIN',
): string | undefined => {
    if (!fechaInput) return undefined;

    if (limite === 'INICIO') {
        return inicioDelDiaUTC(fechaInput);
    }

    // FIN: 23:59:59 Lima en UTC (se mantiene por compatibilidad)
    return toSQLiteUTC(limaDateToUTC(fechaInput, '23:59:59'));
};

/**
 * Devuelve la fecha calendario de Lima de hoy en formato "YYYY-MM-DD".
 * No usa getDate() / getMonth() del navegador (que son en la TZ local del OS,
 * no necesariamente Lima). Usa Intl para garantizar que siempre es Lima.
 */
export const hoyEnLima = (): string =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

/**
 * Devuelve el primer día del mes actual en Lima, formato "YYYY-MM-DD".
 * Útil para el KPI de ingresos del mes del taller.
 */
export const primerDiaDelMesEnLima = (): string => {
    const hoy = hoyEnLima();           // "2026-04-22"
    const [y, m] = hoy.split('-');
    return `${y}-${m}-01`;
};

/**
 * Resta N días a una fecha calendario Lima y devuelve "YYYY-MM-DD".
 * Opera aritméticamente en UTC para evitar problemas de DST (aunque Lima
 * no tiene DST, es buena práctica).
 *
 * @param fechaLima "YYYY-MM-DD"
 * @param dias      número de días a restar (entero positivo)
 */
export const restarDiasLima = (fechaLima: string, dias: number): string => {
    const [y, m, d] = fechaLima.split('-').map(Number);
    // Date.UTC + operación: desbordamiento manejado por el motor JS
    const resultado = new Date(Date.UTC(y, m - 1, d - dias, LIMA_OFFSET_HOURS, 0, 0));
    return resultado.toISOString().substring(0, 10); // "YYYY-MM-DD"
};
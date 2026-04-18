// src/utils/fechas.ts

/**
 * Convierte un timestamp UTC a la hora local de Perú (UTC-5)
 * @param fechaUtc String de fecha que viene de la BD o de React
 * @returns String formateado (ej. "27 mar 2026, 10:30 a. m.")
 */
export const formatearFechaLocal = (fechaUtc: string | null | undefined): string => {
    if (!fechaUtc) return '---';

    // 1. Estandarización segura a UTC
    const fechaEstandarizada = fechaUtc.includes('Z') || fechaUtc.includes('T')
        ? fechaUtc
        : fechaUtc.replace(' ', 'T') + 'Z';

    const fecha = new Date(fechaEstandarizada);

    // 2. Usamos la API nativa bloqueada a la zona horaria de Perú
    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'short',   // 👈 Lo cambiamos a 'short' para que diga "mar" en vez de "03" en los PDFs
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Lima' // 🇵🇪 Ancla la hora a Perú siempre
    }).format(fecha);
};
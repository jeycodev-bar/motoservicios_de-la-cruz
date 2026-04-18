/**
 * utils/colors.ts
 *
 * Utilidades centralizadas de color para todo el codebase.
 * Elimina la duplicación de lógica de color dispersa en componentes.
 *
 * Exporta:
 *   - obtenerHexPorColor   — mapeo nombre → HEX para chips visuales
 *   - obtenerListaColores  — lista canónica para selectores
 *   - obtenerColorCategoria — paleta determinista para badges de categoría
 */

// ==========================================
// MAPA DE COLORES (DE VEHÍCULOS/PRODUCTOS) ESTÁTICOS
// ==========================================

const MAPA_COLORES: Readonly<Record<string, string>> = Object.freeze({
    // Neutros
    BLANCO: '#FFFFFF',
    NEGRO: '#1a1a1a',
    GRIS: '#6B7280',
    PLATA: '#C0C0C0',

    // Cálidos
    ROJO: '#DC2626',
    NARANJA: '#EA580C',
    AMARILLO: '#CA8A04',
    DORADO: '#D97706',

    // Fríos
    AZUL: '#2563EB',
    CELESTE: '#0EA5E9',
    VERDE: '#16A34A',
    TURQUESA: '#0D9488',

    // Otros
    MORADO: '#7C3AED',
    ROSA: '#DB2777',
    MARRON: '#92400E',
    BEIGE: '#D4B483',
});

// ==========================================
// 2. UTILIDADES DE VEHÍCULOS / PRODUCTOS
// ==========================================

/**
 * Devuelve el HEX correspondiente a un nombre de color (insensible a mayúsculas).
 * @param color El nombre del color (ej. "Rojo", "rojo", "ROJO")
 * @param fallback El color por defecto si no se encuentra (Evita romper la UI)
 * @returns Código HEX (ej. "#EF4444")
 */
export function obtenerHexPorColor(
    color: string | null | undefined,
    fallback: string = '#ffffff'
): string {
    if (!color) return fallback;
    const colorNormalizado = color.toUpperCase().trim();
    return MAPA_COLORES[colorNormalizado] ?? fallback;
}

/**
 * Lista canónica de colores disponibles para selectores (ej. <select>).
 * @returns Arreglo de strings con la primera letra capitalizada (ej. ["Blanco", "Negro"])
 */
export function obtenerListaColores(): string[] {
    return Object.keys(MAPA_COLORES).map(
        c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
    );
}

// ==========================================
// 3. PALETA DETERMINISTA PARA BADGES
// ==========================================

// El cache vive fuera del ciclo de vida de React (Singleton)
const _colorCategoriaCache: Record<string, string> = {};

// Colores pastel/suaves ideales para badges de categorías
const _PALETA_CATEGORIA = [
    'text-blue-700 bg-blue-50 border-blue-200 ring-blue-100',
    'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-100',
    'text-violet-700 bg-violet-50 border-violet-200 ring-violet-100',
    'text-rose-700 bg-rose-50 border-rose-200 ring-rose-100',
    'text-amber-700 bg-amber-50 border-amber-200 ring-amber-100',
    'text-cyan-700 bg-cyan-50 border-cyan-200 ring-cyan-100',
    'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200 ring-fuchsia-100',
] as const;

/**
 * Asigna un color Tailwind determinista a una categoría basado en su nombre.
 * Utiliza un algoritmo de hashing para asegurar que la misma categoría 
 * SIEMPRE reciba el mismo color visual en toda la app.
 * * @param nombreCategoria Nombre de la categoría (ej. "Frenos")
 * @returns Cadena de clases de Tailwind
 */
export function obtenerColorCategoria(nombreCategoria: string): string {
    if (!nombreCategoria) return 'text-gray-700 bg-gray-50 border-gray-200';

    const normalizado = nombreCategoria.trim();

    // Si ya lo calculamos en esta sesión, lo retornamos en O(1)
    if (_colorCategoriaCache[normalizado]) {
        return _colorCategoriaCache[normalizado];
    }

    // Algoritmo rápido de Hash (DJB2 adaptado)
    let hash = 0;
    for (let i = 0; i < normalizado.length; i++) {
        hash = normalizado.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Asignación segura del índice
    const index = Math.abs(hash) % _PALETA_CATEGORIA.length;
    const clase = _PALETA_CATEGORIA[index];

    // Guardamos en memoria para futuras llamadas
    _colorCategoriaCache[normalizado] = clase;

    return clase;
}
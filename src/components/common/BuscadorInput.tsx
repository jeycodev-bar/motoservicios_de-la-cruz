/**
 * components/common/BuscadorInput.tsx
 *
 * Input de búsqueda reutilizable que elimina 6 bloques JSX idénticos dispersos.
 *
 * Cubre los patrones comunes de:
 *   Bodega, Catalogo, ControlVehiculos, HistorialVentas, ModalDirectorioClientes
 *
 * Casos especiales que NO usan este componente (diseño estructuralmente distinto):
 *   - DirectorioClientes   → el input vive dentro de un panel con focus-within
 *   - PuntoVenta           → acoplado a múltiples filtros y scroll infinito
 *   - ModalIngresoStock    → spinner async propio + ref externo
 *   - ConfiguracionMaestros → border-b sin border completo (columna)
 *
 * API:
 *   value         — valor controlado
 *   onChange      — handler de cambio
 *   placeholder   — texto de ayuda
 *   onLimpiar?    — si se pasa, muestra botón X al haber texto
 *   cargando?     — el ícono Search cambia a azul pulsante
 *   className?    — override del contenedor para casos de ancho
 *   inputClassName? — override del input (ej. text-lg para modales grandes)
 *   rounded?      — 'lg' | 'xl' | '2xl'  (default: 'xl')
 *   iconoSize?    — tamaño del ícono Search en px (default: 18)
 */

import { X, Search } from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

type Rounded = 'lg' | 'xl' | '2xl';

interface BuscadorInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    onLimpiar?: () => void;
    cargando?: boolean;
    className?: string;
    inputClassName?: string;
    rounded?: Rounded;
    iconoSize?: number;
    autoFocus?: boolean;
    disabled?: boolean;
}

// ==========================================
// MAPA DE CLASES
// ==========================================

const ROUNDED_MAP: Record<Rounded, string> = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
};

// ==========================================
// COMPONENTE
// ==========================================

export default function BuscadorInput({
    value,
    onChange,
    placeholder = 'Buscar...',
    onLimpiar,
    cargando = false,
    className = '',
    inputClassName = '',
    rounded = 'xl',
    iconoSize = 18,
    autoFocus = false,
    disabled = false,
}: BuscadorInputProps) {
    const roundedClass = ROUNDED_MAP[rounded];
    const tieneTexto = value.length > 0;

    return (
        <div className={`relative ${className}`}>
            {/* Ícono de búsqueda — azul pulsante si está cargando */}
            <Search
                size={iconoSize}
                className={[
                    'absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors',
                    cargando ? 'text-blue-500 animate-pulse' : 'text-slate-400',
                ].join(' ')}
            />

            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                disabled={disabled}
                autoComplete="off"
                className={[
                    'w-full py-2.5 pl-10 bg-slate-50 border border-slate-300',
                    'outline-none transition-all font-medium text-slate-700',
                    'placeholder:text-slate-400',
                    'focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    roundedClass,
                    // Espacio para el botón X si existe
                    onLimpiar ? 'pr-10' : 'pr-4',
                    inputClassName,
                ].join(' ')}
            />

            {/* Botón X de limpieza — solo visible si hay texto y se pasó onLimpiar */}
            {onLimpiar && tieneTexto && (
                <button
                    type="button"
                    onClick={onLimpiar}
                    tabIndex={-1}
                    title="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}
/**
 * components/common/ErrorBanner.tsx
 *
 * Banner de error reutilizable con botón de reintento opcional.
 * Reemplaza el bloque JSX de errorVista repetido en 8 vistas:
 *   Bodega, Catalogo, ControlVehiculos, DirectorioClientes,
 *   HistorialVentas, Taller, PuntoVenta, Bodega.
 *
 * API:
 *   mensaje       — texto del error a mostrar
 *   onReintentar? — si se pasa, muestra botón "Reintentar"
 *   className?    — override del contenedor (ej. mb-4 en algunas vistas)
 *
 * Uso mínimo (solo mensaje):
 *   {errorVista && <ErrorBanner mensaje={errorVista} />}
 *
 * Uso completo (con reintento):
 *   {errorVista && (
 *     <ErrorBanner mensaje={errorVista} onReintentar={cargarDatos} />
 *   )}
 */

// src/components/common/ErrorBanner.tsx
import { AlertCircle, RefreshCcw } from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

interface ErrorBannerProps {
    mensaje: string;
    onReintentar?: () => void;
    className?: string;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ErrorBanner({
    mensaje,
    onReintentar,
    className = '',
}: ErrorBannerProps) {
    return (
        <div
            role="alert"
            className={[
                'flex items-center justify-between gap-3',
                'p-3 bg-red-50 border border-red-200 rounded-xl',
                'text-red-700 text-sm font-medium',
                className,
            ].join(' ')}
        >
            <div className="flex items-center gap-2 min-w-0">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span className="truncate">{mensaje}</span>
            </div>

            {onReintentar && (
                <button
                    type="button"
                    onClick={onReintentar}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-1.5
                               bg-red-600 text-white text-xs font-bold rounded-lg
                               hover:bg-red-700 active:scale-95 transition-all"
                >
                    <RefreshCcw size={12} />
                    Reintentar
                </button>
            )}
        </div>
    );
}
/**
 * components/common/PaginacionTabla.tsx
 *
 * Footer de paginación reutilizable que elimina 5 implementaciones idénticas.
 *
 * Cubre: Bodega, Catalogo, DirectorioClientes, HistorialVentas,
 *        y cualquier tabla futura.
 *
 * ControlVehiculos ya tiene su propio <PaginacionProfesional /> inline
 * porque forma parte del componente compuesto de esa vista — no se migra.
 *
 * API:
 *   paginaActual    — número de página actual (1-indexed)
 *   totalPaginas    — número total de páginas
 *   onAnterior      — callback al ir a página anterior
 *   onSiguiente     — callback al ir a página siguiente
 *   cargando?       — deshabilita botones durante carga
 *   contador?       — ReactNode libre para el texto izquierdo
 *                     Si no se pasa: "Página X de Y"
 *
 * Ejemplos de `contador`:
 *   <PaginacionTabla contador={`Mostrando ${n} de ${total} registros`} ... />
 *   <PaginacionTabla contador={<><strong>{desde}</strong> al <strong>{hasta}</strong></>} ... />
 *   <PaginacionTabla />  ← muestra "Página X de Y" por defecto
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

interface PaginacionTablaProps {
    paginaActual: number;
    totalPaginas: number;
    onAnterior: () => void;
    onSiguiente: () => void;
    cargando?: boolean;
    /** Nodo informativo izquierdo. Por defecto: "Página X de Y" */
    contador?: React.ReactNode;
    /** Clase extra para el contenedor (ej. ajuste de padding en contextos específicos) */
    className?: string;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function PaginacionTabla({
    paginaActual,
    totalPaginas,
    onAnterior,
    onSiguiente,
    cargando = false,
    contador,
    className = '',
}: PaginacionTablaProps) {
    const enPrimera = paginaActual <= 1;
    const enUltima = paginaActual >= totalPaginas || totalPaginas === 0;

    // Texto por defecto si no se pasa contador
    const textoContador = contador ?? (
        <span className="text-sm text-slate-600 font-medium">
            Página{' '}
            <strong className="text-slate-800">{paginaActual}</strong>{' '}
            de{' '}
            <strong className="text-slate-800">{totalPaginas || 1}</strong>
        </span>
    );

    return (
        <div className={[
            'bg-slate-50 border-t border-slate-200 px-4 py-4',
            'flex items-center justify-between shrink-0 gap-4',
            className,
        ].join(' ')}>

            {/* Contador izquierdo */}
            <div className="text-sm text-slate-600">
                {textoContador}
            </div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onAnterior}
                    disabled={enPrimera || cargando}
                    aria-label="Página anterior"
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600
                               hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600
                               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                               disabled:hover:border-slate-200 disabled:hover:text-slate-600
                               transition-all shadow-sm"
                >
                    <ChevronLeft size={18} />
                </button>

                <button
                    onClick={onSiguiente}
                    disabled={enUltima || cargando}
                    aria-label="Página siguiente"
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600
                               hover:bg-slate-50 hover:border-slate-300 hover:text-blue-600
                               disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                               disabled:hover:border-slate-200 disabled:hover:text-slate-600
                               transition-all shadow-sm"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
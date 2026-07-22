// src/views/Kardex.tsx
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    ArrowDownRight,
    ArrowUpRight,
    RefreshCw,
    NotebookPen,
    Inbox,
} from 'lucide-react';
import { KardexService } from '../services/kardex_service';
import type { KardexMovimiento, TipoMovimiento } from '../types';
import { formatearFechaLocal, obtenerLimitesUTCDelDia } from '../utils/fechas';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/common';

// ==========================================
// SUB-COMPONENTES MEMORIZADOS (Puros)
// ==========================================

const BadgeMovimiento = memo(function BadgeMovimiento({ tipo }: { tipo: TipoMovimiento }) {
    switch (tipo) {
        case 'ENTRADA':
            return (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md font-bold text-[11px] tracking-wide w-fit border border-emerald-200">
                    <ArrowDownRight size={14} /> ENTRADA
                </span>
            );
        case 'SALIDA':
            return (
                <span className="flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md font-bold text-[11px] tracking-wide w-fit border border-rose-200">
                    <ArrowUpRight size={14} /> SALIDA
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md font-bold text-[11px] tracking-wide w-fit border border-amber-200">
                    <RefreshCw size={14} /> {tipo}
                </span>
            );
    }
});

const KardexSkeleton = memo(function KardexSkeleton() {
    return (
        <>
            {[...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-slate-100">
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="p-4"><div className="h-6 bg-slate-200 rounded w-20" /></td>
                    <td className="p-4">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </td>
                    <td className="p-4 flex justify-end"><div className="h-5 bg-slate-200 rounded w-8" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                </tr>
            ))}
        </>
    );
});

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function Kardex() {

    // ── Datos ─────────────────────────────────────────────────────────────────
    const [movimientos, setMovimientos] = useState<KardexMovimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // ── Paginación ────────────────────────────────────────────────────────────
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const limitePorPagina = 50;

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const hayFiltrosFecha = Boolean(fechaInicio || fechaFin);
    const debouncedBusqueda = useDebounce(terminoBusqueda, 300);

    // Ref para detectar cambio de filtros y resetear página sin doble-fetch
    const prevFiltrosRef = useRef({ debouncedBusqueda, fechaInicio, fechaFin });

    // ── Efecto principal de fetch ─────────────────────────────────────────────
    useEffect(() => {
        const filtrosCambiaron =
            prevFiltrosRef.current.debouncedBusqueda !== debouncedBusqueda ||
            prevFiltrosRef.current.fechaInicio !== fechaInicio ||
            prevFiltrosRef.current.fechaFin !== fechaFin;

        // Estrategia anti-doble-fetch: si los filtros cambian y no estamos en pág 1,
        // reiniciamos la página y abortamos este ciclo — el siguiente se encargará.
        if (filtrosCambiaron) {
            prevFiltrosRef.current = { debouncedBusqueda, fechaInicio, fechaFin };
            if (pagina !== 1) {
                setPagina(1);
                return;
            }
        }

        const ctrl = new AbortController();

        const cargarKardex = async () => {
            setLoading(true);
            setError(null);
            try {
                const respuesta = await KardexService.obtenerKardexPaginado({
                    pagina,
                    limite: limitePorPagina,
                    terminoBusqueda: debouncedBusqueda,

                    fechaInicio: obtenerLimitesUTCDelDia(fechaInicio, 'INICIO'),
                    fechaFin: obtenerLimitesUTCDelDia(fechaFin, 'FIN'),
                });

                if (ctrl.signal.aborted) return;
                setMovimientos(respuesta.data);
                setTotalPaginas(respuesta.total_paginas);
                setTotalRegistros(respuesta.total_registros);
            } catch (err: unknown) {
                if (ctrl.signal.aborted) return;
                // ✅ console.error eliminado — redundante con setError + ErrorBanner visible
                setError(normalizeError(err, 'Ocurrió un error inesperado al cargar el Kardex.'));
            } finally {
                if (!ctrl.signal.aborted) setLoading(false);
            }
        };

        cargarKardex();
        return () => ctrl.abort();
    }, [pagina, debouncedBusqueda, fechaInicio, fechaFin, retryCount]);

    // ── Callbacks estables ────────────────────────────────────────────────────
    const limpiarFechas = useCallback(() => { setFechaInicio(''); setFechaFin(''); }, []);
    const handleReintentar = useCallback(() => setRetryCount(c => c + 1), []);
    const handlePaginaAnterior = useCallback(() => setPagina(p => Math.max(1, p - 1)), []);
    const handlePaginaSiguiente = useCallback(
        () => setPagina(p => Math.min(totalPaginas, p + 1)),
        [totalPaginas]
    );

    return (
        <div className="p-2 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)] min-h-[700px]">

            {/* Cabecera */}
            <header className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-xl shadow-sm text-indigo-600">
                            <NotebookPen size={30} strokeWidth={2.5} />
                        </div>
                        Historial de Movimientos (Kardex)
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 ml-1">
                        Historial inmutable de entradas, salidas y ajustes.
                    </p>
                </div>
            </header>

            {/* Error state */}
            {error && (
                <ErrorBanner
                    mensaje={error}
                    onReintentar={handleReintentar}
                    className="mb-4 shrink-0"
                />
            )}

            {/* Barra de filtros */}
            <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-end gap-5 shrink-0 relative z-20">
                <div className="flex-1 min-w-[280px]">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                        Buscar Producto
                    </label>
                    <BuscadorInput
                        value={terminoBusqueda}
                        onChange={e => setTerminoBusqueda(e.target.value)}
                        onLimpiar={() => setTerminoBusqueda('')}
                        placeholder="Escribe el nombre del producto o SKU..."
                        rounded="xl"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Desde</label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={e => setFechaInicio(e.target.value)}
                        className="px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Hasta</label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={e => setFechaFin(e.target.value)}
                        className="px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                {hayFiltrosFecha && (
                    <button
                        type="button"
                        onClick={limpiarFechas}
                        className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-200 hover:text-slate-800 font-bold text-sm transition-colors h-[42px] flex items-center justify-center"
                    >
                        Limpiar fechas
                    </button>
                )}
            </section>

            {/* Tabla de resultados */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col z-10 relative">
                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-0 bg-primary backdrop-blur-sm z-10 shadow-sm">
                            <tr className="text-slate-400 text-sm tracking-wider border-b border-slate-200">
                                <th className="w-[16%] p-5 font-black">Fecha y Hora</th>
                                <th className="w-[18%] p-5 font-black">Tipo</th>
                                <th className="w-[25%] p-5 font-black">Producto Afectado</th>
                                <th className="w-[8%] p-5 font-black text-right">Cantidad</th>
                                <th className="w-[20%] p-5 font-black">Motivo</th>
                                <th className="w-[13%] p-5 font-black">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <KardexSkeleton />
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-5 text-slate-300">
                                            <Inbox size={40} strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">No hay movimientos</h3>
                                        <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm mx-auto">
                                            Ajusta los filtros de búsqueda o registra una nueva entrada/salida en el inventario.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                movimientos.map(mov => (
                                    <tr key={mov.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="p-5 text-sm font-medium text-slate-600 whitespace-nowrap">
                                            {formatearFechaLocal(mov.fecha)}
                                        </td>
                                        <td className="p-5 whitespace-nowrap">
                                            <BadgeMovimiento tipo={mov.tipo_movimiento} />
                                        </td>
                                        <td className="p-5">
                                            <p
                                                className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700 transition-colors"
                                                title={mov.producto_nombre}
                                            >
                                                {mov.producto_nombre}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono mt-1 truncate tracking-wider">
                                                {mov.sku ?? 'S/N'}{mov.color ? ` • ${mov.color}` : ''}
                                            </p>
                                        </td>
                                        <td className="p-5 text-right whitespace-nowrap">
                                            <span className={`text-base font-black ${mov.tipo_movimiento === 'SALIDA'
                                                    ? 'text-rose-600'
                                                    : 'text-emerald-600'
                                                }`}>
                                                {mov.tipo_movimiento === 'SALIDA' ? '-' : '+'}{mov.cantidad}
                                            </span>
                                        </td>
                                        <td
                                            className="p-5 text-sm font-medium text-slate-600 truncate max-w-xs"
                                            title={mov.motivo ?? ''}
                                        >
                                            {mov.motivo ?? <span className="text-slate-400 italic font-normal">N/A</span>}
                                        </td>
                                        <td className="p-5 text-sm font-bold text-slate-700 truncate">
                                            {mov.usuario_nombre ?? 'Sistema'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="border-t border-slate-100 bg-slate-50/50">
                    <PaginacionTabla
                        paginaActual={pagina}
                        totalPaginas={totalPaginas}
                        onAnterior={handlePaginaAnterior}
                        onSiguiente={handlePaginaSiguiente}
                        cargando={loading}
                        contador={
                            <span className="text-sm font-medium text-slate-500 tracking-wide">
                                Mostrando{' '}
                                <span className="font-black text-slate-800">{movimientos.length}</span>
                                {' '}de{' '}
                                <span className="font-black text-slate-800">{totalRegistros}</span>
                                <span className="mx-2 text-slate-300">|</span>
                                Página{' '}
                                <span className="font-bold text-slate-800">{pagina}</span>
                            </span>
                        }
                    />
                </div>
            </section>
        </div>
    );
}
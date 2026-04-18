// // views/Kardex.tsx
// import { useState, useEffect, useCallback } from 'react';
// import {
//     ArrowDownRight,
//     ArrowUpRight,
//     RefreshCw,
//     ChevronLeft,
//     ChevronRight,
//     NotebookPen,
//     Search,
//     Inbox
// } from 'lucide-react';
// // import { obtenerKardexPaginado, KardexMovimiento } from '../services/kardex_service';
// import { KardexService } from '../services/kardex_service';
// import type { KardexMovimiento } from '../types';
// import { formatearFechaLocal } from '../utils/fechas';
// import { useDebounce } from '../hooks/useDebounce';
// import { BuscadorInput } from '../components/common';

// export default function Kardex() {
//     // Estados de datos
//     const [movimientos, setMovimientos] = useState<KardexMovimiento[]>([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     // Estados de paginación
//     const [pagina, setPagina] = useState(1);
//     const [totalPaginas, setTotalPaginas] = useState(1);
//     const [totalRegistros, setTotalRegistros] = useState(0);
//     const limitePorPagina = 50;

//     // Estados de filtros
//     const [terminoBusqueda, setTerminoBusqueda] = useState('');
//     // const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
//     const [fechaInicio, setFechaInicio] = useState('');
//     const [fechaFin, setFechaFin] = useState('');

//     const hayFiltrosFecha = Boolean(fechaInicio || fechaFin);

//     // Debounce para búsqueda
//     // useEffect(() => {
//     //     const handler = setTimeout(() => {
//     //         if (debouncedBusqueda !== terminoBusqueda) {
//     //             setDebouncedBusqueda(terminoBusqueda);
//     //         }
//     //     }, 300);
//     //     return () => clearTimeout(handler);
//     // }, [terminoBusqueda, debouncedBusqueda]);

//     const debouncedBusqueda = useDebounce(terminoBusqueda, 300);

//     // Reseteo de página al cambiar CUALQUIER filtro
//     useEffect(() => {
//         setPagina(1);
//     }, [debouncedBusqueda, fechaInicio, fechaFin]);

//     // Fetch principal reactivo
//     useEffect(() => {
//         cargarKardex();
//     }, [pagina, debouncedBusqueda, fechaInicio, fechaFin]);

//     const cargarKardex = async () => {
//         try {
//             setLoading(true);
//             setError(null);

//             const respuesta = await KardexService.obtenerKardexPaginado({
//                 pagina,
//                 limite: limitePorPagina,
//                 terminoBusqueda: debouncedBusqueda,
//                 fechaInicio: fechaInicio || undefined,
//                 fechaFin: fechaFin || undefined,
//             });

//             setMovimientos(respuesta.data);
//             setTotalPaginas(respuesta.total_paginas);
//             setTotalRegistros(respuesta.total_registros);
//         } catch (err: unknown) {
//             console.error("Error al cargar Kardex:", err);
//             if (err instanceof Error) {
//                 setError(err.message);
//             } else {
//                 setError(String(err));
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Funciones memorizadas con useCallback para evitar re-creación en cada render
//     const limpiarFechas = useCallback(() => {
//         setFechaInicio('');
//         setFechaFin('');
//         // setTerminoBusqueda('');
//     }, []);

//     const renderBadgeMovimiento = useCallback((tipo: string) => {
//         switch (tipo) {
//             case 'INGRESO':
//             case 'ENTRADA':
//                 return (
//                     <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded font-bold text-[11px] w-fit">
//                         <ArrowDownRight size={14} /> {tipo}
//                     </span>
//                 );
//             case 'SALIDA':
//                 return (
//                     <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded font-bold text-[11px] w-fit">
//                         <ArrowUpRight size={14} /> SALIDA
//                     </span>
//                 );
//             default: // AJUSTES u otros
//                 return (
//                     <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded font-bold text-[11px] w-fit">
//                         <RefreshCw size={14} /> {tipo}
//                     </span>
//                 );
//         }
//     }, []);

//     return (
//         <div className="p-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)]">
//             {/* Cabecera */}
//             <div className="flex justify-between items-center mb-6 shrink-0">
//                 <div>
//                     <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
//                         <div className="bg-indigo-200 p-2 rounded-lg">
//                             <NotebookPen className="text-indigo-600" size={32} strokeWidth={2.5} />
//                         </div>
//                         Historial de Movimientos (Kardex)
//                     </h1>
//                     <p className="text-slate-500 mt-1">Historial inmutable de entradas, salidas y ajustes.</p>
//                 </div>
//             </div>

//             {/* Error State */}
//             {error && (
//                 <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium shrink-0 border border-red-200">
//                     Error al cargar datos: {error}
//                 </div>
//             )}

//             {/* BARRA DE FILTROS */}
//             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-end gap-4 shrink-0">
//                 <div className="flex-1 min-w-[200px]">
//                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Buscar Producto</label>
//                     <BuscadorInput
//                         value={terminoBusqueda}
//                         onChange={(e) => setTerminoBusqueda(e.target.value)}
//                         onLimpiar={() => {
//                             setTerminoBusqueda('');
//                             setPagina(1);
//                         }}
//                         placeholder="Escribe el nombre del producto o SKU"
//                         rounded="lg"
//                     />
//                 </div>

//                 <div>
//                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Desde</label>
//                     <div className="relative">
//                         {/* <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} /> */}
//                         <input
//                             type="date"
//                             value={fechaInicio}
//                             onChange={(e) => setFechaInicio(e.target.value)}
//                             className="pl-4 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//                         />
//                     </div>
//                 </div>

//                 <div>
//                     <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Hasta</label>
//                     <div className="relative">
//                         {/* <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} /> */}
//                         <input
//                             type="date"
//                             value={fechaFin}
//                             onChange={(e) => setFechaFin(e.target.value)}
//                             className="pl-4 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//                         />
//                     </div>
//                 </div>

//                 {hayFiltrosFecha && (
//                     <button
//                         type="button"
//                         onClick={limpiarFechas}
//                         className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 font-medium transition-colors h-[38px] flex items-center gap-2"
//                     >
//                         Limpiar fechas
//                     </button>
//                 )}
//             </div>

//             {/* TABLA DE RESULTADOS */}
//             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
//                 <div className="overflow-y-auto flex-1">
//                     <table className="w-full text-left border-collapse table-fixed">
//                         <thead className="sticky top-0 bg-primary z-10 shadow-sm">
//                             <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200">
//                                 <th className="w-[15%] p-4 font-bold">Fecha y Hora</th>
//                                 <th className="w-[12%] p-4 font-bold">Tipo</th>
//                                 <th className="w-[30%] p-4 font-bold">Producto Afectado</th>
//                                 <th className="w-[10%] p-4 font-bold text-right">Cantidad</th>
//                                 <th className="w-[20%] p-4 font-bold">Motivo</th>
//                                 <th className="w-[13%] p-4 font-bold">Usuario</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-200">
//                             {loading ? (
//                                 [...Array(8)].map((_, i) => (
//                                     <tr key={i} className="animate-pulse">
//                                         <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
//                                         <td className="p-4"><div className="h-6 bg-slate-200 rounded w-20"></div></td>
//                                         <td className="p-4">
//                                             <div className="h-4 bg-slate-200 rounded w-3/4 mb-1"></div>
//                                             <div className="h-3 bg-slate-100 rounded w-1/2"></div>
//                                         </td>
//                                         <td className="p-4 flex justify-end"><div className="h-5 bg-slate-200 rounded w-8"></div></td>
//                                         <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
//                                         <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
//                                     </tr>
//                                 ))
//                             ) : movimientos.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={6} className="px-6 py-16 text-center">
//                                         <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-slate-400">
//                                             <Inbox size={32} />
//                                         </div>
//                                         <h3 className="text-base font-bold text-slate-900">No hay movimientos</h3>
//                                         <p className="mt-1 text-sm text-slate-500">
//                                             Ajusta los filtros o realiza un nuevo movimiento en el inventario.
//                                         </p>
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 movimientos.map(mov => (
//                                     <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
//                                         <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
//                                             {formatearFechaLocal(mov.fecha)}
//                                         </td>

//                                         <td className="p-4 whitespace-nowrap">
//                                             {renderBadgeMovimiento(mov.tipo_movimiento)}
//                                         </td>

//                                         <td className="p-4">
//                                             <p className="font-bold text-slate-800 text-sm truncate" title={mov.producto_nombre}>
//                                                 {mov.producto_nombre}
//                                             </p>
//                                             <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
//                                                 {mov.sku || 'S/N'} {mov.color ? `| ${mov.color}` : ''}
//                                             </p>
//                                         </td>

//                                         <td className="p-4 text-right whitespace-nowrap">
//                                             <span className={`text-base font-black ${['SALIDA'].includes(mov.tipo_movimiento) ? 'text-red-600' : 'text-green-600'
//                                                 }`}>
//                                                 {['SALIDA'].includes(mov.tipo_movimiento) ? '-' : '+'}{mov.cantidad}
//                                             </span>
//                                         </td>

//                                         <td className="p-4 text-sm text-slate-600 truncate max-w-xs" title={mov.motivo || ''}>
//                                             {mov.motivo || <span className="text-slate-400 italic">N/A</span>}
//                                         </td>

//                                         <td className="p-4 text-sm font-medium text-slate-700 truncate">
//                                             {mov.usuario_nombre || 'Sistema'}
//                                         </td>
//                                     </tr>
//                                 ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* PAGINACIÓN */}
//                 <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
//                     <span className="text-sm text-slate-500">
//                         Mostrando <span className="font-bold text-slate-700">{movimientos.length}</span> de <span className="font-bold text-slate-700">{totalRegistros}</span> registros
//                     </span>
//                     <div className="flex gap-2">
//                         <button
//                             onClick={() => setPagina(p => Math.max(1, p - 1))}
//                             disabled={pagina === 1 || loading}
//                             className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 font-medium shadow-sm transition-colors"
//                         >
//                             <ChevronLeft size={18} /> Anterior
//                         </button>
//                         <span className="px-4 py-2 font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center">
//                             {pagina} / {totalPaginas}
//                         </span>
//                         <button
//                             onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
//                             disabled={pagina === totalPaginas || loading || totalPaginas === 0}
//                             className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 font-medium shadow-sm transition-colors"
//                         >
//                             Siguiente <ChevronRight size={18} />
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }



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
import { formatearFechaLocal } from '../utils/fechas';
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
                    fechaInicio: fechaInicio || undefined,
                    fechaFin: fechaFin || undefined,
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
        <div className="p-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)] min-h-[700px]">

            {/* Cabecera */}
            <header className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
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
                                <th className="w-[17%] p-5 font-black">Fecha y Hora</th>
                                <th className="w-[13%] p-5 font-black">Tipo</th>
                                <th className="w-[27%] p-5 font-black">Producto Afectado</th>
                                <th className="w-[10%] p-5 font-black text-right">Cantidad</th>
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
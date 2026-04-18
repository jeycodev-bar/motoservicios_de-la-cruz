// // src/components/TablaTallerHistorial.tsx
// import { useState, useEffect, memo } from 'react';
// import { toast } from 'sonner';
// import { Eye, Download, FileText, Loader2 } from 'lucide-react';
// import { TallerService } from '../services/taller_service';
// import { useDebounce } from '../hooks/useDebounce';
// import { normalizeError } from '../utils/errors';

// // Componentes UI compartidos
// import { BuscadorInput, PaginacionTabla, ErrorBanner } from './common';

// import type { OrdenActiva } from '../types';

// // ==========================================
// // TIPOS
// // ==========================================

// interface TablaTallerHistorialProps {
//     formatearFecha: (fecha: string) => string;
//     procesarComprobante: (orden: OrdenActiva, accion: 'VER' | 'DESCARGAR') => void;
// }

// const LIMITE = 15;

// // ==========================================
// // COMPONENTE PURO (memo)
// // ==========================================

// const TablaTallerHistorial = memo(function TablaTallerHistorial({
//     formatearFecha,
//     procesarComprobante,
// }: TablaTallerHistorialProps) {

//     const [historial, setHistorial] = useState<OrdenActiva[]>([]);
//     const [cargando, setCargando] = useState(true);
//     const [errorVista, setErrorVista] = useState<string | null>(null);
//     const [busqueda, setBusqueda] = useState('');
//     const [paginaActual, setPaginaActual] = useState(1);
//     const [totalRegistros, setTotalRegistros] = useState(0);

//     // Debounce para optimizar las peticiones
//     const busquedaDebounced = useDebounce(busqueda, 400);

//     // ==========================================
//     // EFECTO DE CARGA CON ABORT CONTROLLER
//     // ==========================================
//     useEffect(() => {
//         const abortController = new AbortController();

//         const cargarHistorial = async () => {
//             setCargando(true);
//             setErrorVista(null);

//             try {
//                 const data = await TallerService.obtenerHistorialPaginado({
//                     busqueda: busquedaDebounced || null,
//                     limite: LIMITE,
//                     offset: (paginaActual - 1) * LIMITE,
//                     // Si tu servicio soporta AbortSignal, pásalo: signal: abortController.signal
//                 });

//                 // Prevenir actualización de estado si el componente se desmontó 
//                 // o si hay una nueva petición en curso (Race Condition)
//                 if (abortController.signal.aborted) return;

//                 setHistorial(data.items);
//                 setTotalRegistros(data.total_registros);
//             } catch (e: unknown) {
//                 if (abortController.signal.aborted) return;

//                 const msg = normalizeError(e, 'Error al cargar el historial de taller');
//                 setErrorVista(msg);
//                 toast.error(msg);
//             } finally {
//                 if (!abortController.signal.aborted) {
//                     setCargando(false);
//                 }
//             }
//         };

//         cargarHistorial();

//         // Limpieza: Cancela la petición si cambian las dependencias o se desmonta
//         return () => abortController.abort();
//     }, [busquedaDebounced, paginaActual]); // Dependencias exactas


//     const totalPaginas = Math.ceil(totalRegistros / LIMITE);

//     return (
//         <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans relative">

//             {/* Encabezado y buscador */}
//             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
//                 <div>
//                     <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                         <FileText size={20} className="text-slate-500" aria-hidden="true" />
//                         Registros Archivados
//                     </h2>
//                     <p className="text-sm text-slate-500">Servicios finalizados y entregados</p>
//                 </div>

//                 <BuscadorInput
//                     value={busqueda}
//                     onChange={e => {
//                         setBusqueda(e.target.value);
//                         setPaginaActual(1); // Mantenemos el reseteo aquí, directo en el evento
//                     }}
//                     onLimpiar={() => { setBusqueda(''); setPaginaActual(1); }}
//                     placeholder="Buscar cliente, vehículo o ID..."
//                     cargando={cargando}
//                     rounded="xl"
//                     className="w-80"
//                 />
//             </div>

//             {/* Banner de Errores */}
//             {errorVista && (
//                 <ErrorBanner
//                     mensaje={errorVista}
//                     onReintentar={() => setPaginaActual(prev => prev)} // Fuzzing trigger simple
//                     className="m-4"
//                 />
//             )}

//             {/* Tabla */}
//             <div className="flex-1 overflow-auto custom-scrollbar relative">

//                 {/* Overlay de carga */}
//                 {cargando && (
//                     <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center transition-all duration-300">
//                         <Loader2 size={40} className="animate-spin text-orange-600 mb-4" />
//                     </div>
//                 )}

//                 <table className="w-full text-left border-collapse">
//                     <thead className="bg-white sticky top-0 z-10 shadow-sm">
//                         <tr className="text-xs font-bold text-slate-400 bg-primary uppercase tracking-wider border-b border-slate-200">
//                             <th scope="col" className="px-6 py-4">ID Orden</th>
//                             <th scope="col" className="px-6 py-4">Cliente</th>
//                             <th scope="col" className="px-6 py-4">Vehículo</th>
//                             <th scope="col" className="px-6 py-4">Mecánico</th>
//                             <th scope="col" className="px-6 py-4">Fecha Ingreso</th>
//                             <th scope="col" className="px-6 py-4">Fecha Entrega</th>
//                             <th scope="col" className="px-6 py-4 text-center">Comprobante</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                         {!cargando && historial.length === 0 ? (
//                             <tr>
//                                 <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
//                                     <div className="flex flex-col items-center gap-3">
//                                         <FileText size={40} className="text-slate-200" aria-hidden="true" />
//                                         <p>No se encontraron registros archivados.</p>
//                                     </div>
//                                 </td>
//                             </tr>
//                         ) : (
//                             historial.map(orden => (
//                                 <tr key={orden.id} className="hover:bg-slate-50 transition-colors group">
//                                     <td className="px-6 py-4">
//                                         <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-mono font-bold" title={orden.id}>
//                                             #{orden.id.substring(0, 8)}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 max-w-[180px]">
//                                         <span
//                                             className="text-sm text-slate-700 font-bold truncate block"
//                                             title={orden.cliente_nombre ?? undefined}
//                                         >
//                                             {orden.cliente_nombre ?? 'Cliente no registrado'}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 max-w-[180px]">
//                                         <span className="text-sm text-slate-700 font-medium truncate block" title={orden.vehiculo_info}>
//                                             {orden.vehiculo_info}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 max-w-[150px]">
//                                         <span className="text-sm text-indigo-700 font-medium truncate block">
//                                             {orden.mecanico_nombre ?? 'Sistema'}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 text-sm text-slate-600">
//                                         {orden.fecha_ingreso ? formatearFecha(orden.fecha_ingreso) : 'Sin fecha'}
//                                     </td>
//                                     <td className="px-6 py-4 text-sm text-slate-600">
//                                         {orden.fecha_entrega ? formatearFecha(orden.fecha_entrega) : '---'}
//                                     </td>
//                                     <td className="px-6 py-4 text-center">
//                                         <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
//                                             <button
//                                                 onClick={() => procesarComprobante(orden, 'VER')}
//                                                 className="p-2 text-slate-900 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500"
//                                                 title="Ver Comprobante"
//                                                 aria-label={`Ver comprobante de orden ${orden.id.substring(0, 8)}`}
//                                             >
//                                                 <Eye size={18} aria-hidden="true" />
//                                             </button>
//                                             <button
//                                                 onClick={() => procesarComprobante(orden, 'DESCARGAR')}
//                                                 className="p-2 text-slate-900 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
//                                                 title="Descargar PDF"
//                                                 aria-label={`Descargar PDF de orden ${orden.id.substring(0, 8)}`}
//                                             >
//                                                 <Download size={18} aria-hidden="true" />
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))
//                         )}
//                     </tbody>
//                 </table>
//             </div>

//             <PaginacionTabla
//                 paginaActual={paginaActual}
//                 totalPaginas={totalPaginas}
//                 onAnterior={() => setPaginaActual(p => Math.max(1, p - 1))}
//                 onSiguiente={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
//                 cargando={cargando}
//                 contador={
//                     <span className="text-sm text-slate-500">
//                         Página <strong className="text-slate-700">{paginaActual}</strong> de{' '}
//                         <strong className="text-slate-700">{totalPaginas || 1}</strong>
//                         <span className="hidden sm:inline text-slate-400">
//                             {' '}({totalRegistros} registros en total)
//                         </span>
//                     </span>
//                 }
//             />
//         </div>
//     );
// });

// export default TablaTallerHistorial;


// src/components/TablaTallerHistorial.tsx
import { useState, useEffect, useCallback, memo } from 'react';
import { toast } from 'sonner';
import { Eye, Download, FileText, Loader2 } from 'lucide-react';
import { TallerService } from '../services/taller_service';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

import { BuscadorInput, PaginacionTabla, ErrorBanner } from './common';

import type { OrdenActiva } from '../types';

// ==========================================
// TIPOS
// ==========================================

interface TablaTallerHistorialProps {
    formatearFecha: (fecha: string) => string;
    procesarComprobante: (orden: OrdenActiva, accion: 'VER' | 'DESCARGAR') => void;
}

const LIMITE = 15;

// ==========================================
// COMPONENTE (memo — referencia estable al ser montado desde Taller)
// ==========================================

const TablaTallerHistorial = memo(function TablaTallerHistorial({
    formatearFecha,
    procesarComprobante,
}: TablaTallerHistorialProps) {

    const [historial, setHistorial] = useState<OrdenActiva[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorVista, setErrorVista] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    const busquedaDebounced = useDebounce(busqueda, 400);

    // ✅ useCallback — referencia estable que se puede pasar a onReintentar
    //    El patrón anterior `() => setPaginaActual(prev => prev)` era incorrecto:
    //    si la página ya es 1, el setState no dispara un nuevo render ni el efecto.
    //    Con useCallback la función es la misma referencia → ErrorBanner puede
    //    llamarla directamente sin necesidad de trucos de estado.
    const cargarHistorial = useCallback(async (signal?: AbortSignal) => {
        setCargando(true);
        setErrorVista(null);
        try {
            const data = await TallerService.obtenerHistorialPaginado({
                busqueda: busquedaDebounced || null,
                limite: LIMITE,
                offset: (paginaActual - 1) * LIMITE,
            });

            if (signal?.aborted) return;
            setHistorial(data.items);
            setTotalRegistros(data.total_registros);
        } catch (e: unknown) {
            if (signal?.aborted) return;
            const msg = normalizeError(e, 'Error al cargar el historial de taller');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            if (!signal?.aborted) setCargando(false);
        }
    }, [busquedaDebounced, paginaActual]);

    // AbortController — cancela la petición si cambian dependencias o se desmonta
    useEffect(() => {
        const ctrl = new AbortController();
        cargarHistorial(ctrl.signal);
        return () => ctrl.abort();
    }, [cargarHistorial]);

    const totalPaginas = Math.ceil(totalRegistros / LIMITE);

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans relative">

            {/* Encabezado y buscador */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText size={20} className="text-slate-500" aria-hidden="true" />
                        Registros Archivados
                    </h2>
                    <p className="text-sm text-slate-500">Servicios finalizados y entregados</p>
                </div>

                <BuscadorInput
                    value={busqueda}
                    onChange={e => {
                        setBusqueda(e.target.value);
                        setPaginaActual(1);
                    }}
                    onLimpiar={() => { setBusqueda(''); setPaginaActual(1); }}
                    placeholder="Buscar cliente, vehículo o ID..."
                    cargando={cargando}
                    rounded="xl"
                    className="w-80"
                />
            </div>

            {/* ✅ onReintentar apunta a cargarHistorial directamente —
                funciona siempre, no depende de si la página cambió o no */}
            {errorVista && (
                <ErrorBanner
                    mensaje={errorVista}
                    onReintentar={() => cargarHistorial()}
                    className="m-4"
                />
            )}

            {/* Tabla */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">

                {cargando && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center transition-all duration-300">
                        <Loader2 size={40} className="animate-spin text-orange-600 mb-4" />
                    </div>
                )}

                <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 z-10 shadow-sm">
                        <tr className="text-xs font-bold text-slate-400 bg-primary uppercase tracking-wider border-b border-slate-200">
                            <th scope="col" className="px-6 py-4">ID Orden</th>
                            <th scope="col" className="px-6 py-4">Cliente</th>
                            <th scope="col" className="px-6 py-4">Vehículo</th>
                            <th scope="col" className="px-6 py-4">Mecánico</th>
                            <th scope="col" className="px-6 py-4">Fecha Ingreso</th>
                            <th scope="col" className="px-6 py-4">Fecha Entrega</th>
                            <th scope="col" className="px-6 py-4 text-center">Comprobante</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {!cargando && historial.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <FileText size={40} className="text-slate-200" aria-hidden="true" />
                                        <p>No se encontraron registros archivados.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            historial.map(orden => (
                                <tr key={orden.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span
                                            className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-mono font-bold"
                                            title={orden.id}
                                        >
                                            #{orden.id.substring(0, 8)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-[180px]">
                                        <span
                                            className="text-sm text-slate-700 font-bold truncate block"
                                            title={orden.cliente_nombre ?? undefined}
                                        >
                                            {orden.cliente_nombre ?? 'Cliente no registrado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-[180px]">
                                        <span
                                            className="text-sm text-slate-700 font-medium truncate block"
                                            title={orden.vehiculo_info}
                                        >
                                            {orden.vehiculo_info}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px]">
                                        <span className="text-sm text-indigo-700 font-medium truncate block">
                                            {orden.mecanico_nombre ?? 'Sistema'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {orden.fecha_ingreso ? formatearFecha(orden.fecha_ingreso) : 'Sin fecha'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {orden.fecha_entrega ? formatearFecha(orden.fecha_entrega) : '---'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => procesarComprobante(orden, 'VER')}
                                                className="p-2 text-slate-900 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500"
                                                title="Ver Comprobante"
                                                aria-label={`Ver comprobante de orden ${orden.id.substring(0, 8)}`}
                                            >
                                                <Eye size={18} aria-hidden="true" />
                                            </button>
                                            <button
                                                onClick={() => procesarComprobante(orden, 'DESCARGAR')}
                                                className="p-2 text-slate-900 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-emerald-500"
                                                title="Descargar PDF"
                                                aria-label={`Descargar PDF de orden ${orden.id.substring(0, 8)}`}
                                            >
                                                <Download size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <PaginacionTabla
                paginaActual={paginaActual}
                totalPaginas={totalPaginas}
                onAnterior={() => setPaginaActual(p => Math.max(1, p - 1))}
                onSiguiente={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                cargando={cargando}
                contador={
                    <span className="text-sm text-slate-500">
                        Página <strong className="text-slate-700">{paginaActual}</strong> de{' '}
                        <strong className="text-slate-700">{totalPaginas || 1}</strong>
                        <span className="hidden sm:inline text-slate-400">
                            {' '}({totalRegistros} registros en total)
                        </span>
                    </span>
                }
            />
        </div>
    );
});

export default TablaTallerHistorial;
// // src/views/Bodega.tsx
// import React, { useState, useEffect, useCallback } from 'react';
// import { toast } from 'sonner';
// import { InventarioService } from '../services/inventario_service';
// import { MaestrosService } from '../services/maestros_service';
// import ModalIngresoStock from '../components/ModalIngresoStock';
// import ModalRecargarStock from '../modales/ModalRecargarStock';
// import { formatearFechaLocal } from '../utils/fechas';
// // import { obtenerHexPorColor } from '../utils/colores';
// import { obtenerHexPorColor } from '../utils/colors';
// import { useDebounce } from '../hooks/useDebounce';

// // ✅ Todos los tipos desde @/types
// import type { Categoria, Marca, BodegaItemVista } from '../types';

// import {
//     Layers, PackagePlus, Search, Box, AlertCircle, History,
//     ChevronLeft, ChevronRight, X, Filter, Plus, ChevronDown,
//     ChevronUp, Ban, RefreshCcw, Info,
// } from 'lucide-react';

// const ITEMS_POR_PAGINA = 10;

// export default function Bodega() {

//     const [lotes, setLotes] = useState<BodegaItemVista[]>([]);
//     const [cargando, setCargando] = useState(true);
//     const [errorVista, setErrorVista] = useState<string | null>(null);

//     // Maestros
//     const [categorias, setCategorias] = useState<Categoria[]>([]);
//     const [marcas, setMarcas] = useState<Marca[]>([]);

//     // Filtros y paginación
//     const [busquedaInput, setBusquedaInput] = useState('');
//     const [categoriaFiltro, setCategoriaFiltro] = useState('');
//     const [marcaFiltro, setMarcaFiltro] = useState('');
//     const [pagina, setPagina] = useState(1);
//     const [totalItems, setTotalItems] = useState(0);
//     const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

//     // ✅ useDebounce en lugar del setTimeout manual — delay 400ms como el original
//     const busquedaActiva = useDebounce(busquedaInput, 400);

//     // Modales
//     const [modalIngresoNuevoAbierto, setModalIngresoNuevoAbierto] = useState(false);
//     const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);
//     const [loteParaRecargar, setLoteParaRecargar] = useState<BodegaItemVista | null>(null);

//     const categoriaSeleccionada = !!categoriaFiltro;
//     const sinMarcasEnCategoria = categoriaSeleccionada && marcas.length === 0;

//     // ── Carga de categorías al montar ─────────────────────────────────────────
//     useEffect(() => {
//         MaestrosService.obtenerCategorias()
//             .then(setCategorias)
//             .catch(e => toast.error(e instanceof Error ? e.message : 'Error al cargar categorías'));
//     }, []);

//     // ── Carga de marcas al cambiar categoría ──────────────────────────────────
//     useEffect(() => {
//         setMarcaFiltro('');
//         if (!categoriaFiltro) {
//             setMarcas([]);
//             return;
//         }
//         MaestrosService.obtenerMarcasPorCategoria(categoriaFiltro)
//             .then(setMarcas)
//             .catch(e => toast.error(e instanceof Error ? e.message : 'Error al cargar marcas'));
//     }, [categoriaFiltro]);

//     // ── Reset de página cuando cambia la búsqueda ─────────────────────────────
//     useEffect(() => {
//         setPagina(1);
//     }, [busquedaActiva]);

//     // ── Carga de stock ────────────────────────────────────────────────────────
//     const cargarStock = useCallback(async () => {
//         setCargando(true);
//         setErrorVista(null);
//         try {
//             const data = await InventarioService.obtenerStock(
//                 busquedaActiva, categoriaFiltro, marcaFiltro, pagina, ITEMS_POR_PAGINA
//             );
//             setLotes(data.items);
//             setTotalItems(data.total);
//         } catch (e: unknown) {
//             const msg = e instanceof Error ? e.message : 'Error al cargar el stock';
//             setErrorVista(msg);
//             toast.error(msg);
//         } finally {
//             setCargando(false);
//         }
//     }, [busquedaActiva, categoriaFiltro, marcaFiltro, pagina]);

//     useEffect(() => { cargarStock(); }, [cargarStock]);

//     // ── Cálculos de UI ────────────────────────────────────────────────────────
//     const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
//     const desde = totalItems === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1;
//     const hasta = Math.min(pagina * ITEMS_POR_PAGINA, totalItems);

//     const abrirRecarga = (lote: BodegaItemVista) => {
//         setLoteParaRecargar(lote);
//         setModalRecargaAbierto(true);
//     };

//     return (
//         <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-sans text-slate-900 animate-in fade-in duration-500">

//             {/* Header */}
//             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
//                 <div className="space-y-1">
//                     <div className="flex items-center gap-3">
//                         <div className="bg-violet-100 p-2 rounded-2xl text-violet-600 shadow-lg shadow-blue-200">
//                             <Layers size={32} />
//                         </div>
//                         <h1 className="text-3xl font-black tracking-tight text-slate-800">Bodega Central</h1>
//                     </div>
//                     <p className="text-slate-500 font-medium flex items-center gap-2">
//                         <Info size={14} /> Control de existencias físicas y auditoría de lotes.
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-3 w-full lg:w-auto">
//                     <button
//                         onClick={cargarStock}
//                         className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
//                         title="Refrescar datos"
//                     >
//                         <RefreshCcw size={20} className={cargando ? 'animate-spin' : ''} />
//                     </button>
//                     <button
//                         onClick={() => setModalIngresoNuevoAbierto(true)}
//                         className="flex-1 lg:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 flex items-center justify-center gap-3 font-bold shadow-xl shadow-slate-200 transition-all active:scale-95"
//                     >
//                         <PackagePlus size={20} /> Ingresar Mercadería
//                     </button>
//                 </div>
//             </div>

//             {/* Banner de error */}
//             {errorVista && (
//                 <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex justify-between items-center">
//                     <span>{errorVista}</span>
//                     <button onClick={cargarStock} className="ml-4 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold">
//                         Reintentar
//                     </button>
//                 </div>
//             )}

//             {/* Panel de filtros */}
//             <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 mb-6 space-y-4">
//                 <div className="flex flex-wrap items-center gap-4">
//                     {/* Buscador */}
//                     <div className="relative flex-1 min-w-[300px]">
//                         <Search
//                             className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${cargando ? 'text-blue-500' : 'text-slate-400'}`}
//                             size={20}
//                         />
//                         <input
//                             type="text"
//                             placeholder="Buscar por SKU, nombre del producto o clasificación..."
//                             value={busquedaInput}
//                             onChange={e => setBusquedaInput(e.target.value)}
//                             className="w-full pl-12 pr-12 py-2.5 bg-white border border-slate-300 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 placeholder:text-slate-400"
//                         />
//                         {busquedaInput && (
//                             <button
//                                 onClick={() => setBusquedaInput('')}
//                                 className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full text-slate-400"
//                             >
//                                 <X size={14} />
//                             </button>
//                         )}
//                     </div>

//                     {/* Selector de categoría */}
//                     <div className="relative w-full md:w-60">
//                         <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                         <select
//                             value={categoriaFiltro}
//                             onChange={e => { setCategoriaFiltro(e.target.value); setPagina(1); }}
//                             className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl appearance-none outline-none font-semibold text-slate-700 cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
//                         >
//                             <option value="">Todas las Categorías</option>
//                             {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
//                         </select>
//                         <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
//                     </div>

//                     {/* Selector de marca */}
//                     <div
//                         className={`relative w-full md:w-60 group transition-all ${sinMarcasEnCategoria ? 'cursor-not-allowed' : ''}`}
//                         title={sinMarcasEnCategoria ? 'Esta categoría no tiene marcas asociadas' : ''}
//                     >
//                         {sinMarcasEnCategoria
//                             ? <Ban className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 z-10" size={18} />
//                             : <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
//                         }
//                         <select
//                             value={marcaFiltro}
//                             onChange={e => { setMarcaFiltro(e.target.value); setPagina(1); }}
//                             disabled={!categoriaSeleccionada || sinMarcasEnCategoria}
//                             className={`w-full pl-11 pr-10 py-2.5 rounded-2xl appearance-none outline-none font-semibold transition-all border border-slate-300
//                                 ${!categoriaSeleccionada ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 cursor-pointer'}
//                                 ${sinMarcasEnCategoria ? 'border-red-300 text-red-400' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
//                         >
//                             <option value="">{sinMarcasEnCategoria ? 'Sin marcas disponibles' : 'Todas las Marcas'}</option>
//                             {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
//                         </select>
//                         {!sinMarcasEnCategoria && (
//                             <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Tabla de resultados */}
//             <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">

//                 {cargando && lotes.length > 0 && (
//                     <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center animate-in fade-in">
//                         <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-blue-600 border border-blue-50">
//                             <RefreshCcw size={20} className="animate-spin" /> Actualizando...
//                         </div>
//                     </div>
//                 )}

//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left border-collapse">
//                         <thead>
//                             <tr className="bg-primary text-slate-400 text-sm tracking-wider font-semibold">
//                                 <th className="px-6 py-4">Producto / Identificación</th>
//                                 <th className="px-4 py-4">Clasificación</th>
//                                 <th className="px-4 py-4 text-center">Variante / Color</th>
//                                 <th className="px-4 py-4 text-center">Stock Actual</th>
//                                 <th className="px-4 py-4">Ubicación</th>
//                                 <th className="px-6 py-4 text-center">Acciones</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                             {lotes.length === 0 && !cargando ? (
//                                 <tr>
//                                     <td colSpan={6} className="py-20 text-center">
//                                         <div className="flex flex-col items-center max-w-[300px] mx-auto">
//                                             <div className="bg-slate-50 p-6 rounded-full mb-4">
//                                                 <Box size={40} className="text-slate-300" />
//                                             </div>
//                                             <h3 className="text-lg font-bold text-slate-800">No hay existencias</h3>
//                                             <p className="text-slate-500 text-sm mt-1">
//                                                 No encontramos productos que coincidan con los filtros seleccionados.
//                                             </p>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 lotes.map(lote => (
//                                     <React.Fragment key={lote.lote_id}>
//                                         <tr className={`group transition-colors hover:bg-blue-50/40 ${filaExpandida === lote.lote_id ? 'bg-blue-50/60' : ''}`}>
//                                             <td className="px-6 py-3">
//                                                 <div className="flex flex-col gap-0.5">
//                                                     <span className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
//                                                         {lote.producto_nombre}
//                                                     </span>
//                                                     <div className="flex items-center gap-2">
//                                                         <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
//                                                             {lote.sku}
//                                                         </span>
//                                                         {lote.es_vehiculo === 1 && (
//                                                             <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">
//                                                                 Vehículo
//                                                             </span>
//                                                         )}
//                                                     </div>
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <div className="flex flex-col">
//                                                     <span className="text-sm font-bold text-slate-700">
//                                                         {lote.categoria_nombre ?? 'Sin Categoría'}
//                                                     </span>
//                                                     <span className="text-xs text-slate-400 font-medium">
//                                                         {lote.marca_nombre ?? 'Genérico'}
//                                                     </span>
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <div className="flex justify-center">
//                                                     {lote.color ? (
//                                                         <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
//                                                             <div
//                                                                 className="w-2.5 h-2.5 rounded-full border border-slate-300"
//                                                                 style={{ backgroundColor: obtenerHexPorColor(lote.color) ?? undefined }}
//                                                             />
//                                                             <span className="text-[11px] font-bold text-slate-600 uppercase">{lote.color}</span>
//                                                         </div>
//                                                     ) : (
//                                                         <span className="text-slate-300 text-xs italic">-</span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <div className="flex flex-col items-center gap-1">
//                                                     <div className={`px-3 py-1 rounded-lg font-bold text-base min-w-[50px] text-center shadow-sm ${lote.cantidad <= lote.stock_minimo
//                                                             ? 'bg-red-50 text-red-600 border border-red-200'
//                                                             : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
//                                                         }`}>
//                                                         {lote.cantidad}
//                                                     </div>
//                                                     {lote.cantidad <= lote.stock_minimo && (
//                                                         <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
//                                                             <AlertCircle size={10} /> Crítico
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
//                                                     {lote.ubicacion}
//                                                 </span>
//                                             </td>
//                                             <td className="px-6 py-3">
//                                                 <div className="flex items-center justify-center gap-2">
//                                                     <button
//                                                         onClick={() => abrirRecarga(lote)}
//                                                         className="h-8 w-8 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all active:scale-90"
//                                                         title="Recargar Stock"
//                                                     >
//                                                         <Plus size={18} />
//                                                     </button>
//                                                     <button
//                                                         onClick={() => setFilaExpandida(filaExpandida === lote.lote_id ? null : lote.lote_id)}
//                                                         className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg font-bold transition-all text-xs ${filaExpandida === lote.lote_id
//                                                                 ? 'bg-slate-800 text-white shadow-md'
//                                                                 : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
//                                                             }`}
//                                                     >
//                                                         <History size={14} />
//                                                         {filaExpandida === lote.lote_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>

//                                         {/* Fila expandida de detalle */}
//                                         {filaExpandida === lote.lote_id && (
//                                             <tr className="bg-gray-200 animate-in slide-in-from-top-1 duration-300">
//                                                 <td colSpan={6} className="px-8 py-2">
//                                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
//                                                         <div className="space-y-1.5">
//                                                             <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Última Actividad</p>
//                                                             <div className="flex items-center gap-2">
//                                                                 <div className="p-1.5 bg-slate-800 rounded-md">
//                                                                     <History className="text-blue-400" size={14} />
//                                                                 </div>
//                                                                 <span className="font-semibold text-black text-sm">
//                                                                     {formatearFechaLocal(lote.fecha_ultima_modificacion)}
//                                                                 </span>
//                                                             </div>
//                                                         </div>
//                                                         <div className="space-y-1.5">
//                                                             <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Balance Anterior</p>
//                                                             <p className="text-xl font-mono font-bold text-blue-800">{lote.stock_anterior} unidades</p>
//                                                         </div>
//                                                         <div className="space-y-1.5 text-right">
//                                                             <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Último Ingreso</p>
//                                                             <span className="inline-block text-xl font-black text-emerald-600 bg-emerald-400/10 px-3 py-0.5 rounded-lg border border-emerald-400/20">
//                                                                 +{lote.ultimo_ingreso}
//                                                             </span>
//                                                         </div>
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         )}
//                                     </React.Fragment>
//                                 ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* Paginación */}
//                 <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
//                     <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
//                         <span>Mostrando</span>
//                         <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">{desde}</span>
//                         <span>al</span>
//                         <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">{hasta}</span>
//                         <span>de</span>
//                         <span className="font-black text-slate-800">{totalItems}</span>
//                         <span className="hidden md:inline ml-2 text-slate-300">|</span>
//                         <span className="hidden md:inline">
//                             Página <span className="text-slate-800 font-bold">{pagina}</span> de{' '}
//                             <span className="text-slate-800 font-bold">{totalPaginas}</span>
//                         </span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <button
//                             onClick={() => setPagina(p => Math.max(1, p - 1))}
//                             disabled={pagina === 1 || cargando}
//                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
//                         >
//                             <ChevronLeft size={16} /> Anterior
//                         </button>
//                         <div className="sm:hidden px-4 font-black text-slate-700 text-sm">{pagina} / {totalPaginas}</div>
//                         <button
//                             onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
//                             disabled={pagina === totalPaginas || cargando || totalPaginas === 0}
//                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-bold hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
//                         >
//                             Siguiente <ChevronRight size={16} />
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* Modales */}
//             <ModalIngresoStock
//                 isOpen={modalIngresoNuevoAbierto}
//                 onClose={() => setModalIngresoNuevoAbierto(false)}
//                 onGuardado={cargarStock}
//             />
//             <ModalRecargarStock
//                 isOpen={modalRecargaAbierto}
//                 onClose={() => setModalRecargaAbierto(false)}
//                 onGuardado={cargarStock}
//                 loteInfo={loteParaRecargar}
//             />
//         </div>
//     );
// }



// src/views/Bodega.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { InventarioService } from '../services/inventario_service';
import { MaestrosService } from '../services/maestros_service';
import ModalIngresoStock from '../components/ModalIngresoStock';
import ModalRecargarStock from '../modales/ModalRecargarStock';
import { formatearFechaLocal } from '../utils/fechas';
import { obtenerHexPorColor } from '../utils/colors';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

// ✅ Componentes UI compartidos
import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/common';

import type { Categoria, Marca, BodegaItemVista } from '../types';

import {
    Layers, PackagePlus, Box, AlertCircle, History,
    ChevronDown, ChevronUp, Ban, RefreshCcw, Info,
    Filter, Plus,
} from 'lucide-react';

const ITEMS_POR_PAGINA = 10;

export default function Bodega() {

    const [lotes, setLotes] = useState<BodegaItemVista[]>([]);
    const [cargando, setCargando] = useState(true);
    const [errorVista, setErrorVista] = useState<string | null>(null);

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);

    const [busquedaInput, setBusquedaInput] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [marcaFiltro, setMarcaFiltro] = useState('');
    const [pagina, setPagina] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filaExpandida, setFilaExpandida] = useState<string | null>(null);

    const busquedaActiva = useDebounce(busquedaInput, 400);

    const [modalIngresoNuevoAbierto, setModalIngresoNuevoAbierto] = useState(false);
    const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);
    const [loteParaRecargar, setLoteParaRecargar] = useState<BodegaItemVista | null>(null);

    const categoriaSeleccionada = !!categoriaFiltro;
    const sinMarcasEnCategoria = categoriaSeleccionada && marcas.length === 0;

    useEffect(() => {
        MaestrosService.obtenerCategorias()
            .then(setCategorias)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar categorías')));
    }, []);

    useEffect(() => {
        setMarcaFiltro('');
        if (!categoriaFiltro) { setMarcas([]); return; }
        MaestrosService.obtenerMarcasPorCategoria(categoriaFiltro)
            .then(setMarcas)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar marcas')));
    }, [categoriaFiltro]);

    useEffect(() => { setPagina(1); }, [busquedaActiva]);

    const cargarStock = useCallback(async () => {
        setCargando(true);
        setErrorVista(null);
        try {
            const data = await InventarioService.obtenerStock(
                busquedaActiva, categoriaFiltro, marcaFiltro, pagina, ITEMS_POR_PAGINA
            );
            setLotes(data.items);
            setTotalItems(data.total);
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al cargar el stock');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    }, [busquedaActiva, categoriaFiltro, marcaFiltro, pagina]);

    useEffect(() => { cargarStock(); }, [cargarStock]);

    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    const desde = totalItems === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1;
    const hasta = Math.min(pagina * ITEMS_POR_PAGINA, totalItems);

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-sans text-slate-900 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 p-2 rounded-2xl text-violet-600 shadow-lg shadow-blue-200">
                            <Layers size={32} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-800">Bodega Central</h1>
                    </div>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <Info size={14} /> Control de existencias físicas y auditoría de lotes.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={cargarStock}
                        className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Refrescar datos"
                    >
                        <RefreshCcw size={20} className={cargando ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setModalIngresoNuevoAbierto(true)}
                        className="flex-1 lg:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 flex items-center justify-center gap-3 font-bold shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        <PackagePlus size={20} /> Ingresar Mercadería
                    </button>
                </div>
            </div>

            {/* ✅ ErrorBanner — 8 líneas inline → 1 componente */}
            {errorVista && (
                <ErrorBanner mensaje={errorVista} onReintentar={cargarStock} className="mb-6" />
            )}

            {/* Panel de filtros */}
            <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">

                    {/* ✅ BuscadorInput — ~20 líneas inline → 1 componente */}
                    <BuscadorInput
                        value={busquedaInput}
                        onChange={e => setBusquedaInput(e.target.value)}
                        onLimpiar={() => setBusquedaInput('')}
                        placeholder="Buscar por SKU, nombre del producto o clasificación..."
                        cargando={cargando}
                        rounded="2xl"
                        className="flex-1 min-w-[300px]"
                    />

                    {/* Selector categoría */}
                    <div className="relative w-full md:w-60">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={categoriaFiltro}
                            onChange={e => { setCategoriaFiltro(e.target.value); setPagina(1); }}
                            className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl appearance-none outline-none font-semibold text-slate-700 cursor-pointer focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                            <option value="">Todas las Categorías</option>
                            {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {/* Selector marca */}
                    <div
                        className={`relative w-full md:w-60 transition-all ${sinMarcasEnCategoria ? 'cursor-not-allowed' : ''}`}
                        title={sinMarcasEnCategoria ? 'Esta categoría no tiene marcas asociadas' : ''}
                    >
                        {sinMarcasEnCategoria
                            ? <Ban className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 z-10" size={18} />
                            : <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                        }
                        <select
                            value={marcaFiltro}
                            onChange={e => { setMarcaFiltro(e.target.value); setPagina(1); }}
                            disabled={!categoriaSeleccionada || sinMarcasEnCategoria}
                            className={`w-full pl-11 pr-10 py-2.5 rounded-2xl appearance-none outline-none font-semibold transition-all border border-slate-300
                                ${!categoriaSeleccionada ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 cursor-pointer'}
                                ${sinMarcasEnCategoria ? 'border-red-300 text-red-400' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
                        >
                            <option value="">{sinMarcasEnCategoria ? 'Sin marcas disponibles' : 'Todas las Marcas'}</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        {!sinMarcasEnCategoria && (
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                {cargando && lotes.length > 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center animate-in fade-in">
                        <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-blue-600 border border-blue-50">
                            <RefreshCcw size={20} className="animate-spin" /> Actualizando...
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-primary text-slate-400 text-sm tracking-wider font-semibold">
                                <th className="px-6 py-4">Producto / Identificación</th>
                                <th className="px-4 py-4">Clasificación</th>
                                <th className="px-4 py-4 text-center">Variante / Color</th>
                                <th className="px-4 py-4 text-center">Stock Actual</th>
                                <th className="px-4 py-4">Ubicación</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lotes.length === 0 && !cargando ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center max-w-[300px] mx-auto">
                                            <div className="bg-slate-50 p-6 rounded-full mb-4">
                                                <Box size={40} className="text-slate-300" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800">No hay existencias</h3>
                                            <p className="text-slate-500 text-sm mt-1">
                                                No encontramos productos que coincidan con los filtros seleccionados.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                lotes.map(lote => (
                                    <React.Fragment key={lote.lote_id}>
                                        <tr className={`group transition-colors hover:bg-blue-50/40 ${filaExpandida === lote.lote_id ? 'bg-blue-50/60' : ''}`}>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                                        {lote.producto_nombre}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">
                                                            {lote.sku}
                                                        </span>
                                                        {lote.es_vehiculo === 1 && (
                                                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Vehículo</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{lote.categoria_nombre ?? 'Sin Categoría'}</span>
                                                    <span className="text-xs text-slate-400 font-medium">{lote.marca_nombre ?? 'Genérico'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center">
                                                    {lote.color ? (
                                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                                                style={{ backgroundColor: obtenerHexPorColor(lote.color) }}
                                                            />
                                                            <span className="text-[11px] font-bold text-slate-600 uppercase">{lote.color}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs italic">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className={`px-3 py-1 rounded-lg font-bold text-base min-w-[50px] text-center shadow-sm ${lote.cantidad <= lote.stock_minimo
                                                            ? 'bg-red-50 text-red-600 border border-red-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        }`}>
                                                        {lote.cantidad}
                                                    </div>
                                                    {lote.cantidad <= lote.stock_minimo && (
                                                        <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                                                            <AlertCircle size={10} /> Crítico
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
                                                    {lote.ubicacion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => { setLoteParaRecargar(lote); setModalRecargaAbierto(true); }}
                                                        className="h-8 w-8 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all active:scale-90"
                                                        title="Recargar Stock"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setFilaExpandida(filaExpandida === lote.lote_id ? null : lote.lote_id)}
                                                        className={`h-8 px-2.5 flex items-center gap-1.5 rounded-lg font-bold transition-all text-xs ${filaExpandida === lote.lote_id
                                                                ? 'bg-slate-800 text-white shadow-md'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <History size={14} />
                                                        {filaExpandida === lote.lote_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {filaExpandida === lote.lote_id && (
                                            <tr className="bg-gray-200 animate-in slide-in-from-top-1 duration-300">
                                                <td colSpan={6} className="px-8 py-2">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-1.5">
                                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Última Actividad</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-1.5 bg-slate-800 rounded-md">
                                                                    <History className="text-blue-400" size={14} />
                                                                </div>
                                                                <span className="font-semibold text-black text-sm">
                                                                    {formatearFechaLocal(lote.fecha_ultima_modificacion)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Balance Anterior</p>
                                                            <p className="text-xl font-mono font-bold text-blue-800">{lote.stock_anterior} unidades</p>
                                                        </div>
                                                        <div className="space-y-1.5 text-right">
                                                            <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Último Ingreso</p>
                                                            <span className="inline-block text-xl font-black text-emerald-600 bg-emerald-400/10 px-3 py-0.5 rounded-lg border border-emerald-400/20">
                                                                +{lote.ultimo_ingreso}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ✅ PaginacionTabla — ~30 líneas inline → 1 componente con contador rico */}
                <PaginacionTabla
                    paginaActual={pagina}
                    totalPaginas={totalPaginas}
                    onAnterior={() => setPagina(p => Math.max(1, p - 1))}
                    onSiguiente={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    cargando={cargando}
                    contador={
                        <span className="text-sm text-slate-500 font-medium flex items-center gap-2">
                            Mostrando{' '}
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">{desde}</span>
                            {' '}al{' '}
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">{hasta}</span>
                            {' '}de{' '}
                            <span className="font-black text-slate-800">{totalItems}</span>
                        </span>
                    }
                />
            </div>

            <ModalIngresoStock
                isOpen={modalIngresoNuevoAbierto}
                onClose={() => setModalIngresoNuevoAbierto(false)}
                onGuardado={cargarStock}
            />
            <ModalRecargarStock
                isOpen={modalRecargaAbierto}
                onClose={() => setModalRecargaAbierto(false)}
                onGuardado={cargarStock}
                loteInfo={loteParaRecargar}
            />
        </div>
    );
}
// src/views/Bodega.tsx
import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
// import { toast } from 'sonner';
import { useBodega, ALTURA_FILA, varianteALote, obtenerVarianteMasReciente } from '../hooks/useBodega';
import type { FilaTabla } from '../hooks/useBodega';
import ModalIngresoStock from '../components/ModalIngresoStock';
import ModalRecargarStock from '../modales/ModalRecargarStock';
import { formatearFechaLocal } from '../utils/fechas';
import { obtenerHexPorColor } from '../utils/colors';
// import { normalizeError } from '../utils/errors';
import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/common';
import type { BodegaItemVista, ProductoBodega, VarianteBodega } from '../types';
import {
    Layers, PackagePlus, Box, AlertCircle, ChevronDown, ChevronUp,
    Ban, RefreshCcw, Info, Filter, Plus, Package,
    MapPin, Clock, TrendingUp, ArrowUpRight,
} from 'lucide-react';

// ============================================================
// SUB-COMPONENTE: Fila variante (nivel hijo)
// ============================================================

interface FilaVarianteProps {
    variante: VarianteBodega;
    productoPadre: ProductoBodega;
    esUltima: boolean;
    onRecargar: (lote: BodegaItemVista) => void;
}

const FilaVariante = React.memo(function FilaVariante({
    variante,
    productoPadre,
    esUltima,
    onRecargar,
}: FilaVarianteProps) {
    const esCritico = variante.cantidad <= productoPadre.stock_minimo;

    const handleRecargar = useCallback(() => {
        onRecargar(varianteALote(variante, productoPadre));
    }, [variante, productoPadre, onRecargar]);

    return (
        <tr className="group bg-slate-200/80 hover:bg-rose-300/40 transition-colors duration-150">

            {/* Columna 1: Variante + conector lateral */}
            <td className="py-2.5 pr-4 pl-0 relative">
                {/*
                    Conector visual: línea vertical azul lateral.
                    h-1/2 para la última variante (corta en la mitad),
                    h-full para las intermedias (línea completa).
                    Esto es cross-browser — no depende de height:100% en td.
                */}
                <div className={`absolute left-0 top-0 w-[3px] bg-blue-400/60 ${esUltima ? 'h-1/2' : 'h-full'}`} />
                {/* Codo horizontal */}
                <div className="absolute left-0 top-1/2 w-8 h-[2px] bg-blue-400/40 -translate-y-1/2" />

                <div className="flex items-center gap-3 pl-10">
                    {variante.color ? (
                        <>
                            <div
                                className="w-4 h-4 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200 shrink-0"
                                style={{ backgroundColor: obtenerHexPorColor(variante.color, '#e2e8f0') }}
                            />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                {variante.color}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400 italic font-medium">Sin variante de color</span>
                    )}
                </div>
            </td>

            {/* Columna 2: Clasificación (heredada — solo indicador) */}
            <td className="px-4 py-2.5">
                <span className="text-[10px] text-slate-600 font-medium italic">↳ variante</span>
            </td>

            {/* Columna 3: Último ingreso */}
            <td className="px-4 py-2.5">
                <div className="flex flex-col gap-0.5">
                    {variante.fecha_ultima_modificacion ? (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            {formatearFechaLocal(variante.fecha_ultima_modificacion)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-300 italic">Sin movimiento</span>
                    )}
                    {variante.ultimo_ingreso > 0 && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <ArrowUpRight size={11} />+{variante.ultimo_ingreso} último ingreso
                        </span>
                    )}
                </div>
            </td>

            {/* Columna 4: Ubicación */}
            <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600
                                 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wide border border-slate-200">
                    <MapPin size={10} className="text-slate-400 shrink-0" />
                    {variante.ubicacion}
                </span>
            </td>

            {/* Columna 5: Stock del lote */}
            <td className="px-4 py-2.5 text-center">
                <div className="flex flex-col items-center gap-0.5">
                    <div className={`px-3 py-0.5 rounded-lg font-bold text-sm min-w-[44px] text-center border ${esCritico
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                        {variante.cantidad}
                    </div>
                    {esCritico && (
                        <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-0.5">
                            <AlertCircle size={9} />Crítico
                        </span>
                    )}
                </div>
            </td>

            {/* Columna 6: Acción */}
            <td className="px-6 py-2.5">
                <div className="flex justify-center">
                    <button
                        onClick={handleRecargar}
                        className="h-7 w-7 flex items-center justify-center text-blue-600 bg-blue-50
                                   hover:bg-blue-600 hover:text-white rounded-lg transition-all
                                   active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title={`Recargar stock de ${variante.color ?? 'este lote'}`}
                    >
                        <Plus size={15} />
                    </button>
                </div>
            </td>
        </tr>
    );
});

// ============================================================
// SUB-COMPONENTE: Sub-cabecera de variantes
// ============================================================

const FilaSubheader = React.memo(function FilaSubheader({
    nombre, cantidad,
}: { nombre: string; cantidad: number }) {
    return (
        <tr>
            <td colSpan={6} className="py-0">
                <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-blue-500 px-6 py-1.5">
                    <div className="w-[3px] h-4 bg-blue-300/60 rounded-full shrink-0" />
                    <Package size={12} className="text-blue-200 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">
                        {nombre}
                    </span>
                    <span className="ml-auto text-[10px] font-bold text-blue-200 bg-primary px-2 py-0.5 rounded-full">
                        {cantidad} {cantidad === 1 ? 'variante' : 'variantes'}
                    </span>
                </div>
            </td>
        </tr>
    );
});

// ============================================================
// SUB-COMPONENTE: Fila producto padre
// ============================================================

interface FilaProductoProps {
    producto: ProductoBodega;
    expandido: boolean;
    onToggle: () => void;
    onRecargar: (lote: BodegaItemVista) => void;
}

const FilaProducto = React.memo(function FilaProducto({
    producto, expandido, onToggle, onRecargar,
}: FilaProductoProps) {
    const tieneVariantes = producto.variantes.length > 1;
    const unicaVariante = tieneVariantes ? null : (producto.variantes[0] ?? null);
    // Variable derivada antes del return — sin IIFE ni sort()
    const varianteMasReciente = tieneVariantes
        ? obtenerVarianteMasReciente(producto.variantes)
        : null;

    const handleRecargarDirecto = useCallback(() => {
        if (!unicaVariante) return;
        onRecargar(varianteALote(unicaVariante, producto));
    }, [unicaVariante, producto, onRecargar]);

    return (
        <tr
            className={`group transition-colors duration-150 border-b border-slate-100
                ${tieneVariantes ? 'cursor-pointer' : ''}
                ${expandido ? 'bg-blue-200 border-b-blue-200' : 'hover:bg-slate-50/80'}`}
            onClick={tieneVariantes ? onToggle : undefined}
        >
            {/* Columna 1: Nombre + SKU */}
            <td className="px-6 py-3.5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                        {tieneVariantes && (
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center
                                             transition-all duration-200 shrink-0
                                             ${expandido
                                    ? 'bg-blue-400 text-white shadow-md shadow-blue-200'
                                    : 'bg-slate-200 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </div>
                        )}
                        <span className={`font-bold text-sm leading-snug transition-colors
                                          ${tieneVariantes
                                ? 'text-slate-800 group-hover:text-blue-700'
                                : 'text-slate-700 pl-7'}`}>
                            {producto.producto_nombre}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500
                                         px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">
                            {producto.sku}
                        </span>
                        {producto.es_vehiculo === 1 && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700
                                              px-1.5 py-0.5 rounded uppercase tracking-wide">
                                Vehículo
                            </span>
                        )}
                    </div>
                </div>
            </td>

            {/* Columna 2: Clasificación */}
            <td className="px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-700 leading-tight">
                        {producto.categoria_nombre ?? 'Sin Categoría'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                        {producto.marca_nombre ?? 'Genérico'}
                    </span>
                </div>
            </td>

            {/* Columna 3: Último ingreso */}
            <td className="px-4 py-3.5">
                {tieneVariantes ? (
                    <div className="flex flex-col gap-0.5">
                        {varianteMasReciente ? (
                            <>
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400 shrink-0" />
                                    {formatearFechaLocal(varianteMasReciente.fecha_ultima_modificacion!)}
                                </span>
                                <span className="text-[11px] text-slate-400 italic">Ver variantes ↓</span>
                            </>
                        ) : (
                            <span className="text-xs text-slate-300 italic">Sin movimiento</span>
                        )}
                    </div>
                ) : unicaVariante ? (
                    <div className="flex flex-col gap-0.5">
                        {unicaVariante.fecha_ultima_modificacion ? (
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <Clock size={11} className="text-slate-400 shrink-0" />
                                {formatearFechaLocal(unicaVariante.fecha_ultima_modificacion)}
                            </span>
                        ) : (
                            <span className="text-xs text-slate-300 italic">Sin movimiento</span>
                        )}
                        {unicaVariante.ultimo_ingreso > 0 && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <ArrowUpRight size={11} />+{unicaVariante.ultimo_ingreso} último ingreso
                            </span>
                        )}
                    </div>
                ) : null}
            </td>

            {/* Columna 4: Ubicación */}
            <td className="px-4 py-3.5">
                {tieneVariantes ? (
                    <span className="text-xs text-slate-400 italic font-medium flex items-center gap-1.5">
                        <MapPin size={11} className="text-slate-300" />
                        {producto.variantes.length} ubicaciones
                    </span>
                ) : unicaVariante ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600
                                     bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wide border border-slate-200">
                        <MapPin size={10} className="text-slate-400 shrink-0" />
                        {unicaVariante.ubicacion}
                    </span>
                ) : null}
            </td>

            {/* Columna 5: Stock total */}
            <td className="px-4 py-3.5 text-center">
                <div className="flex flex-col items-center gap-1">
                    <div className={`px-3 py-1 rounded-lg font-bold text-base
                                     min-w-[52px] text-center shadow-sm border
                                     ${producto.stock_critico
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {producto.stock_total}
                    </div>
                    {producto.stock_critico && (
                        <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                            <AlertCircle size={9} />Stock bajo
                        </span>
                    )}
                    {tieneVariantes && (
                        <span className="text-[9px] text-slate-400 font-medium">
                            {producto.variantes.length} lotes
                        </span>
                    )}
                </div>
            </td>

            {/* Columna 6: Acción */}
            <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center">
                    {tieneVariantes ? (
                        <button
                            onClick={onToggle}
                            className={`h-8 px-3 flex items-center gap-1.5 rounded-lg font-bold
                                        transition-all text-xs focus:outline-none focus:ring-2 focus:ring-blue-400
                                        ${expandido
                                    ? 'bg-blue-400 text-white shadow-md shadow-blue-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={expandido ? 'Colapsar' : 'Ver variantes'}
                        >
                            <Package size={13} />
                            {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                    ) : (
                        <button
                            onClick={handleRecargarDirecto}
                            className="h-8 w-8 flex items-center justify-center text-blue-600
                                       bg-blue-50 hover:bg-blue-600 hover:text-white
                                       rounded-lg transition-all active:scale-90
                                       focus:outline-none focus:ring-2 focus:ring-blue-400"
                            title="Recargar Stock"
                        >
                            <Plus size={17} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

// ============================================================
// FUNCIÓN AUXILIAR: renderizar una fila virtual
// Extraída del JSX para mantener el render principal limpio
// ============================================================

function renderFila(
    fila: FilaTabla,
    expandidos: Set<string>,
    onToggle: (id: string) => void,
    onRecargar: (lote: BodegaItemVista) => void,
) {
    if (fila.tipo === 'producto') {
        return (
            <FilaProducto
                key={`p-${fila.producto.producto_id}`}
                producto={fila.producto}
                expandido={expandidos.has(fila.producto.producto_id)}
                onToggle={() => onToggle(fila.producto.producto_id)}
                onRecargar={onRecargar}
            />
        );
    }
    if (fila.tipo === 'subheader') {
        return (
            <FilaSubheader
                key={`sh-${fila.productoId}`}
                nombre={fila.nombre}
                cantidad={fila.cantidad}
            />
        );
    }
    // tipo === 'variante'
    const hermanas = fila.padre.variantes;
    const esUltima = fila.variante.lote_id === hermanas[hermanas.length - 1].lote_id;
    return (
        <FilaVariante
            key={`v-${fila.variante.lote_id}`}
            variante={fila.variante}
            productoPadre={fila.padre}
            esUltima={esUltima}
            onRecargar={onRecargar}
        />
    );
}

// ============================================================
// VISTA PRINCIPAL — pure render, toda la lógica en useBodega
// ============================================================

export default function Bodega() {
    const {
        productos, filasAplanadas, categorias, marcas,
        cargando, errorVista, expandidos,
        busquedaInput, categoriaFiltro, marcaFiltro,
        pagina, totalPaginas, desde, hasta, totalItems,
        modalIngresoNuevoAbierto, modalRecargaAbierto, loteParaRecargar,
        categoriaSeleccionada, sinMarcasEnCategoria,
        cargarStock, toggleExpandido, abrirModalRecarga,
        setBusquedaInput, setCategoriaFiltro, setMarcaFiltro, setPagina,
        setModalIngresoNuevoAbierto, setModalRecargaAbierto,
    } = useBodega();

    // ── Virtualizador ─────────────────────────────────────────────────────────
    //
    // scrollContainerRef → el div con overflow:auto (scroll container real).
    // El virtualizador NECESITA este elemento para calcular el viewport.
    // NO usar tbodyRef — el tbody no tiene overflow y el virtualizer no ve el scroll.
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: filasAplanadas.length,
        getScrollElement: () => scrollContainerRef.current,
        // estimateSize sin dependencia de filasAplanadas:
        // Lee el tipo de la fila en tiempo de ejecución → O(1), referencia estable.
        estimateSize: useCallback(
            (i: number) => ALTURA_FILA[filasAplanadas[i]?.tipo ?? 'producto'],
            [filasAplanadas],
        ),
        overscan: 8,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    // Espaciadores: alturas del área no renderizada arriba y abajo de las filas visibles
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-2 md:p-2 max-w-[1400px] mx-auto font-sans text-slate-900 animate-in fade-in duration-500">

            {/* ── Header ────────────────────────────────────────────────────────── */}
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
                        className="flex-1 lg:flex-none bg-slate-800 text-white px-5 py-2.5 rounded-lg
                                   hover:bg-blue-800 flex items-center justify-center gap-3 font-bold
                                   shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        <PackagePlus size={20} /> Ingresar Mercadería
                    </button>
                </div>
            </div>

            {errorVista && (
                <ErrorBanner mensaje={errorVista} onReintentar={cargarStock} className="mb-6" />
            )}

            {/* ── Filtros ───────────────────────────────────────────────────────── */}
            <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-100 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <BuscadorInput
                        value={busquedaInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusquedaInput(e.target.value)}
                        onLimpiar={() => setBusquedaInput('')}
                        placeholder="Buscar por SKU, nombre o clasificación..."
                        cargando={cargando}
                        rounded="2xl"
                        className="flex-1 min-w-[300px]"
                    />

                    {/* Selector de categoría */}
                    <div className="relative w-full md:w-60">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={categoriaFiltro}
                            onChange={e => { setCategoriaFiltro(e.target.value); setPagina(1); }}
                            className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-300 rounded-2xl
                                       appearance-none outline-none font-semibold text-slate-700 cursor-pointer
                                       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                            <option value="">Todas las Categorías</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    {/* Selector de marca */}
                    <div
                        className={`relative w-full md:w-60 ${sinMarcasEnCategoria ? 'cursor-not-allowed' : ''}`}
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
                            className={`w-full pl-11 pr-10 py-2.5 rounded-2xl appearance-none outline-none
                                        font-semibold transition-all border border-slate-300
                                        ${!categoriaSeleccionada
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'bg-white text-slate-700 cursor-pointer'}
                                        ${sinMarcasEnCategoria
                                    ? 'border-red-300 text-red-400'
                                    : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
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

            {/* ── Tabla con scroll virtualizado ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">

                {/* Overlay de carga incremental */}
                {cargando && productos.length > 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
                        <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-blue-600 border border-blue-50">
                            <RefreshCcw size={20} className="animate-spin" /> Actualizando...
                        </div>
                    </div>
                )}

                {/*
                    SCROLL CONTAINER — ref conectado al virtualizador.
                    Es el único elemento con overflow:auto en esta jerarquía.
                    El virtualizador mide su altura para calcular las filas visibles.
                */}
                <div
                    ref={scrollContainerRef}
                    className="overflow-auto"
                    style={{ maxHeight: 'calc(100vh - 340px)', minHeight: '400px' }}
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-primary border-b-2 border-slate-200 text-slate-400
                                           text-xs tracking-wider font-bold uppercase">
                                <th className="px-6 py-3.5">Producto / Identificación</th>
                                <th className="px-4 py-3.5">Clasificación</th>
                                <th className="px-4 py-3.5">
                                    <span className="flex items-center gap-1.5">
                                        <TrendingUp size={13} className="text-emerald-500" />
                                        Último Ingreso
                                    </span>
                                </th>
                                <th className="px-4 py-3.5">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-blue-400" />
                                        Ubicación
                                    </span>
                                </th>
                                <th className="px-4 py-3.5 text-center">Stock</th>
                                <th className="px-6 py-3.5 text-center">Acción</th>
                            </tr>
                        </thead>

                        {/*
                            TBODY SIN display:flex — mantiene display:table-row-group (default HTML).
                            Esto garantiza que las <td> se alineen con los <th> del thead.

                            ESPACIADORES con TR vacíos:
                            - paddingTop:    altura del área no renderizada ARRIBA (filas antes del viewport)
                            - paddingBottom: altura del área no renderizada ABAJO (filas después del viewport)

                            Por qué TR espaciadores y no paddingTop/paddingBottom en tbody:
                            - paddingTop en tbody con display:table-row-group no empuja las filas (CSS limitación)
                            - paddingTop en tbody con display:flex/block rompe el layout de tabla
                            - TR vacíos son el único mecanismo que funciona en tablas HTML estándar
                            - Guards (length > 0) previenen crash cuando virtualItems está vacío
                        */}
                        <tbody>
                            {productos.length === 0 && !cargando ? (
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
                                <>
                                    {/* Espaciador superior — simula el scroll de filas no renderizadas arriba */}
                                    {paddingTop > 0 && (
                                        <tr><td colSpan={6} style={{ height: paddingTop }} /></tr>
                                    )}

                                    {/* Filas virtuales — solo las visibles + overscan */}
                                    {virtualItems.map(virtualRow => {
                                        const fila = filasAplanadas[virtualRow.index];
                                        if (!fila) return null;
                                        return renderFila(fila, expandidos, toggleExpandido, abrirModalRecarga);
                                    })}

                                    {/* Espaciador inferior — simula el scroll de filas no renderizadas abajo */}
                                    {paddingBottom > 0 && (
                                        <tr><td colSpan={6} style={{ height: paddingBottom }} /></tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

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
                            {' '}productos
                        </span>
                    }
                />
            </div>

            {/* ── Modales ───────────────────────────────────────────────────────── */}
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
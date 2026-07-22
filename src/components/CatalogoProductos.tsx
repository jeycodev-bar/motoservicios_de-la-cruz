// src/components/CatalogoProductos.tsx
import { useCallback, useRef, memo, useState, useEffect } from 'react'; // ✅ Eliminado useMemo
import { Bike, Layers, ChevronRight, PackageOpen, Loader } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { Categoria, Marca } from '../types';
import type { ProductoCatalogoUI, VarianteProducto } from '../services/ventas_service';
import { BuscadorInput } from '../components/common';
import { obtenerHexPorColor } from '../utils/colors'; // ✅ Ahora sí se usará

// ==========================================
// TIPOS LOCALES
// ==========================================

type TarjetaProps = {
    prod: ProductoCatalogoUI;
    onAgregarAlCarrito: (v: VarianteProducto, p: ProductoCatalogoUI) => void;
    onSeleccionarVariante: (p: ProductoCatalogoUI) => void;
    stockReservado: number;
};

interface Props {
    busqueda: string;
    setBusqueda: (val: string) => void;
    categorias: Categoria[];
    filtroCategoriaId: string;
    setFiltroCategoriaId: (id: string) => void;
    marcas: Marca[];
    filtroMarcaId: string;
    setFiltroMarcaId: (id: string) => void;
    productosAgrupados: ProductoCatalogoUI[];
    onAgregarAlCarrito: (variante: VarianteProducto, producto: ProductoCatalogoUI) => void;
    onSeleccionarVariante: (productoAgrupado: ProductoCatalogoUI) => void;
    cargarMasItems: () => void;
    hasMore: boolean;
    cargandoCatalogo: boolean;
    stockEnCarrito?: Map<string, number>;
}

// ==========================================
// COMPONENTE: Tarjeta de Producto (MEMORIZADO PURO)
// ==========================================

const TarjetaProducto = memo(function TarjetaProducto({
    prod, onAgregarAlCarrito, onSeleccionarVariante, stockReservado
}: TarjetaProps) {
    const tieneVariantes = prod.variantes.length > 1;
    const primeraVariante = prod.variantes[0];
    const esVehiculo = prod.es_vehiculo === 1;

    const stockDisponibleVisual = prod.cantidad_total - stockReservado;

    const handleClick = useCallback(() => {
        if (stockDisponibleVisual <= 0 && !tieneVariantes) return;
        if (tieneVariantes) {
            onSeleccionarVariante(prod);
        } else if (primeraVariante) {
            onAgregarAlCarrito(primeraVariante, prod);
        }
    }, [tieneVariantes, onSeleccionarVariante, onAgregarAlCarrito, prod, primeraVariante, stockDisponibleVisual]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    }, [handleClick]);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={`bg-white border-2 border-transparent hover:border-blue-400 p-3 rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative h-full min-h-[190px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${stockDisponibleVisual <= 0 ? 'opacity-60 grayscale-[0.5] hover:border-red-400 cursor-not-allowed' : ''}`}
        >
            {tieneVariantes && (
                <div className="absolute -top-2 -right-2 bg-blue-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 z-10">
                    <Layers size={10} />
                    {prod.variantes.length} {esVehiculo ? 'Colores' : 'Opciones'}
                </div>
            )}

            <div>
                <div className="flex justify-between items-start mb-2 gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md truncate max-w-[60%]">
                        {prod.marca_nombre ?? 'S/M'}
                    </span>

                    <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${stockDisponibleVisual > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            Stk: {stockDisponibleVisual}
                        </span>
                        {stockReservado > 0 && (
                            <span className="text-[9px] font-bold text-orange-600 mt-1 bg-orange-100 px-1.5 py-0.5 rounded shadow-sm">
                                {stockReservado} en carrito
                            </span>
                        )}
                    </div>
                </div>

                <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {prod.producto_nombre}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                    {esVehiculo && <Bike size={14} className="text-amber-500" />}
                    {prod.sku && <p className="text-[11px] text-slate-400 font-mono">{prod.sku}</p>}
                </div>

                {/* ✅ REINTEGRAMOS LOS CIRCULITOS DE COLORES QUE HABÍAN SIDO OMITIDOS */}
                {esVehiculo && prod.variantes.length > 0 && (
                    <div className="flex gap-1 mt-3 items-center">
                        {prod.variantes.slice(0, 5).map(v => (
                            <div
                                key={v.lote_id}
                                title={v.color ?? 'Sin color'}
                                className="w-4 h-4 rounded-full border-2 border-white shadow-md shrink-0 ring-1 ring-slate-200"
                                style={{ backgroundColor: obtenerHexPorColor(v.color, '#ffffff') }}
                            />
                        ))}
                        {prod.variantes.length > 5 && (
                            <span className="text-[10px] text-slate-500 font-medium ml-1">
                                +{prod.variantes.length - 5}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className="text-sm font-black text-green-600">
                    S/ {prod.precio_venta_referencial?.toFixed(2)}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${stockDisponibleVisual <= 0 && !tieneVariantes ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
});
TarjetaProducto.displayName = 'TarjetaProducto';

// ==========================================
// COMPONENTE PRINCIPAL (ORQUESTADOR)
// ==========================================

const CatalogoProductos = memo(function CatalogoProductos({
    busqueda, setBusqueda,
    categorias, filtroCategoriaId, setFiltroCategoriaId, // ✅ Usados
    marcas, filtroMarcaId, setFiltroMarcaId,             // ✅ Usados
    productosAgrupados, onAgregarAlCarrito, onSeleccionarVariante,
    cargarMasItems, hasMore, cargandoCatalogo, stockEnCarrito
}: Props) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [columnas, setColumnas] = useState(2);

    useEffect(() => {
        const elementoParent = parentRef.current;
        if (!elementoParent) return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            if (width >= 1280) setColumnas(4);
            else if (width >= 1024) setColumnas(3);
            else setColumnas(3);
        });
        observer.observe(elementoParent);
        return () => observer.disconnect();
    }, []);

    const cantidadFilas = Math.ceil(productosAgrupados.length / columnas);
    const filaAdicional = hasMore || cargandoCatalogo ? 1 : 0;

    const rowVirtualizer = useVirtualizer({
        count: cantidadFilas + filaAdicional,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 210, // Un poco más alto para compensar los círculos de colores
        overscan: 2,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    useEffect(() => {
        const ultimaFilaVisible = virtualItems[virtualItems.length - 1];
        if (!ultimaFilaVisible) return;
        if (ultimaFilaVisible.index >= cantidadFilas - 1 && hasMore && !cargandoCatalogo) {
            cargarMasItems();
        }
    }, [virtualItems, cantidadFilas, hasMore, cargandoCatalogo, cargarMasItems]);

    const handleBusquedaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setBusqueda(e.target.value);
    }, [setBusqueda]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* ── BARRA DE FILTROS COMPLETAMENTE REINTEGRADA ── */}
            <div className="p-4 bg-white border-b border-slate-200 shrink-0 space-y-3 z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-2">
                    <PackageOpen className="text-blue-600" /> Catálogo Rápido de Productos
                </h2>
                <BuscadorInput
                    value={busqueda} onChange={handleBusquedaChange} onLimpiar={() => setBusqueda('')}
                    placeholder="Buscar por nombre, modelo o SKU..." rounded="lg" className="w-full"
                    inputClassName="border-2 border-slate-200 focus:border-blue-500 py-2"
                />

                {/* Chips de categoría */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button" onClick={() => setFiltroCategoriaId('TODOS')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filtroCategoriaId === 'TODOS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        TODOS
                    </button>
                    {categorias.map(cat => (
                        <button
                            key={cat.id} type="button" onClick={() => setFiltroCategoriaId(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filtroCategoriaId === cat.id ? 'bg-blue-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {cat.nombre}
                        </button>
                    ))}
                </div>

                {/* Chips de marca */}
                {filtroCategoriaId !== 'TODOS' && marcas.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-2 border-t border-slate-100 pt-2">
                        <button
                            type="button" onClick={() => setFiltroMarcaId('TODAS')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filtroMarcaId === 'TODAS' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                        >
                            TODAS LAS MARCAS
                        </button>
                        {marcas.map(marca => (
                            <button
                                key={marca.id} type="button" onClick={() => setFiltroMarcaId(marca.id)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filtroMarcaId === marca.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                            >
                                {marca.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── ZONA DE GRID VIRTUALIZADO ── */}
            <div ref={parentRef} className="flex-1 overflow-y-auto p-4 relative">
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {virtualItems.map((virtualRow) => {
                        const isLoaderRow = virtualRow.index >= cantidadFilas;
                        return (
                            <div
                                key={virtualRow.key}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%',
                                    height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: '16px',
                                }}
                            >
                                {isLoaderRow ? (
                                    <div className="w-full h-full flex justify-center items-center">
                                        {cargandoCatalogo ? (
                                            <div className="flex items-center gap-2 text-blue-600 bg-white px-4 py-2 rounded-full shadow-sm border border-blue-100">
                                                <Loader className="animate-spin" size={18} />
                                                <span className="text-sm font-bold">Cargando...</span>
                                            </div>
                                        ) : !hasMore && productosAgrupados.length === 0 ? (
                                            <span className="text-sm text-slate-500 font-medium">Sin resultados</span>
                                        ) : (
                                            <span className="text-sm text-slate-400 font-medium">No hay más productos</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid gap-4 w-full h-full" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
                                        {Array.from({ length: columnas }).map((_, colIndex) => {
                                            const itemIndex = virtualRow.index * columnas + colIndex;
                                            const prod = productosAgrupados[itemIndex];

                                            if (!prod) return <div key={`empty-${itemIndex}`} />;

                                            const stockReservado = prod.variantes.reduce(
                                                (sum, v) => sum + (stockEnCarrito?.get(v.lote_id) ?? 0), 0
                                            );

                                            return (
                                                <TarjetaProducto
                                                    key={prod.producto_id}
                                                    prod={prod}
                                                    stockReservado={stockReservado}
                                                    onAgregarAlCarrito={onAgregarAlCarrito}
                                                    onSeleccionarVariante={onSeleccionarVariante}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
CatalogoProductos.displayName = 'CatalogoProductos';
export default CatalogoProductos;
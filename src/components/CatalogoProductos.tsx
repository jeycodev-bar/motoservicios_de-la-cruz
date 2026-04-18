// src/components/CatalogoProductos.tsx
import { useCallback, useRef, memo } from 'react';
import { Search, Bike, Layers, ChevronRight, PackageOpen, Loader } from 'lucide-react';

import type { Categoria, Marca } from '../types';
import type { ProductoCatalogoUI, VarianteProducto } from '../services/ventas_service';
import { BuscadorInput } from '../components/common';

// ✅ Ruta adaptada: utils/colors (nombre elegido por el equipo)
//    Nueva firma: obtenerHexPorColor(color, fallback?) — fallback como argumento,
//    sin necesidad del operador ?? en el llamador.
import { obtenerHexPorColor } from '../utils/colors';

// ==========================================
// TIPOS LOCALES
// ==========================================

type TarjetaProps = {
    prod: ProductoCatalogoUI;
    onAgregarAlCarrito: (v: VarianteProducto, p: ProductoCatalogoUI) => void;
    onSeleccionarVariante: (p: ProductoCatalogoUI) => void;
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
}

// ==========================================
// COMPONENTE: Tarjeta de Producto (MEMORIZADO)
// ==========================================

const TarjetaProducto = memo(function TarjetaProducto({
    prod,
    onAgregarAlCarrito,
    onSeleccionarVariante,
}: TarjetaProps) {
    const tieneVariantes = prod.variantes.length > 1;
    const primeraVariante = prod.variantes[0];
    const esVehiculo = prod.es_vehiculo === 1; // ✨ Variable semántica extraída

    const handleClick = useCallback(() => {
        if (tieneVariantes) {
            onSeleccionarVariante(prod);
        } else if (primeraVariante) {
            onAgregarAlCarrito(primeraVariante, prod);
        }
    }, [tieneVariantes, onSeleccionarVariante, onAgregarAlCarrito, prod, primeraVariante]);

    return (
        <div
            onClick={handleClick}
            className="bg-white border-2 border-transparent hover:border-blue-400 p-3 rounded-xl shadow-sm cursor-pointer transition-all flex flex-col justify-between group relative"
        >
            {/* ✨ CORRECCIÓN 1: El Badge flotante */}
            {tieneVariantes && (
                <div className="absolute -top-2 -right-2 bg-blue-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 z-10 animate-bounce-short">
                    <Layers size={10} />
                    {prod.variantes.length} {esVehiculo ? 'Colores' : 'Opciones'}
                </div>
            )}

            <div>
                <div className="flex justify-between items-start mb-2 gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md truncate max-w-[60%]">
                        {prod.marca_nombre ?? 'S/M'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${prod.cantidad_total > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        Stk: {prod.cantidad_total}
                    </span>
                </div>

                <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">
                    {prod.producto_nombre}
                </h3>

                <div className="flex items-center gap-2 mt-1">
                    {esVehiculo && <Bike size={14} className="text-amber-500" />}
                    {prod.sku && <p className="text-[11px] text-slate-400 font-mono">{prod.sku}</p>}
                </div>

                {/* ✨ CORRECCIÓN 2: Renderizado Condicional Estricto */}
                {/* Solo se crea el DOM de colores si ES vehículo y TIENE variantes */}
                {esVehiculo && prod.variantes.length > 0 && (
                    <div className="flex gap-1 mt-3 items-center">
                        {prod.variantes.slice(0, 5).map(v => (
                            <div
                                key={v.lote_id}
                                title={v.color ?? 'Sin color'}
                                // shrink-0 previene que flexbox deforme los círculos a óvalos
                                className="w-3.5 h-3.5 rounded border border-slate-300 shadow-inner shrink-0"
                                style={{
                                    backgroundColor: obtenerHexPorColor(v.color, '#ffffff'),
                                }}
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

            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                <span className="text-sm font-black text-green-600">
                    S/ {prod.precio_venta_referencial?.toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
});

TarjetaProducto.displayName = 'TarjetaProducto';

// ==========================================
// COMPONENTE PRINCIPAL (MEMORIZADO)
//
// El buscador de texto es un CASO ESPECIAL: está estructuralmente
// acoplado al panel de filtros de categorías y marcas con scroll
// infinito propio — no se extrae a <BuscadorInput />.
// ==========================================

const CatalogoProductos = memo(function CatalogoProductos({
    busqueda,
    setBusqueda,
    categorias,
    filtroCategoriaId,
    setFiltroCategoriaId,
    marcas,
    filtroMarcaId,
    setFiltroMarcaId,
    productosAgrupados,
    onAgregarAlCarrito,
    onSeleccionarVariante,
    cargarMasItems,
    hasMore,
    cargandoCatalogo,
}: Props) {
    const observer = useRef<IntersectionObserver | null>(null);

    // IntersectionObserver para scroll infinito — paginación automática al llegar al final
    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (cargandoCatalogo) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) cargarMasItems();
        }, { rootMargin: '100px' });
        if (node) observer.current.observe(node);
    }, [cargandoCatalogo, hasMore, cargarMasItems]);

    const handleBusquedaChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value),
        [setBusqueda]
    );

    return (
        <div className="flex-1 flex flex-col bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Barra de filtros */}
            <div className="p-4 bg-white border-b border-slate-200 shrink-0 space-y-3">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-2">
                    <PackageOpen className="text-blue-600" /> Catálogo Rápido de Productos
                </h2>

                {/* Buscador inline — acoplado al panel de filtros, no extraíble */}
                {/* <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, modelo o SKU..."
                        value={busqueda}
                        onChange={handleBusquedaChange}
                        className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none transition-colors"
                    />
                </div> */}
                {/* Usa <BuscadorInput /> con estilos adaptados al panel de filtros */}
                <BuscadorInput
                    value={busqueda}
                    onChange={handleBusquedaChange}
                    onLimpiar={() => setBusqueda('')}
                    placeholder="Buscar por nombre, modelo o SKU..."
                    rounded="lg"
                    className="w-full"
                    inputClassName="border-2 border-slate-200 focus:border-blue-500 py-2"
                />

                {/* Chips de categoría */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        type="button"
                        onClick={() => setFiltroCategoriaId('TODOS')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filtroCategoriaId === 'TODOS'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        TODOS
                    </button>
                    {categorias.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setFiltroCategoriaId(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filtroCategoriaId === cat.id
                                ? 'bg-blue-800 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {cat.nombre}
                        </button>
                    ))}
                </div>

                {/* Chips de marca — visible solo si hay categoría seleccionada */}
                {filtroCategoriaId !== 'TODOS' && marcas.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mt-2 border-t border-slate-100 pt-2">
                        <button
                            type="button"
                            onClick={() => setFiltroMarcaId('TODAS')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filtroMarcaId === 'TODAS'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                        >
                            TODAS LAS MARCAS
                        </button>
                        {marcas.map(marca => (
                            <button
                                key={marca.id}
                                type="button"
                                onClick={() => setFiltroMarcaId(marca.id)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filtroMarcaId === marca.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                            >
                                {marca.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto p-4 relative">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {productosAgrupados.map(prod => (
                        <TarjetaProducto
                            key={prod.producto_id}
                            prod={prod}
                            onAgregarAlCarrito={onAgregarAlCarrito}
                            onSeleccionarVariante={onSeleccionarVariante}
                        />
                    ))}
                </div>

                {/* Sentinel para IntersectionObserver */}
                <div ref={sentinelRef} className="w-full flex justify-center items-center py-6 mt-4">
                    {cargandoCatalogo && (
                        <div className="flex items-center gap-2 text-blue-600 bg-white px-4 py-2 rounded-full shadow-sm border border-blue-100">
                            <Loader className="animate-spin" size={18} />
                            <span className="text-sm font-bold">Cargando más productos...</span>
                        </div>
                    )}
                    {!hasMore && productosAgrupados.length > 0 && (
                        <span className="text-sm text-slate-400 font-medium">No hay más productos</span>
                    )}
                    {!hasMore && productosAgrupados.length === 0 && !cargandoCatalogo && (
                        <span className="text-sm text-slate-500 font-medium">Sin resultados</span>
                    )}
                </div>
            </div>
        </div>
    );
});

CatalogoProductos.displayName = 'CatalogoProductos';

export default CatalogoProductos;
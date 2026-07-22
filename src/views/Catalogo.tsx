// src/views/Catalogo.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CatalogoService } from '../services/catalogo_service';
import { MaestrosService } from '../services/maestros_service';
import ModalNuevoProducto from '../components/ModalNuevoProducto';
import ModalEditarProducto from '../components/ModalEditarProducto';
import ModalConfirmacion from '../modales/ModalConfirmacion';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

// ✅ Componentes UI compartidos
import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/common';

import type { ProductoVista, Categoria, Marca } from '../types';

import { Trash2, Package, Edit2, PackagePlus, Filter } from 'lucide-react';

const LIMITE = 10;

export default function Catalogo() {

    const [productos, setProductos] = useState<ProductoVista[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [cargando, setCargando] = useState(false);
    const [errorVista, setErrorVista] = useState<string | null>(null);

    const [busquedaInput, setBusquedaInput] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');

    const busquedaActiva = useDebounce(busquedaInput, 500);

    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState<ProductoVista | null>(null);
    const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
    const [productoAEliminar, setProductoAEliminar] = useState<ProductoVista | null>(null);
    const [procesandoEliminacion, setProcesandoEliminacion] = useState(false);

    useEffect(() => {
        MaestrosService.obtenerCategorias()
            .then(setCategorias)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar categorías')));
    }, []);

    useEffect(() => {
        setMarcas([]);
        setFiltroMarca('');
        if (!filtroCategoria) return;
        MaestrosService.obtenerMarcasPorCategoria(filtroCategoria)
            .then(setMarcas)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar marcas')));
    }, [filtroCategoria]);

    useEffect(() => { setPaginaActual(1); }, [busquedaActiva, filtroCategoria, filtroMarca]);

    const cargarProductos = useCallback(async () => {
        setCargando(true);
        setErrorVista(null);
        try {
            const result = await CatalogoService.obtenerProductosPaginados(
                busquedaActiva || null,
                filtroCategoria || null,
                filtroMarca || null,
                paginaActual,
                LIMITE
            );
            setProductos(result.data);
            setTotalRegistros(result.total);
            setTotalPaginas(Math.ceil(result.total / LIMITE) || 1);
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al cargar el catálogo');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    }, [busquedaActiva, filtroCategoria, filtroMarca, paginaActual]);

    useEffect(() => { cargarProductos(); }, [cargarProductos]);

    const handleEditar = (producto: ProductoVista) => {
        setProductoAEditar(producto);
        setModalEditarAbierto(true);
    };

    const solicitarEliminacion = (producto: ProductoVista) => {
        setProductoAEliminar(producto);
        setModalEliminarAbierto(true);
    };

    const confirmarEliminacion = async () => {
        if (!productoAEliminar) return;
        setProcesandoEliminacion(true);
        try {
            await CatalogoService.eliminarProducto(productoAEliminar.id);
            toast.success(`Producto "${productoAEliminar.nombre}" eliminado correctamente`);
            setModalEliminarAbierto(false);
            setProductoAEliminar(null);
            if (productos.length === 1 && paginaActual > 1) {
                setPaginaActual(p => p - 1);
            } else {
                cargarProductos();
            }
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al eliminar el producto'));
        } finally {
            setProcesandoEliminacion(false);
        }
    };

    return (
        <div className="p-2 max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">

            {/* Header */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Package className="text-blue-600" size={32} strokeWidth={2.5} />
                        </div>
                        Catálogo Central
                    </h1>
                    <p className="text-slate-500">Administra los modelos base de tus productos y vehículos.</p>
                </div>
                <button
                    onClick={() => setModalAbierto(true)}
                    className="bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 flex items-center gap-2 font-bold shadow-sm transition-all active:scale-95"
                >
                    <PackagePlus size={20} /> Nuevo Producto
                </button>
            </div>

            {/* ✅ ErrorBanner */}
            {errorVista && (
                <ErrorBanner mensaje={errorVista} onReintentar={cargarProductos} className="mb-4" />
            )}

            {/* Barra de herramientas */}
            <div className="mb-4 flex flex-col lg:flex-row gap-3 shrink-0">

                {/* ✅ BuscadorInput */}
                <BuscadorInput
                    value={busquedaInput}
                    onChange={e => setBusquedaInput(e.target.value)}
                    onLimpiar={() => setBusquedaInput('')}
                    placeholder="Buscar por nombre, modelo o SKU..."
                    rounded="lg"
                    className="flex-1 lg:max-w-md"
                />

                <div className="flex flex-1 sm:flex-row flex-col gap-3">
                    <div className="relative flex-1 lg:max-w-xs flex items-center">
                        <Filter className="absolute left-3 text-slate-400 pointer-events-none" size={18} />
                        <select
                            value={filtroCategoria}
                            onChange={e => setFiltroCategoria(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-slate-700 font-medium"
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 lg:max-w-xs flex items-center">
                        <Filter className={`absolute left-3 ${filtroCategoria ? 'text-slate-400' : 'text-slate-300'} pointer-events-none transition-colors`} size={18} />
                        <select
                            value={filtroMarca}
                            onChange={e => setFiltroMarca(e.target.value)}
                            disabled={!filtroCategoria || marcas.length === 0}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer text-slate-700 font-medium disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                        >
                            <option value="">
                                {!filtroCategoria
                                    ? 'Seleccione categoría primero'
                                    : marcas.length === 0 ? 'Sin marcas disponibles' : 'Todas las marcas'}
                            </option>
                            {marcas.map(marca => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 bg-primary border-b z-10 shadow-sm">
                            <tr className="text-slate-400 text-sm">
                                <th className="p-4 font-bold">SKU</th>
                                <th className="p-4 font-bold">Categoría / Marca</th>
                                <th className="p-4 font-bold">Nombre / Modelo</th>
                                <th className="p-4 font-bold">Tipo</th>
                                <th className="p-4 font-bold">Precio Venta</th>
                                <th className="p-4 font-bold text-center w-28">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {cargando ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="font-medium">Cargando catálogo...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : productos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        <Package className="mx-auto mb-2 text-slate-300" size={48} />
                                        <p className="font-medium text-lg">No se encontraron productos.</p>
                                        {(busquedaActiva || filtroCategoria || filtroMarca) && (
                                            <p className="text-sm mt-1">Intenta ajustando los filtros de búsqueda.</p>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                productos.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-sm text-slate-500 font-semibold">{p.sku}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">
                                                {p.categoria_nombre || <span className="text-slate-400 italic">Sin Categoría</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium">{p.marca_nombre || 'Sin Marca'}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-slate-800">{p.nombre}</p>
                                            {p.modelo && <p className="text-xs text-slate-500">Mod: {p.modelo}</p>}
                                        </td>
                                        <td className="p-4">
                                            {p.es_vehiculo === 1
                                                ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold shadow-sm">Vehículo</span>
                                                : <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">General</span>
                                            }
                                        </td>
                                        <td className="p-4 font-bold text-emerald-600">
                                            S/ {p.precio_venta_referencial.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => handleEditar(p)}
                                                    className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors border border-blue-100"
                                                    title="Editar Producto"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => solicitarEliminacion(p)}
                                                    className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors border border-red-100"
                                                    title="Eliminar Producto"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ✅ PaginacionTabla */}
                <PaginacionTabla
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    onAnterior={() => setPaginaActual(p => Math.max(1, p - 1))}
                    onSiguiente={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    cargando={cargando}
                    contador={`Página ${paginaActual} de ${totalPaginas} · Total: ${totalRegistros} ítems`}
                />
            </div>

            {/* Modales */}
            <div className="shrink-0">
                <ModalNuevoProducto
                    isOpen={modalAbierto}
                    onClose={() => setModalAbierto(false)}
                    onGuardado={cargarProductos}
                />
                {productoAEditar && (
                    <ModalEditarProducto
                        isOpen={modalEditarAbierto}
                        onClose={() => { setModalEditarAbierto(false); setProductoAEditar(null); }}
                        producto={productoAEditar}
                        onGuardar={cargarProductos}
                    />
                )}
                <ModalConfirmacion
                    isOpen={modalEliminarAbierto}
                    onClose={() => { setModalEliminarAbierto(false); setProductoAEliminar(null); }}
                    onConfirm={confirmarEliminacion}
                    titulo="Eliminar Producto"
                    mensaje={
                        <p>
                            ¿Estás seguro de eliminar el producto{' '}
                            <strong className="text-slate-800">{productoAEliminar?.nombre}</strong> del catálogo?
                            Esta acción no se puede deshacer.
                        </p>
                    }
                    textoConfirmar="Sí, eliminar"
                    textoCancelar="Cancelar"
                    tipo="peligro"
                    procesando={procesandoEliminacion}
                />
            </div>
        </div>
    );
}
// components/ModalIngresoStock.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
    X, PackagePlus, Palette, AlertCircle, Save, MapPin, Search,
    CheckCircle2, PackageSearch, Clock, Package, ChevronDown,
} from 'lucide-react';
import { CatalogoService } from '../services/catalogo_service';
import { InventarioService } from '../services/inventario_service';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';
import { obtenerListaColores } from '../utils/colors';

import type { ProductoVista, InventarioRecienteVista } from '../types';

// ==========================================
// TIPOS Y CONSTANTES
// ==========================================

interface ModalIngresoStockProps {
    isOpen: boolean;
    onClose: () => void;
    onGuardado: () => void;
}

const ESTADO_INICIAL = {
    cantidad: '',
    color: '',
    ubicacion: 'ALMACÉN PRINCIPAL',
} as const;

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalIngresoStock({ isOpen, onClose, onGuardado }: ModalIngresoStockProps) {
    const { usuario } = useAuth();

    const [busqueda, setBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<ProductoVista[]>([]);
    const [productosRecientes, setProductosRecientes] = useState<InventarioRecienteVista[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoVista | null>(null);
    const [formData, setFormData] = useState({ ...ESTADO_INICIAL });
    const [estado, setEstado] = useState({
        guardando: false,
        error: null as string | null,
    });

    const inputBuscadorRef = useRef<HTMLInputElement>(null);
    const listaColores = obtenerListaColores();
    const busquedaDebounced = useDebounce(busqueda, 300);

    // ✅ useCallback — referencia estable para usar como dependencia en useEffect
    //    Sin esto, el useEffect de limpieza recrea la función en cada render,
    //    lo que genera warnings de exhaustive-deps en ESLint con React strict mode
    const limpiarTodo = useCallback(() => {
        setFormData({ ...ESTADO_INICIAL });
        setProductoSeleccionado(null);
        setBusqueda('');
        setResultadosBusqueda([]);
        setProductosRecientes([]);
        setEstado({ guardando: false, error: null });
    }, []);

    // ── Cargar recientes al abrir ─────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || productoSeleccionado) return;
        // Error silencioso deliberado — "recientes" es una conveniencia, no crítico
        InventarioService.obtenerInventarioReciente(1, 5)
            .then(res => setProductosRecientes(res.data))
            .catch(() => { /* no crítico — el buscador funciona igual sin recientes */ });
        setTimeout(() => inputBuscadorRef.current?.focus(), 100);
    }, [isOpen, productoSeleccionado]);

    // ── Limpieza al cerrar ────────────────────────────────────────────────────
    // limpiarTodo estable con useCallback → puede incluirse como dependencia sin loops
    useEffect(() => {
        if (!isOpen) limpiarTodo();
    }, [isOpen, limpiarTodo]);

    // ── Búsqueda con debounce ─────────────────────────────────────────────────
    useEffect(() => {
        if (productoSeleccionado || busquedaDebounced.trim().length < 2) {
            setResultadosBusqueda([]);
            return;
        }

        let activo = true;
        setBuscando(true);

        CatalogoService.obtenerProductosPaginados(busquedaDebounced, null, null, 1, 15)
            .then(res => { if (activo) setResultadosBusqueda(res.data); })
            // Error silencioso deliberado — el usuario ve "Sin resultados" de todas formas
            .catch(() => { /* no crítico — UI muestra estado vacío */ })
            .finally(() => { if (activo) setBuscando(false); });

        return () => { activo = false; };
    }, [busquedaDebounced, productoSeleccionado]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const seleccionarProducto = useCallback((producto: ProductoVista) => {
        setProductoSeleccionado(producto);
        setBusqueda('');
        setResultadosBusqueda([]);
        setFormData(prev => ({ ...prev, color: '' }));
        setEstado(prev => ({ ...prev, error: null }));
    }, []);

    const deseleccionarProducto = () => {
        setProductoSeleccionado(null);
        setFormData(prev => ({ ...prev, color: '' }));
        setTimeout(() => inputBuscadorRef.current?.focus(), 50);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (estado.error) setEstado(prev => ({ ...prev, error: null }));
    };

    // ── Envío ─────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productoSeleccionado || !formData.cantidad) return;

        if (!usuario?.id) {
            setEstado(prev => ({ ...prev, error: 'Error de seguridad: Sesión no válida.' }));
            return;
        }

        if (productoSeleccionado.es_vehiculo === 1 && !formData.color.trim()) {
            setEstado(prev => ({ ...prev, error: 'Para vehículos, el color del lote es obligatorio.' }));
            return;
        }

        setEstado({ guardando: true, error: null });
        try {
            await InventarioService.registrarIngreso(
                productoSeleccionado.id,
                Number(formData.cantidad),
                usuario.id,
                productoSeleccionado.es_vehiculo === 1 ? formData.color.trim() : null,
                formData.ubicacion.trim() || 'ALMACÉN PRINCIPAL'
            );
            toast.success(`Ingreso de "${productoSeleccionado.nombre}" registrado correctamente`);
            onGuardado();
            limpiarTodo();
            onClose();
        } catch (e: unknown) {
            // ✅ Un solo setEstado atómico — no doble llamada
            setEstado({
                guardando: false,
                error: normalizeError(e, 'Ocurrió un error al registrar en Kardex.'),
            });
        }
    };

    if (!isOpen) return null;

    const mostrarRecientes = busqueda.trim().length < 2 && productosRecientes.length > 0;
    const listaAMostrar: ProductoVista[] = mostrarRecientes
        ? (productosRecientes as ProductoVista[])
        : resultadosBusqueda;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-white shrink-0 rounded-t-2xl">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm">
                            <PackagePlus size={24} />
                        </div>
                        Ingreso a Bodega
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={estado.guardando}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        <X size={24} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-slate-50/50 min-h-[450px]">
                    <form id="form-ingreso-stock" onSubmit={handleSubmit} className="space-y-6">

                        {estado.error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm font-medium shadow-sm animate-in fade-in">
                                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-500" />
                                <p>{estado.error}</p>
                            </div>
                        )}

                        {/* Buscador / Producto seleccionado */}
                        <div>
                            {!productoSeleccionado ? (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700">
                                        Buscar Producto en el Catálogo
                                    </label>
                                    <div className="relative shadow-sm rounded-xl">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                                        <input
                                            ref={inputBuscadorRef}
                                            type="text"
                                            value={busqueda}
                                            onChange={e => setBusqueda(e.target.value)}
                                            placeholder="Escribe el SKU o nombre del producto..."
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 text-lg placeholder:text-slate-400"
                                            autoComplete="off"
                                        />
                                        {buscando && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {(mostrarRecientes || busqueda.trim().length >= 2) && (
                                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
                                                {mostrarRecientes
                                                    ? <><Clock size={16} className="text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Últimos Agregados</span></>
                                                    : <><Search size={16} className="text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resultados de búsqueda</span></>
                                                }
                                            </div>
                                            {listaAMostrar.length > 0 ? (
                                                <ul className="divide-y divide-slate-100">
                                                    {listaAMostrar.map(prod => (
                                                        <li
                                                            key={prod.id}
                                                            onClick={() => seleccionarProducto(prod)}
                                                            className="p-4 hover:bg-emerald-50 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 transition-colors group"
                                                        >
                                                            <div className="flex flex-col gap-1 w-full">
                                                                <span className="font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                                                                    {prod.nombre}
                                                                </span>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                                                        {prod.sku}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 font-medium">
                                                                        {prod.categoria_nombre ?? 'Sin Categoría'} • {prod.marca_nombre ?? 'Sin Marca'}
                                                                    </span>
                                                                    {prod.es_vehiculo === 1 && (
                                                                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                                                                            Vehículo
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="p-8 flex flex-col items-center justify-center text-slate-500 bg-white">
                                                    <PackageSearch size={40} className="text-slate-300 mb-3" />
                                                    <p className="font-medium">
                                                        No se encontraron productos para &ldquo;{busqueda}&rdquo;
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700">
                                        Producto Seleccionado
                                    </label>
                                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-white p-2 rounded-full shadow-sm mt-0.5 shrink-0">
                                                <CheckCircle2 className="text-emerald-500" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-emerald-950 leading-tight mb-2">
                                                    {productoSeleccionado.nombre}
                                                </h4>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-200/50 px-2 py-1 rounded">
                                                        SKU: {productoSeleccionado.sku}
                                                    </span>
                                                    {productoSeleccionado.es_vehiculo === 1 && (
                                                        <span className="text-[11px] font-black text-amber-900 bg-amber-300/50 px-2 py-1 rounded uppercase shadow-sm">
                                                            Vehículo
                                                        </span>
                                                    )}
                                                    {/* stock_actual existe en ProductoVista — sin cast */}
                                                    <span className="text-xs font-bold text-slate-700 bg-white border border-emerald-200 px-2 py-1 rounded shadow-sm flex items-center gap-1.5">
                                                        <Package size={14} className="text-emerald-600" />
                                                        Stock Actual: {productoSeleccionado.stock_actual ?? 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={deseleccionarProducto}
                                            className="text-emerald-700 bg-white hover:text-white hover:bg-emerald-600 border border-emerald-300 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shrink-0 w-full sm:w-auto"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Zona de ingreso */}
                        {productoSeleccionado && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                                {/* Selector de color — solo para vehículos */}
                                {productoSeleccionado.es_vehiculo === 1 && (
                                    <div className="bg-amber-50/50 border-2 border-amber-200 p-6 rounded-2xl shadow-sm">
                                        <label className="block text-sm font-black text-amber-900 mb-3 flex items-center gap-2">
                                            <Palette size={20} className="text-amber-600" /> Color / Variante del Lote
                                        </label>
                                        <div className="relative">
                                            <select
                                                name="color"
                                                required
                                                value={formData.color}
                                                onChange={handleChange}
                                                disabled={estado.guardando}
                                                className="w-full px-5 py-2.5 bg-white border border-amber-300 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 rounded-xl outline-none transition-all uppercase font-black text-amber-950 text-lg shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>-- SELECCIONE UN COLOR --</option>
                                                {listaColores.map((color, i) => (
                                                    <option key={i} value={color.toUpperCase()}>{color}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-amber-600">
                                                <ChevronDown size={24} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="block text-sm font-black text-slate-700 mb-3">
                                            Cantidad a Ingresar
                                        </label>
                                        <input
                                            type="number"
                                            name="cantidad"
                                            min="1"
                                            required
                                            value={formData.cantidad}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-2xl font-black text-slate-800 text-center shadow-inner"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="block text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                                            <MapPin size={18} className="text-slate-500" /> Ubicación Física
                                        </label>
                                        <input
                                            type="text"
                                            name="ubicacion"
                                            value={formData.ubicacion}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full px-2.5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-bold text-slate-700 text-lg shadow-inner"
                                            placeholder="Ej. ALMACÉN PRINCIPAL"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-100 bg-white shrink-0 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={estado.guardando}
                        className="px-6 py-3.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="form-ingreso-stock"
                        type="submit"
                        disabled={!productoSeleccionado || estado.guardando}
                        className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-600/20 text-lg"
                    >
                        <Save size={22} className={estado.guardando ? 'animate-pulse' : ''} />
                        {estado.guardando ? 'Registrando...' : 'Confirmar Ingreso'}
                    </button>
                </div>
            </div>
        </div>
    );
}

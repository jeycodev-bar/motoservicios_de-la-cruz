// components/ModalNuevoProducto.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    X, Save, RefreshCw, AlertCircle, Truck, Info, Tag,
    Package, AlertTriangle,
} from 'lucide-react';
import { MaestrosService } from '../services/maestros_service';
import { CatalogoService } from '../services/catalogo_service';
import { normalizeError } from '../utils/errors';

// ✅ Tipos desde src/types
import type { Categoria, Marca } from '../types';

// ==========================================
// TIPOS Y CONSTANTES
// ==========================================

interface ModalNuevoProductoProps {
    isOpen: boolean;
    onClose: () => void;
    onGuardado: () => void;
}

const ESTADO_INICIAL = {
    esVehiculo: false,
    categoriaId: '',
    marcaId: '',
    nombreRepuesto: '',
    modeloMoto: '',
    cilindraje: '',
    precioCompra: '',
    precioVenta: '',
    stockMinimo: '2',
};

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalNuevoProducto({ isOpen, onClose, onGuardado }: ModalNuevoProductoProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [estado, setEstado] = useState({
        guardando: false,
        error: null as string | null,
    });

    // ── Carga inicial al abrir ────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        setFormData(ESTADO_INICIAL);
        setEstado({ guardando: false, error: null });

        const cargar = async () => {
            try {
                const [cats, mars] = await Promise.all([
                    MaestrosService.obtenerCategorias(),
                    MaestrosService.obtenerMarcas(),
                ]);
                setCategorias(cats);
                setMarcas(mars);
                if (cats.length > 0) {
                    setFormData(prev => ({ ...prev, categoriaId: cats[0].id }));
                }
            } catch (e: unknown) {
                setEstado(prev => ({
                    ...prev,
                    error: normalizeError(e, 'Error al cargar el catálogo base (Categorías/Marcas).'),
                }));
            }
        };
        cargar();
    }, [isOpen]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (estado.error) setEstado(prev => ({ ...prev, error: null }));
    };

    const toggleEsVehiculo = () => {
        if (estado.guardando) return;
        setFormData(prev => ({
            ...prev,
            esVehiculo: !prev.esVehiculo,
            modeloMoto: '',
            nombreRepuesto: '',
            cilindraje: '',
        }));
        if (estado.error) setEstado(prev => ({ ...prev, error: null }));
    };

    // ── Estados derivados ─────────────────────────────────────────────────────

    // ✅ Marca.categoria_id existe en @/types
    const marcasFiltradas = useMemo(
        () => marcas.filter(m => m.categoria_id === formData.categoriaId),
        [marcas, formData.categoriaId]
    );

    const categoriaSeleccionada = useMemo(
        () => categorias.find(c => c.id === formData.categoriaId),
        [categorias, formData.categoriaId]
    );

    const skuGenerado = useMemo(() => {
        const nomBase = formData.esVehiculo ? formData.modeloMoto : formData.nombreRepuesto;
        if (!formData.categoriaId || !formData.marcaId || !nomBase.trim()) return '';

        const catStr = categoriaSeleccionada?.nombre.substring(0, 3) ?? 'XXX';
        const marStr = marcas.find(m => m.id === formData.marcaId)?.nombre.substring(0, 3) ?? 'XXX';
        const nomStr = nomBase.replace(/\s+/g, '').substring(0, 4);

        return `${catStr}-${marStr}-${nomStr}`.toUpperCase();
    }, [formData, categoriaSeleccionada, marcas]);

    // Auto-selección de primera marca disponible al cambiar categoría
    useEffect(() => {
        const marcaValida = marcasFiltradas.find(m => m.id === formData.marcaId);
        if (!marcaValida && marcasFiltradas.length > 0) {
            setFormData(prev => ({ ...prev, marcaId: marcasFiltradas[0].id }));
        } else if (marcasFiltradas.length === 0 && formData.marcaId !== '') {
            setFormData(prev => ({ ...prev, marcaId: '' }));
        }
    }, [marcasFiltradas, formData.marcaId]);

    // ── Envío ─────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.marcaId) {
            setEstado({ guardando: false, error: 'Debes seleccionar una marca. Si no hay marcas para esta categoría, créalas primero.' });
            return;
        }
        if (!skuGenerado) {
            setEstado({ guardando: false, error: 'Completa los campos obligatorios para generar el SKU base.' });
            return;
        }

        setEstado({ guardando: true, error: null });
        try {
            const marca = marcas.find(m => m.id === formData.marcaId)?.nombre ?? '';
            const nombreFinal = formData.esVehiculo
                ? `${marca} ${formData.modeloMoto.toUpperCase()} ${formData.cilindraje ? formData.cilindraje + 'CC' : ''}`.trim()
                : formData.nombreRepuesto.toUpperCase().trim();

            await CatalogoService.crearProducto({
                categoria_id: formData.categoriaId,
                marca_id: formData.marcaId,
                nombre: nombreFinal,
                sku: skuGenerado,
                precio_compra_referencial: Number(formData.precioCompra),
                precio_venta_referencial: Number(formData.precioVenta),
                // es_vehiculo: formData.esVehiculo ? 1 : 0,  //✅FIX: Pasar el booleano directamente en lugar de castearlo a entero
                es_vehiculo: formData.esVehiculo,
                stock_minimo: Number(formData.stockMinimo),
                cilindraje: formData.esVehiculo && formData.cilindraje ? Number(formData.cilindraje) : null,
                modelo: formData.esVehiculo ? formData.modeloMoto.trim().toUpperCase() : null,
            });

            toast.success(`Producto "${nombreFinal}" creado correctamente`);
            onGuardado();
            onClose();
        } catch (e: unknown) {
            setEstado({
                guardando: false,
                error: normalizeError(e, 'Error interno de servidor al guardar.'),
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <Tag size={20} />
                        </div>
                        Nuevo Producto en Catálogo
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Cuerpo scrollable */}
                <div className="overflow-y-auto px-6 py-6 bg-slate-50/50">
                    <form id="form-nuevo-producto" onSubmit={handleSubmit} className="space-y-8">

                        {estado.error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-500" />
                                <p>{estado.error}</p>
                            </div>
                        )}

                        {/* Toggle vehículo */}
                        <div
                            onClick={toggleEsVehiculo}
                            className={`group relative cursor-pointer flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 shadow-sm ${formData.esVehiculo
                                ? 'bg-amber-50 border-amber-400'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl transition-colors duration-300 ${formData.esVehiculo
                                    ? 'bg-amber-400 text-amber-950 shadow-inner'
                                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                                    }`}>
                                    {formData.esVehiculo ? <Truck size={24} /> : <Package size={24} />}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg transition-colors ${formData.esVehiculo ? 'text-amber-900' : 'text-slate-700'}`}>
                                        ¿Este producto es un vehículo?
                                    </h3>
                                    <p className={`text-sm transition-colors ${formData.esVehiculo ? 'text-amber-700/80' : 'text-slate-500'}`}>
                                        {formData.esVehiculo
                                            ? 'Habilitando campos de Modelo Exacto y Cilindraje.'
                                            : 'Configurado como repuesto, accesorio o producto general.'}
                                    </p>
                                </div>
                            </div>
                            <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 border-2 ${formData.esVehiculo ? 'bg-amber-500 border-amber-500' : 'bg-slate-200 border-slate-200'
                                }`}>
                                <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${formData.esVehiculo ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                            </div>
                        </div>

                        {/* Clasificación + identificación */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Clasificación</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoría</label>
                                        <select
                                            name="categoriaId"
                                            value={formData.categoriaId}
                                            onChange={handleChange}
                                            required
                                            disabled={estado.guardando}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                                        >
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-sm font-semibold text-slate-700">Marca</label>
                                            {marcasFiltradas.length === 0 && formData.categoriaId && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-red-500 animate-pulse">
                                                    <AlertTriangle size={14} /> Sin marcas
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            name="marcaId"
                                            value={formData.marcaId}
                                            onChange={handleChange}
                                            required
                                            disabled={marcasFiltradas.length === 0 || estado.guardando}
                                            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 ${marcasFiltradas.length === 0 ? 'border-red-200 text-red-500' : 'border-slate-200'
                                                }`}
                                        >
                                            {marcasFiltradas.length === 0
                                                ? <option value="">Sin marcas en esta categoría</option>
                                                : marcasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Identificación</h3>
                                {formData.esVehiculo ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Modelo Exacto</label>
                                            <input
                                                name="modeloMoto"
                                                type="text"
                                                required
                                                placeholder="Ej. CB 200R, NINJA 400"
                                                value={formData.modeloMoto}
                                                onChange={handleChange}
                                                disabled={estado.guardando}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700 uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cilindraje (Opcional)</label>
                                            <div className="relative">
                                                <input
                                                    name="cilindraje"
                                                    type="number"
                                                    placeholder="Ej. 250"
                                                    min="0"
                                                    value={formData.cilindraje}
                                                    onChange={handleChange}
                                                    disabled={estado.guardando}
                                                    className="w-full p-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">CC</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in zoom-in-95 duration-200">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Genérico / Descripción</label>
                                        <input
                                            name="nombreRepuesto"
                                            type="text"
                                            required
                                            placeholder="Ej. Filtro de Aceite Deportivo, Llanta 130/70"
                                            value={formData.nombreRepuesto}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 uppercase"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* SKU generado */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${skuGenerado ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <RefreshCw size={18} className={estado.guardando ? 'animate-spin' : ''} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">SKU Automático</p>
                                        <p className={`font-mono text-lg font-bold tracking-tight ${skuGenerado ? 'text-slate-800' : 'text-slate-300'}`}>
                                            {skuGenerado || 'ESPERANDO DATOS...'}
                                        </p>
                                    </div>
                                </div>
                                <span title="Rust resolverá colisiones si este SKU ya existe." className="cursor-help flex items-center">
                                    <Info size={18} className="text-slate-300" />
                                </span>
                            </div>
                        </div>

                        {/* Precios e inventario */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                Precios e Inventario Referencial
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-blue-700 mb-1.5">Costo Ref. (S/)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600/80 font-bold">S/</span>
                                        <input
                                            name="precioCompra"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.precioCompra}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full p-3 pl-10 bg-blue-50/30 border border-blue-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-blue-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-emerald-700 mb-1.5">Precio Venta (S/)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/80 font-bold">S/</span>
                                        <input
                                            name="precioVenta"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            value={formData.precioVenta}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full p-3 pl-10 bg-emerald-50/30 border border-emerald-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-emerald-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stock Mínimo Global</label>
                                    <input
                                        name="stockMinimo"
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.stockMinimo}
                                        onChange={handleChange}
                                        disabled={estado.guardando}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-700 text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-5 border-t border-slate-100 bg-white shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={estado.guardando}
                        className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="form-nuevo-producto"
                        type="submit"
                        disabled={estado.guardando}
                        className="px-8 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none shadow-md shadow-slate-800/20"
                    >
                        <Save size={20} className={estado.guardando ? 'animate-pulse' : ''} />
                        {estado.guardando ? 'Almacenando...' : 'Guardar en Catálogo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
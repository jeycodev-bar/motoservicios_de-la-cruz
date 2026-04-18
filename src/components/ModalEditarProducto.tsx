// components/ModalEditarProducto.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { X, Save, Lock, AlertCircle, Truck, Package, Edit3, Barcode } from 'lucide-react';
import { MaestrosService } from '../services/maestros_service';
import { CatalogoService } from '../services/catalogo_service';
import { normalizeError } from '../utils/errors';

// ✅ Tipos desde @/types — Marca.categoria_id existe en la definición canónica
import type { Categoria, Marca, Producto } from '../types';

// ==========================================
// TIPOS Y CONSTANTES
// ==========================================

interface ModalEditarProductoProps {
    isOpen: boolean;
    onClose: () => void;
    onGuardar: () => void;
    producto: Producto | null;
}

const ESTADO_INICIAL_FORM = {
    esVehiculo: false,
    categoriaId: '',
    marcaId: '',
    nombre: '',
    sku: '',
    precioCompra: '',
    precioVenta: '',
    stockMinimo: '1',
    modelo: '',
    cilindraje: '',
};

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalEditarProducto({
    isOpen,
    onClose,
    onGuardar,
    producto,
}: ModalEditarProductoProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [formData, setFormData] = useState(ESTADO_INICIAL_FORM);
    const [estado, setEstado] = useState({
        guardando: false,
        errorGeneral: null as string | null,
    });

    // ✅ useCallback — evita recreación innecesaria y stale closure
    const cargarMaestros = useCallback(async () => {
        try {
            const [cats, mars] = await Promise.all([
                MaestrosService.obtenerCategorias(),
                MaestrosService.obtenerMarcas(),
            ]);
            setCategorias(cats);
            setMarcas(mars);
        } catch (e: unknown) {
            setEstado(prev => ({
                ...prev,
                errorGeneral: normalizeError(e, 'Error al cargar maestros (Categorías/Marcas).'),
            }));
        }
    }, []);

    // Carga inicial y poblado de datos al abrir
    useEffect(() => {
        if (!isOpen || !producto) return;

        cargarMaestros();

        // const esVehiculoBd = producto.es_vehiculo === 1;
        const esVehiculoBd = producto.es_vehiculo === true || producto.es_vehiculo === 1;;
        setFormData({
            esVehiculo: esVehiculoBd,
            categoriaId: producto.categoria_id ?? '',
            marcaId: producto.marca_id ?? '',
            nombre: producto.nombre ?? '',
            sku: producto.sku ?? '',
            precioCompra: producto.precio_compra_referencial?.toString() ?? '0',
            precioVenta: producto.precio_venta_referencial?.toString() ?? '0',
            stockMinimo: producto.stock_minimo?.toString() ?? '1',
            modelo: producto.modelo ?? '',
            cilindraje: producto.cilindraje?.toString() ?? '',
        });
        setEstado({ guardando: false, errorGeneral: null });
    }, [isOpen, producto, cargarMaestros]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (estado.errorGeneral) setEstado(prev => ({ ...prev, errorGeneral: null }));
    };

    const toggleEsVehiculo = () => {
        if (estado.guardando) return;
        setFormData(prev => ({
            ...prev,
            esVehiculo: !prev.esVehiculo,
            modelo: !prev.esVehiculo ? prev.modelo : '',
            cilindraje: !prev.esVehiculo ? prev.cilindraje : '',
        }));
        if (estado.errorGeneral) setEstado(prev => ({ ...prev, errorGeneral: null }));
    };

    // ✅ Marca.categoria_id existe en @/types — sin cast
    const marcasFiltradas = useMemo(
        () => marcas.filter(m => m.categoria_id === formData.categoriaId),
        [marcas, formData.categoriaId]
    );

    // Auto-ajuste de marca si cambia la categoría
    useEffect(() => {
        if (formData.categoriaId && marcasFiltradas.length > 0) {
            const marcaValida = marcasFiltradas.find(m => m.id === formData.marcaId);
            if (!marcaValida) setFormData(prev => ({ ...prev, marcaId: '' }));
        }
    }, [formData.categoriaId, marcasFiltradas, formData.marcaId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!producto) return;

        if (!formData.categoriaId || !formData.marcaId || !formData.nombre.trim()) {
            setEstado(prev => ({
                ...prev,
                errorGeneral: 'Categoría, Marca y Nombre son obligatorios.',
            }));
            return;
        }

        setEstado({ guardando: true, errorGeneral: null });
        try {
            const cilindrajeFinal =
                !formData.esVehiculo || !formData.cilindraje
                    ? null
                    : Number(formData.cilindraje);

            await CatalogoService.actualizarProducto(producto.id, {
                categoria_id: formData.categoriaId,
                marca_id: formData.marcaId,
                nombre: formData.nombre.trim().toUpperCase(),
                sku: formData.sku,
                precio_venta_referencial: Number(formData.precioVenta),
                // es_vehiculo: formData.esVehiculo ? 1 : 0,
                es_vehiculo: formData.esVehiculo,
                stock_minimo: Number(formData.stockMinimo),
                modelo: formData.esVehiculo ? formData.modelo.trim().toUpperCase() : null,
                cilindraje: cilindrajeFinal,
            });

            toast.success(`Producto "${formData.nombre.trim().toUpperCase()}" actualizado correctamente`);
            onGuardar();
            onClose();
        } catch (e: unknown) {
            setEstado({
                guardando: false,
                errorGeneral: normalizeError(e, 'Ocurrió un error al actualizar.'),
            });
        }
    };

    if (!isOpen || !producto) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-white shrink-0">
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                            <Edit3 size={20} />
                        </div>
                        Editar Producto
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
                    <form id="form-editar-producto" onSubmit={handleSubmit} className="space-y-8">

                        {/* Alerta de error */}
                        {estado.errorGeneral && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-sm font-medium shadow-sm">
                                <AlertCircle size={20} className="shrink-0 mt-0.5 text-red-500" />
                                <p>{estado.errorGeneral}</p>
                            </div>
                        )}

                        {/* Toggle tipo de producto */}
                        <div
                            onClick={toggleEsVehiculo}
                            className={`group relative cursor-pointer flex items-center justify-between p-2 rounded-2xl border-2 transition-all duration-300 shadow-sm ${formData.esVehiculo
                                ? 'bg-amber-50 border-amber-400'
                                : 'bg-blue-50 border-blue-400'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl transition-colors duration-300 shadow-inner ${formData.esVehiculo
                                    ? 'bg-amber-400 text-amber-950'
                                    : 'bg-blue-600 text-white'
                                    }`}>
                                    {formData.esVehiculo ? <Truck size={24} /> : <Package size={24} />}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg transition-colors ${formData.esVehiculo ? 'text-amber-900' : 'text-blue-900'}`}>
                                        {formData.esVehiculo ? 'Vehículo Motorizado' : 'Repuesto, Accesorio u otros'}
                                    </h3>
                                    <p className={`text-sm transition-colors ${formData.esVehiculo ? 'text-amber-700/80' : 'text-blue-700/80'}`}>
                                        {formData.esVehiculo
                                            ? 'Requiere especificar modelo exacto y cilindraje de la unidad.'
                                            : 'Artículo de catálogo general, recambios o mercadería.'}
                                    </p>
                                </div>
                            </div>
                            <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 border-2 ${formData.esVehiculo ? 'bg-amber-500 border-amber-500' : 'bg-blue-600 border-blue-600'
                                }`}>
                                <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${formData.esVehiculo ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                            </div>
                        </div>

                        {/* Clasificación + datos del producto */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-6">

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
                                            <option value="">Seleccione...</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Marca</label>
                                        <select
                                            name="marcaId"
                                            value={formData.marcaId}
                                            onChange={handleChange}
                                            required
                                            disabled={!formData.categoriaId || estado.guardando}
                                            className={`w-full p-3 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 ${marcasFiltradas.length === 0 ? 'border-red-200 text-red-500' : 'border-slate-200'
                                                }`}
                                        >
                                            <option value="">{formData.categoriaId ? 'Seleccione...' : 'Elija categoría primero'}</option>
                                            {marcasFiltradas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos del Producto</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre del Producto</label>
                                        <input
                                            name="nombre"
                                            type="text"
                                            required
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            disabled={estado.guardando}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 uppercase"
                                        />
                                    </div>
                                    {formData.esVehiculo && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in zoom-in-95 duration-200">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Modelo Exacto</label>
                                                <input
                                                    name="modelo"
                                                    type="text"
                                                    value={formData.modelo}
                                                    onChange={handleChange}
                                                    disabled={estado.guardando}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700 uppercase"
                                                    placeholder="Ej. CB 200R"
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
                                    )}
                                </div>
                            </div>

                            {/* SKU (inmutable) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-start sm:items-center justify-between gap-4 shadow-inner">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="bg-slate-200 p-3 rounded-xl text-slate-500 shrink-0 hidden sm:block">
                                        <Barcode size={28} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                            SKU Asignado <Lock size={12} className="text-slate-400" />
                                        </p>
                                        <p className="font-mono text-lg sm:text-xl font-extrabold text-slate-800 break-all leading-tight">
                                            {formData.sku}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    title="El SKU es el identificador físico inmutable de este producto en el almacén."
                                    className="cursor-help text-slate-400 hover:text-slate-600 shrink-0 self-start sm:self-center"
                                >
                                    <AlertCircle size={22} />
                                </span>
                            </div>
                        </div>

                        {/* Precios e inventario */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                                Finanzas e Inventario
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                        Costo Ref. <Lock size={14} />
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                                        <input
                                            type="number"
                                            value={formData.precioCompra}
                                            readOnly
                                            className="w-full p-3 pl-10 bg-slate-100 border border-slate-200 border-dashed rounded-xl outline-none text-slate-500 font-bold cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-emerald-700 mb-1.5">Precio Venta</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 font-bold">S/</span>
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stock Mínimo</label>
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
                        form="form-editar-producto"
                        type="submit"
                        disabled={estado.guardando}
                        className="px-8 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none shadow-md shadow-slate-800/20"
                    >
                        <Save size={20} className={estado.guardando ? 'animate-pulse' : ''} />
                        {estado.guardando ? 'Actualizando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
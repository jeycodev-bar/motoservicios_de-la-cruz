// src/components/ModalTallerRecepcion.tsx
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Plus, X, Loader2, Check, User, Search } from 'lucide-react';
import ModalDirectorioClientes from '../modales/ModalDirectorioClientes';
import type { ClienteVenta } from '../types';

// ==========================================
// TIPOS
// ==========================================

export interface FormOrden {
    cliente_id: string;
    vehiculo_info: string;
    motivo_ingreso: string;
    fecha_estimada: string;
}

interface ModalTallerRecepcionProps {
    abierto: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    form: FormOrden;
    setForm: Dispatch<SetStateAction<FormOrden>>;
    procesando: boolean;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalTallerRecepcion({
    abierto,
    onClose,
    onSubmit,
    form,
    setForm,
    procesando,
}: ModalTallerRecepcionProps) {
    const [modalDirectorioAbierto, setModalDirectorioAbierto] = useState(false);
    const [clienteVisual, setClienteVisual] = useState('');

    // Limpiar cliente visual al cerrar o resetear el form
    useEffect(() => {
        if (!abierto || !form.cliente_id) {
            setClienteVisual('');
        }
    }, [abierto, form.cliente_id]);

    // ✅ ClienteVenta en lugar de any — tipo Pick<Cliente, 'id' | 'nombre_completo' | ...>
    const handleSeleccionarCliente = (cliente: ClienteVenta) => {
        setForm(prev => ({ ...prev, cliente_id: cliente.id }));
        setClienteVisual(`${cliente.nombre_completo} (${cliente.numero_documento})`);
    };

    if (!abierto) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 scale-in-center">

                    {/* Cabecera */}
                    <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Plus size={22} className="text-orange-600" /> Recepción de Vehículo
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={onSubmit} className="p-6 space-y-5">

                        {/* Selector de propietario */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                Propietario
                            </label>
                            <button
                                type="button"
                                onClick={() => setModalDirectorioAbierto(true)}
                                className={`w-full p-3 border rounded-xl outline-none transition-all flex justify-between items-center group ${form.cliente_id
                                        ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50'
                                        : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-indigo-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {form.cliente_id ? (
                                        <>
                                            <User size={18} className="text-indigo-600 shrink-0" />
                                            <span className="font-bold text-slate-800 truncate">
                                                {clienteVisual}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={18} className="text-slate-400 shrink-0 group-hover:text-indigo-500 transition-colors" />
                                            <span className="text-slate-500 font-medium">
                                                Buscar o registrar propietario...
                                            </span>
                                        </>
                                    )}
                                </div>
                            </button>
                            {/* Input oculto para que HTML5 valide el required */}
                            <input
                                type="text"
                                required
                                className="h-0 w-0 opacity-0 absolute pointer-events-none"
                                value={form.cliente_id}
                                onChange={() => { }}
                            />
                        </div>

                        {/* Vehículo */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                Vehículo (Marca, Modelo, Placa)
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Honda Navi 2024 - Placa 123-AB"
                                value={form.vehiculo_info}
                                onChange={e => setForm(prev => ({ ...prev, vehiculo_info: e.target.value }))}
                                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 uppercase font-medium transition-all"
                            />
                        </div>

                        {/* Motivo */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                Motivo del Ingreso
                            </label>
                            <textarea
                                required
                                rows={3}
                                placeholder="Describa la falla o servicio solicitado..."
                                value={form.motivo_ingreso}
                                onChange={e => setForm(prev => ({ ...prev, motivo_ingreso: e.target.value }))}
                                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 resize-none transition-all"
                            />
                        </div>

                        {/* Acciones */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={procesando}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={procesando || !form.cliente_id}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {procesando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                Crear Orden
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <ModalDirectorioClientes
                isOpen={modalDirectorioAbierto}
                onClose={() => setModalDirectorioAbierto(false)}
                onSelect={handleSeleccionarCliente}
            />
        </>
    );
}
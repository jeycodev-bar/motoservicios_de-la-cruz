// components/FormularioClienteModal.tsx
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserPlus, Edit, X, Save } from 'lucide-react';
import { ClientesService } from '../services/clientes_service';
import { normalizeError } from '../utils/errors';
import type { Cliente } from '../types';

// ==========================================
// TIPOS
// ==========================================

/** Estado interno del formulario — sin `id` porque se genera en backend (modo crear) */
type ClienteForm = Omit<Cliente, 'id'>;

const FORM_VACIO: ClienteForm = {
    tipo_documento: 'DNI',
    numero_documento: '',
    nombre_completo: '',
    telefono: '',
    email: '',
    direccion: '',
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clienteAEditar?: Cliente | null;
    // ✅ (cliente: Cliente) en lugar de (clienteGuardado: any)
    onGuardadoExitoso: (cliente: Cliente) => void;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function FormularioClienteModal({
    isOpen,
    onClose,
    clienteAEditar,
    onGuardadoExitoso,
}: Props) {
    // ✅ El estado usa ClienteForm (sin id) — el id se inyecta al guardar
    const [form, setForm] = useState<ClienteForm>(FORM_VACIO);
    const [cargando, setCargando] = useState(false);

    const modoEdicion = !!clienteAEditar;

    // Sincronizar el formulario cuando se pasa un cliente a editar o se abre en modo nuevo
    useEffect(() => {
        if (clienteAEditar) {
            // Extraemos los campos editables (sin id)
            const { id: _id, ...editables } = clienteAEditar;
            setForm(editables);
        } else {
            setForm(FORM_VACIO);
        }
    }, [clienteAEditar, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);

        try {
            if (modoEdicion && clienteAEditar) {
                await ClientesService.actualizarCliente(clienteAEditar.id, form);
                // En edición devolvemos el cliente completo con el id original
                onGuardadoExitoso({ ...form, id: clienteAEditar.id });
            } else {
                // En creación Rust devuelve el UUID generado
                const nuevoId = await ClientesService.guardarCliente(form);
                onGuardadoExitoso({ ...form, id: nuevoId });
            }
            onClose();
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error inesperado al guardar el cliente');
            // ✅ toast.error en lugar de alert()
            if (msg.includes('DOCUMENTO_DUPLICADO')) {
                toast.error(`El documento "${form.numero_documento}" ya está registrado.`);
            } else {
                toast.error(msg);
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

                {/* Cabecera */}
                <div className="flex justify-between items-center p-6 border-b bg-slate-900 text-white shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {modoEdicion
                            ? <Edit size={20} className="text-blue-400" />
                            : <UserPlus size={20} className="text-blue-400" />
                        }
                        {modoEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">

                    {/* Tipo y número de documento */}
                    <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Doc.</label>
                            <select
                                value={form.tipo_documento}
                                onChange={e => setForm({ ...form, tipo_documento: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="DNI">DNI</option>
                                <option value="RUC">RUC</option>
                                <option value="CE">CE</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento *</label>
                            <input
                                type="text"
                                required
                                value={form.numero_documento}
                                onChange={e => setForm({ ...form, numero_documento: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                            />
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo / Razón Social *</label>
                        <input
                            type="text"
                            required
                            value={form.nombre_completo}
                            onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                    </div>

                    {/* Teléfono y email */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                value={form.telefono ?? ''}
                                onChange={e => setForm({ ...form, telefono: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={form.email ?? ''}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Dirección Física</label>
                        <input
                            type="text"
                            value={form.direccion ?? ''}
                            onChange={e => setForm({ ...form, direccion: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={cargando}
                            className="px-5 py-2.5 border rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={cargando}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {cargando ? 'Guardando...' : modoEdicion ? 'Actualizar Cliente' : 'Guardar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
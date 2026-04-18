// src/modales/ModalDirectorioClientes.tsx
import { useState, useEffect } from 'react';
import { X, Search, User, UserPlus, CheckCircle } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import type { Cliente } from '../types';
import { ClientesService } from '../services/clientes_service';
import FormularioClienteModal from '../components/FormularioClienteModal';

// ==========================================
// PROPS
// ==========================================

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (cliente: Cliente) => void;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalDirectorioClientes({ isOpen, onClose, onSelect }: Props) {

    const [busqueda, setBusqueda] = useState('');
    const [clientesDb, setClientesDb] = useState<Cliente[]>([]);
    const [cargando, setCargando] = useState(false);
    const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);

    // ✅ useDebounce en lugar del setTimeout manual
    const busquedaDebounced = useDebounce(busqueda, 300);

    // Búsqueda de clientes — se cancela si el componente se desmonta o cambia la búsqueda
    useEffect(() => {
        let montado = true;

        const cargar = async () => {
            if (!isOpen) return;
            if (busquedaDebounced.length === 1) return; // Mínimo 0 o 2+ caracteres

            setCargando(true);
            try {
                const resultados = await ClientesService.buscarClientesRapido(busquedaDebounced);
                // ✅ Sin mapeo redundante — buscarClientesRapido ya devuelve Cliente[]
                if (montado) setClientesDb(resultados);
            } catch (e) {
                if (montado) console.error('Error al buscar clientes:', e);
            } finally {
                if (montado) setCargando(false);
            }
        };

        cargar();
        return () => { montado = false; };
    }, [busquedaDebounced, isOpen]);

    // Limpieza al cerrar
    useEffect(() => {
        if (!isOpen) {
            setBusqueda('');
            setModalNuevoAbierto(false);
        }
    }, [isOpen]);

    // Al crear un cliente nuevo: autoseleccionarlo y cerrar ambos modales
    const handleClienteCreado = (nuevoCliente: Cliente) => {
        setModalNuevoAbierto(false);
        onSelect(nuevoCliente);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">

                    {/* Cabecera */}
                    <div className="bg-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <User size={24} />
                            <h2 className="text-lg font-bold">Directorio de Clientes</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-indigo-200 hover:text-white hover:bg-indigo-700 p-1 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Buscador y botón Nuevo */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-3 shrink-0">
                        <div className="relative flex-1">
                            <Search
                                className={`absolute left-3 top-2.5 ${cargando ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`}
                                size={20}
                            />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar por nombre, DNI o RUC..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setModalNuevoAbierto(true)}
                            className="bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                            <UserPlus size={18} /> Nuevo
                        </button>
                    </div>

                    {/* Lista de clientes */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {cargando ? (
                            <div className="py-12 flex flex-col items-center justify-center text-indigo-400 animate-pulse">
                                <User size={32} className="mb-2 opacity-50" />
                                <p className="font-medium">Cargando directorio...</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {clientesDb.length === 0 && busquedaDebounced.length > 1 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <p>No se encontraron clientes con &ldquo;{busqueda}&rdquo;.</p>
                                    </div>
                                )}

                                {clientesDb.map(cliente => (
                                    <div
                                        key={cliente.id}
                                        className="flex items-center justify-between p-3 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all group"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800">
                                                {cliente.nombre_completo}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                                    {cliente.tipo_documento}
                                                </span>
                                                <span className="text-xs font-mono text-slate-500">
                                                    {cliente.numero_documento}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { onSelect(cliente); onClose(); }}
                                            className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                                        >
                                            <CheckCircle size={16} /> Seleccionar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sub-modal de nuevo cliente — z-index superior para que se superponga */}
            <FormularioClienteModal
                isOpen={modalNuevoAbierto}
                onClose={() => setModalNuevoAbierto(false)}
                clienteAEditar={null}
                onGuardadoExitoso={handleClienteCreado}
            />
        </>
    );
}
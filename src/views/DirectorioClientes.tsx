// src/views/DirectorioClientes.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Users, UserPlus, Search, Edit, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ClientesService } from '../services/clientes_service';
import FormularioClienteModal from '../components/FormularioClienteModal';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

// ✅ Cliente tipado — no any[]
import type { Cliente } from '../types';

const LIMITE = 50;

export default function DirectorioClientes() {

    // ✅ Cliente[] en lugar de any[]
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalClientes, setTotalClientes] = useState(0);
    const [estaCargando, setEstaCargando] = useState(false);

    // ✅ useDebounce — elimina el setTimeout manual
    const busquedaDebounced = useDebounce(busqueda, 300);

    // Modales
    const [modalAbierto, setModalAbierto] = useState(false);
    // ✅ Cliente | null en lugar de any
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

    // ✅ useCallback con todas las dependencias — sin stale closure
    //    El doble useEffect (uno para debounce, otro para paginación) se unifica aquí
    const cargarClientes = useCallback(async () => {
        setEstaCargando(true);
        try {
            const result = await ClientesService.obtenerClientesPaginados(
                paginaActual, LIMITE, busquedaDebounced
            );
            setClientes(result.data);
            setTotalClientes(result.total);
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al cargar clientes'));
        } finally {
            setEstaCargando(false);
        }
    }, [paginaActual, busquedaDebounced]);

    // Reset de página cuando cambia la búsqueda
    useEffect(() => {
        setPaginaActual(1);
    }, [busquedaDebounced]);

    // Un solo useEffect que responde a cargarClientes (agrupa debounce + página)
    useEffect(() => { cargarClientes(); }, [cargarClientes]);

    const totalPaginas = Math.ceil(totalClientes / LIMITE);

    const abrirModalNuevo = () => {
        setClienteSeleccionado(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (cliente: Cliente) => {
        setClienteSeleccionado(cliente);
        setModalAbierto(true);
    };

    const onClienteGuardado = () => {
        cargarClientes();
        setModalAbierto(false);
    };

    return (
        <div className="p-2 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)] gap-5">

            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <div className="bg-blue-200 p-2 rounded-lg">
                            <Users className="text-blue-600" size={28} strokeWidth={2.5} />
                        </div>
                        Directorio de Clientes
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión de compradores para ventas y servicio técnico.</p>
                </div>
                <button
                    onClick={abrirModalNuevo}
                    className="bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 flex items-center gap-2 font-bold shadow-md transition-all active:scale-95"
                >
                    <UserPlus size={20} /> Nuevo Cliente
                </button>
            </div>

            {/* Barra de búsqueda */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 shrink-0 relative transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20">
                <Search className={estaCargando ? 'text-blue-500 animate-pulse' : 'text-slate-400'} size={20} />
                <input
                    type="text"
                    placeholder="Buscar por Nombre, DNI o RUC..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-700 font-medium pr-10"
                />
                {busqueda && (
                    <button
                        onClick={() => setBusqueda('')}
                        className="absolute right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                        title="Limpiar búsqueda"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Tabla + paginación */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-primary z-10 shadow-sm">
                            <tr className="text-slate-400 text-sm border-b border-slate-200">
                                <th className="p-4 font-bold">Documento</th>
                                <th className="p-4 font-bold">Nombre / Razón Social</th>
                                <th className="p-4 font-bold">Contacto</th>
                                <th className="p-4 font-bold">Dirección</th>
                                <th className="p-4 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {clientes.length === 0 && !estaCargando && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            )}
                            {/* ✅ c tipado como Cliente — sin (c: any) */}
                            {clientes.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded mr-2">
                                            {c.tipo_documento}
                                        </span>
                                        <span className="font-mono font-bold text-slate-700">
                                            {c.numero_documento}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-800">{c.nombre_completo}</td>
                                    <td className="p-4">
                                        <p className="text-sm font-medium text-slate-700">{c.telefono || '---'}</p>
                                        <p className="text-xs text-slate-500">{c.email}</p>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 truncate max-w-xs">
                                        {c.direccion || '---'}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => abrirModalEditar(c)}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex justify-center items-center"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="bg-white p-4 border-t border-slate-200 flex justify-between items-center shrink-0">
                    <p className="text-sm text-slate-500">
                        Mostrando{' '}
                        <span className="font-bold text-slate-700">{clientes.length}</span> de{' '}
                        <span className="font-bold text-slate-700">{totalClientes}</span> clientes
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={paginaActual === 1 || estaCargando}
                            onClick={() => setPaginaActual(p => p - 1)}
                            className="p-2 border rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium text-slate-600 px-2">
                            Página {paginaActual} de {totalPaginas === 0 ? 1 : totalPaginas}
                        </span>
                        <button
                            disabled={paginaActual >= totalPaginas || estaCargando}
                            onClick={() => setPaginaActual(p => p + 1)}
                            className="p-2 border rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <FormularioClienteModal
                isOpen={modalAbierto}
                onClose={() => setModalAbierto(false)}
                clienteAEditar={clienteSeleccionado}
                onGuardadoExitoso={onClienteGuardado}
            />
        </div>
    );
}
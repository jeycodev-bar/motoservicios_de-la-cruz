// src/views/ConfiguraciónMaestros.tsx
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useMaestros } from '../hooks/useMaestros';
import ModalConfirmacion from '../modales/ModalConfirmacion';

// ✅ obtenerColorCategoria centralizada en utils/colors — función local eliminada
//    El cache es singleton global: se calcula una vez en toda la sesión,
//    independientemente de cuántos componentes usen la función.
import { obtenerColorCategoria } from '../utils/colors';

import {
    Plus, Trash2, Tags, Bookmark, Loader2, Search,
    Database, X,
} from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

type ItemAEliminar = {
    id: string;
    tipo: 'categoría' | 'marca';
    nombre: string;
} | null;

// ==========================================
// COMPONENTE
// ==========================================

export default function ConfiguracionMaestros() {

    // notification y setNotification ya no existen — migrado a sonner
    const { categorias, marcas, categoriasMap, isLoading, operaciones } = useMaestros();

    const [isSubmittingCat, setIsSubmittingCat] = useState(false);
    const [isSubmittingMarca, setIsSubmittingMarca] = useState(false);
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '' });
    const [nuevaMarca, setNuevaMarca] = useState('');
    const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState('');
    const [itemAEliminar, setItemAEliminar] = useState<ItemAEliminar>(null);
    const [procesandoEliminacion, setProcesandoEliminacion] = useState(false);

    const categoriasFiltradas = useMemo(
        () => categorias.filter(cat => cat.nombre.toLowerCase().includes(filtroCategoria.toLowerCase())),
        [categorias, filtroCategoria]
    );

    const marcasFiltradas = useMemo(
        () => marcas.filter(m => m.nombre.toLowerCase().includes(filtroMarca.toLowerCase())),
        [marcas, filtroMarca]
    );

    // ── Handlers de creación ──────────────────────────────────────────────────

    const handleCrearCategoria = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevaCategoria.nombre.trim()) return;
        setIsSubmittingCat(true);
        try {
            await operaciones.crearCategoria(nuevaCategoria.nombre, nuevaCategoria.descripcion);
            setNuevaCategoria({ nombre: '', descripcion: '' });
            toast.success(`Categoría "${nuevaCategoria.nombre.toUpperCase()}" creada`);
        } catch {
            toast.error('Error al crear. Es posible que esta categoría ya exista.');
        } finally {
            setIsSubmittingCat(false);
        }
    };

    const handleCrearMarca = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevaMarca.trim() || !categoriaSeleccionadaId) return;
        setIsSubmittingMarca(true);
        try {
            await operaciones.crearMarca(nuevaMarca, categoriaSeleccionadaId);
            setNuevaMarca('');
            toast.success(`Marca "${nuevaMarca.toUpperCase()}" creada`);
        } catch {
            toast.error('Error al crear. Es posible que esta marca ya exista.');
        } finally {
            setIsSubmittingMarca(false);
        }
    };

    // ── Handlers de eliminación ───────────────────────────────────────────────

    const solicitarEliminacion = (id: string, tipo: 'categoría' | 'marca', nombre: string) => {
        setItemAEliminar({ id, tipo, nombre });
    };

    const confirmarEliminacion = async () => {
        if (!itemAEliminar) return;
        setProcesandoEliminacion(true);
        try {
            if (itemAEliminar.tipo === 'categoría') {
                await operaciones.eliminarCategoria(itemAEliminar.id);
            } else {
                await operaciones.eliminarMarca(itemAEliminar.id);
            }
            toast.success(`${itemAEliminar.tipo === 'categoría' ? 'Categoría' : 'Marca'} "${itemAEliminar.nombre}" eliminada`);
            setItemAEliminar(null);
        } catch {
            const mensaje = itemAEliminar.tipo === 'categoría'
                ? 'Denegado: Existen productos o marcas vinculadas a esta categoría.'
                : 'Denegado: Existen productos vinculados a esta marca.';
            toast.error(mensaje);
            setItemAEliminar(null);
        } finally {
            setProcesandoEliminacion(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-2 md:p-2 font-sans relative">
            {/* El banner de notificación casero fue eliminado — sonner lo reemplaza */}

            <div className="max-w-7xl mx-auto space-y-4">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 text-green-600 rounded-xl shadow-sm shadow-blue-500/20">
                                <Database size={32} />
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                Gestionar categoría y marca
                            </h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1">
                            Configuración central de categorías y marcas para el inventario.
                        </p>
                    </div>
                    {isLoading && (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full font-medium text-sm animate-pulse">
                            <Loader2 size={16} className="animate-spin" /> Sincronizando...
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-180px)] min-h-[600px]">

                    {/* Columna: Categorías */}
                    <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col relative">
                        <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-xl z-10 space-y-5">
                            <div className="flex items-center gap-3 text-slate-800">
                                <Tags className="text-blue-500" size={22} />
                                <h2 className="text-xl font-bold">Categorías</h2>
                                <span className="ml-auto bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-bold">
                                    {categorias.length}
                                </span>
                            </div>
                            <form onSubmit={handleCrearCategoria} className="flex gap-3">
                                <input
                                    type="text"
                                    required
                                    placeholder="Añadir nueva categoría..."
                                    value={nuevaCategoria.nombre}
                                    onChange={e => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                                    disabled={isSubmittingCat || isLoading}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium uppercase placeholder:normal-case outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingCat || isLoading}
                                    className="bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-all flex items-center gap-2 disabled:opacity-50 font-semibold text-sm"
                                >
                                    {isSubmittingCat ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Crear</>}
                                </button>
                            </form>

                            {/* Buscador de columna — diseño border-b, caso especial sin BuscadorInput */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar categoría..."
                                    value={filtroCategoria}
                                    onChange={e => setFiltroCategoria(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-transparent border-b border-slate-200 text-sm outline-none focus:border-blue-500 transition-colors"
                                />
                                {filtroCategoria && (
                                    <button
                                        type="button"
                                        onClick={() => setFiltroCategoria('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded-full transition-all"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
                            {categoriasFiltradas.length === 0 && !isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                                    <div className="p-4 bg-slate-50 rounded-full"><Tags size={32} /></div>
                                    <p className="text-sm font-medium">No se encontraron categorías</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {categoriasFiltradas.map(cat => (
                                        <li key={cat.id} className="group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all">
                                            <span className="font-bold text-slate-700">{cat.nombre}</span>
                                            <button
                                                type="button"
                                                onClick={() => solicitarEliminacion(cat.id, 'categoría', cat.nombre)}
                                                disabled={isLoading}
                                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>

                    {/* Columna: Marcas */}
                    <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col relative">
                        <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-xl z-10 space-y-5">
                            <div className="flex items-center gap-3 text-slate-800">
                                <Bookmark className="text-amber-500" size={22} />
                                <h2 className="text-xl font-bold">Marcas Registradas</h2>
                                <span className="ml-auto bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-bold">
                                    {marcas.length}
                                </span>
                            </div>
                            <form onSubmit={handleCrearMarca} className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={categoriaSeleccionadaId}
                                    onChange={e => setCategoriaSeleccionadaId(e.target.value)}
                                    disabled={isSubmittingMarca || isLoading || categorias.length === 0}
                                    className="sm:w-1/3 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none transition-all focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Seleccionar Cat.</option>
                                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                                </select>
                                <div className="flex-1 flex gap-3">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nueva marca..."
                                        value={nuevaMarca}
                                        onChange={e => setNuevaMarca(e.target.value)}
                                        disabled={isSubmittingMarca || isLoading || !categoriaSeleccionadaId}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium uppercase outline-none transition-all focus:border-amber-500 disabled:bg-slate-100"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmittingMarca || isLoading || !categoriaSeleccionadaId}
                                        className="px-5 py-2.5 rounded-xl transition-all flex items-center justify-center font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-200"
                                    >
                                        {isSubmittingMarca ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </form>

                            {/* Buscador de columna — mismo caso especial que categorías */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar marca..."
                                    value={filtroMarca}
                                    onChange={e => setFiltroMarca(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-transparent border-b border-slate-200 text-sm outline-none focus:border-amber-500 transition-colors"
                                />
                                {filtroMarca && (
                                    <button
                                        type="button"
                                        onClick={() => setFiltroMarca('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded-full transition-all"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
                            {marcasFiltradas.length === 0 && !isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                                    <div className="p-4 bg-slate-50 rounded-full"><Bookmark size={32} /></div>
                                    <p className="text-sm font-medium">No se encontraron marcas</p>
                                </div>
                            ) : (
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {marcasFiltradas.map(marca => {
                                        const nombreCategoria = categoriasMap[marca.categoria_id] ?? 'Huérfana';
                                        return (
                                            <li key={marca.id} className="group relative flex flex-col justify-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-slate-800 text-sm truncate pr-6">{marca.nombre}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => solicitarEliminacion(marca.id, 'marca', marca.nombre)}
                                                        disabled={isLoading}
                                                        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                {/* ✅ obtenerColorCategoria desde utils/colors — sin función local */}
                                                <span className={`self-start text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${obtenerColorCategoria(nombreCategoria)}`}>
                                                    {nombreCategoria}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <ModalConfirmacion
                isOpen={!!itemAEliminar}
                onClose={() => !procesandoEliminacion && setItemAEliminar(null)}
                onConfirm={confirmarEliminacion}
                titulo={`Eliminar ${itemAEliminar?.tipo === 'categoría' ? 'Categoría' : 'Marca'}`}
                mensaje={
                    <p>
                        ¿Estás seguro de eliminar la {itemAEliminar?.tipo}{' '}
                        <strong className="text-slate-800">{itemAEliminar?.nombre}</strong>?
                        Esta acción no se puede deshacer.
                    </p>
                }
                textoConfirmar="Sí, eliminar"
                textoCancelar="Cancelar"
                tipo="peligro"
                procesando={procesandoEliminacion}
            />
        </div>
    );
}
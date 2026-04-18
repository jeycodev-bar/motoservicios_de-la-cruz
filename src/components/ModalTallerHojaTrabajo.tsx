// src/components/ModalTallerHojaTrabajo.tsx
import { Dispatch, SetStateAction } from 'react';
import { Settings, X, Search, Plus, Trash2, Wrench, Loader2 } from 'lucide-react';
import { useRepuestosEnOrden } from '../hooks/useRespuestosEnOrden';
import type { OrdenActiva, DetalleOrden, RepuestoCatalogo } from '../types';
import type {
    EstadoModalCantidad,
    EstadoModalConfirmacion,
} from './ModalTallerAcciones';

// ==========================================
// PROPS
// ==========================================

interface ModalTallerHojaTrabajoProps {
    abierto: boolean;
    onClose: () => void;
    ordenActiva: OrdenActiva | null;
    /** TallerService.obtenerCatalogoRepuestos — tipado exacto del servicio */
    fetchRepuestos: (busqueda: string, limite: number, offset: number) => Promise<RepuestoCatalogo[]>;
    setModalCantidad: Dispatch<SetStateAction<EstadoModalCantidad>>;
    detallesOrden: DetalleOrden[];
    setModalConfirmacion: Dispatch<SetStateAction<EstadoModalConfirmacion>>;
    manoObra: number;
    setManoObra: Dispatch<SetStateAction<number>>;
    guardarManoObra: () => void;
    totalRepuestos: number;
    procesando: boolean;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalTallerHojaTrabajo({
    abierto,
    onClose,
    ordenActiva,
    fetchRepuestos,
    setModalCantidad,
    detallesOrden,
    setModalConfirmacion,
    manoObra,
    setManoObra,
    guardarManoObra,
    totalRepuestos,
    procesando,
}: ModalTallerHojaTrabajoProps) {

    // ✅ 9 useEffect y 6 useState reemplazados por un único hook cohesivo
    const {
        resultados,
        buscando,
        cargandoMas,
        hayMas,
        busquedaLocal,
        setBusquedaLocal,
        handleScroll,
    } = useRepuestosEnOrden({ abierto, fetchRepuestos, detallesOrden });

    if (!abierto || !ordenActiva) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[40] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col scale-in-center">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                <Settings size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">
                                Hoja de Trabajo y Costos
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 mt-2 ml-11">
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded">
                                ORD-{ordenActiva.id.substring(0, 8)}
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                                {ordenActiva.vehiculo_info}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Cuerpo principal */}
                <div className="flex-1 flex overflow-hidden bg-slate-50">

                    {/* Panel Izquierdo: Catálogo de repuestos */}
                    <div className="w-[35%] bg-white border-r border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">
                                Bodega de Repuestos
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={busquedaLocal}
                                    onChange={e => setBusquedaLocal(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Lista de repuestos con scroll infinito */}
                        <div
                            className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar relative"
                            onScroll={handleScroll}
                        >
                            {buscando && resultados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <Loader2 className="animate-spin mb-2" size={24} />
                                    <p className="text-sm">Buscando en bodega...</p>
                                </div>
                            ) : resultados.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm mt-10">
                                    No se encontraron repuestos
                                </p>
                            ) : (
                                <>
                                    {/* ✅ r tipado como RepuestoCatalogo — sin (r: any) */}
                                    {resultados.map((r, index) => {
                                        const sinStock = r.cantidad <= 0;
                                        return (
                                            <div
                                                key={`${r.lote_id}-${index}`}
                                                className={`p-3 bg-white border rounded-xl flex justify-between items-center transition-all group ${sinStock
                                                    ? 'border-slate-100 opacity-60'
                                                    : 'border-slate-100 hover:border-orange-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="pr-2">
                                                    <p className={`font-bold text-sm leading-tight ${sinStock ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'
                                                        }`}>
                                                        {r.producto_nombre}
                                                    </p>
                                                    <div className="flex gap-3 mt-1.5 text-xs items-center">
                                                        <span className={`font-medium px-1.5 rounded ${sinStock ? 'text-slate-500 bg-slate-100' : 'text-orange-600 bg-orange-50'
                                                            }`}>
                                                            S/ {r.precio_venta_referencial.toFixed(2)}
                                                        </span>
                                                        <span className={`font-bold ${sinStock ? 'text-red-500' : 'text-slate-500'}`}>
                                                            {sinStock ? 'Agotado' : `Stock: ${r.cantidad}`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setModalCantidad({ abierto: true, repuesto: r, cantidad: '1' })}
                                                    disabled={sinStock}
                                                    className={`p-2.5 rounded-lg transition-colors shrink-0 ${sinStock
                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white'
                                                        }`}
                                                    title={sinStock ? 'Sin stock disponible' : 'Añadir a la orden'}
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {cargandoMas && (
                                        <div className="py-4 flex justify-center text-orange-500">
                                            <Loader2 className="animate-spin" size={20} />
                                        </div>
                                    )}

                                    {!hayMas && resultados.length > 0 && (
                                        <p className="text-center text-xs text-slate-400 py-4">
                                            Has llegado al final de los resultados
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Detalles de la orden y totales */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="text-xs font-bold text-slate-500 bg-slate-50 uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-3">Repuesto / Servicio</th>
                                            <th className="px-5 py-3 text-center">Cant</th>
                                            <th className="px-5 py-3 text-right">Precio Unit.</th>
                                            <th className="px-5 py-3 text-right">Subtotal</th>
                                            <th className="px-5 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detallesOrden.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-10 text-center text-slate-400 font-medium">
                                                    Aún no hay repuestos asignados.
                                                </td>
                                            </tr>
                                        )}
                                        {/* ✅ d tipado como DetalleOrden — sin (d: any) */}
                                        {detallesOrden.map((d) => (
                                            <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-5 py-4 font-bold text-slate-800 text-sm">
                                                    {d.producto_nombre}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-sm">
                                                        {d.cantidad}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right text-sm font-medium text-slate-500">
                                                    S/ {d.precio_unitario.toFixed(2)}
                                                </td>
                                                <td className="px-5 py-4 text-right text-sm font-black text-slate-800">
                                                    S/ {d.subtotal.toFixed(2)}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => setModalConfirmacion({ abierto: true, detalle: d })}
                                                        className="text-slate-300 hover:text-red-500 p-1.5 rounded bg-white border border-transparent hover:border-red-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Quitar repuesto"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Zona de Totales */}
                        <div className="bg-white border-t border-slate-200 p-6 shrink-0 grid grid-cols-2 gap-8 items-end shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <Wrench size={16} className="text-slate-400" /> Costo Mano de Obra (S/)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        value={manoObra}
                                        onChange={e => setManoObra(Number(e.target.value))}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl text-right font-black text-lg outline-none focus:border-slate-800 transition-colors"
                                    />
                                    <button
                                        onClick={guardarManoObra}
                                        disabled={procesando}
                                        className="bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-black font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="space-y-1 mb-2">
                                    <div className="flex justify-end gap-4 text-sm font-medium text-slate-500">
                                        <span>Subtotal Repuestos:</span>
                                        <span className="w-24">S/ {totalRepuestos.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-end gap-4 text-sm font-medium text-slate-500">
                                        <span>Mano de Obra:</span>
                                        <span className="w-24">S/ {manoObra.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 items-center pt-2 border-t border-slate-100">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        Total a Cobrar
                                    </span>
                                    <span className="text-4xl font-black text-orange-600">
                                        S/ {(totalRepuestos + manoObra).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
// /src/components/ModalTallerConfirmarEntrega.tsx
import { AlertTriangle, CheckCircle, X, Receipt, Wrench } from 'lucide-react';
import type { OrdenActiva, DetalleOrden } from '../types';

// ==========================================
// PROPS
// ==========================================

interface ModalConfirmarEntregaProps {
    abierto: boolean;
    onClose: () => void;
    onConfirm: () => void;
    orden: OrdenActiva | null;
    detalles: DetalleOrden[];
    procesando: boolean;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalConfirmarEntrega({
    abierto,
    onClose,
    onConfirm,
    orden,
    detalles,
    procesando,
}: ModalConfirmarEntregaProps) {
    if (!abierto || !orden) return null;

    // DetalleOrden tiene subtotal tipado como number — sin necesidad de cast
    const totalRepuestos = detalles.reduce((acc, d) => acc + d.subtotal, 0);
    const totalManoObra = Number(orden.costo_mano_obra ?? 0);
    const granTotal = totalRepuestos + totalManoObra;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">

                {/* Cabecera de Advertencia */}
                <div className="bg-amber-50 border-b border-amber-100 p-5 flex gap-4 items-start relative">
                    <button
                        onClick={onClose}
                        disabled={procesando}
                        className="absolute top-4 right-4 text-amber-500 hover:text-amber-700 hover:bg-amber-100 p-1 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-full shrink-0 mt-1">
                        <AlertTriangle size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-amber-900 leading-tight">
                            ¿Confirmar entrega del vehículo?
                        </h2>
                        <p className="text-amber-700 text-sm mt-1">
                            Esta acción moverá la orden a <strong>ENTREGADOS</strong> y ya no podrás
                            agregar repuestos ni modificar costos. Asegúrate de que los montos sean
                            correctos.
                        </p>
                    </div>
                </div>

                {/* Resumen de Liquidación */}
                <div className="p-5 bg-slate-50 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Receipt size={14} /> Resumen de Cobro
                        </h3>
                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span className="flex items-center gap-2">
                                    <Wrench size={14} className="text-slate-400" />
                                    Repuestos Utilizados ({detalles.length})
                                </span>
                                <span className="font-medium">S/ {totalRepuestos.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                <span>Costo de Mano de Obra</span>
                                <span className="font-medium">S/ {totalManoObra.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 text-base font-black text-slate-800">
                                <span>Total a Cobrar</span>
                                <span className="text-emerald-600">S/ {granTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={procesando}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Revisar de nuevo
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={procesando}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {procesando ? 'Procesando...' : 'Sí, entregar vehículo'}
                        <CheckCircle size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

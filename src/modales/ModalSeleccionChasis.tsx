// src/modales/ModalSeleccionChasis.tsx — pertenece a PuntoVenta
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, CheckCircle, Bike, AlertCircle } from 'lucide-react';
import { VentasService } from '../services/ventas_service';
import { normalizeError } from '../utils/errors';
import type { StockVenta } from '../services/ventas_service';
import type { ChasisDisponible } from '../types';

// ==========================================
// TIPOS
// ==========================================

interface Props {
    isOpen: boolean;
    onClose: () => void;
    producto: StockVenta | null;
    onConfirmar: (producto: StockVenta, chasisSeleccionado: ChasisDisponible) => void;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalSeleccionChasis({
    isOpen,
    onClose,
    producto,
    onConfirmar,
}: Props) {
    const [chasisDisponibles, setChasisDisponibles] = useState<ChasisDisponible[]>([]);
    const [chasisSeleccionadoId, setChasisSeleccionadoId] = useState<string | null>(null);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        if (!isOpen || !producto) return;

        let activo = true;
        setCargando(true);
        setChasisSeleccionadoId(null);

        VentasService.obtenerChasisDisponibles(producto.lote_id)
            .then(disponibles => {
                if (activo) setChasisDisponibles(disponibles);
            })
            .catch(e => {
                if (!activo) return;
                // ✅ toast.error + normalizeError — sin console.error silencioso
                toast.error(normalizeError(e, 'Error al buscar chasis disponibles'));
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => { activo = false; };
    }, [isOpen, producto]);

    if (!isOpen || !producto) return null;

    const handleConfirmar = () => {
        const chasis = chasisDisponibles.find(c => c.id === chasisSeleccionadoId);
        if (chasis) {
            onConfirmar(producto, chasis);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Cabecera */}
                <div className="bg-amber-500 p-4 flex justify-between items-center text-white shrink-0">
                    <div className="flex items-center gap-2">
                        <Bike size={24} />
                        <h2 className="text-lg font-bold">Seleccionar Vehículo Físico</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-amber-100 hover:text-white hover:bg-amber-600 p-1 rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cuerpo */}
                <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
                    <div className="mb-4">
                        <p className="text-sm text-slate-500 font-medium">Asignando chasis para:</p>
                        <p className="text-lg font-bold text-slate-800">{producto.producto_nombre}</p>
                        {producto.color && (
                            <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                                Color: {producto.color}
                            </span>
                        )}
                    </div>

                    {cargando ? (
                        <div className="py-10 flex flex-col items-center justify-center text-amber-600 animate-pulse">
                            <Bike size={32} className="mb-2 opacity-50" />
                            <p className="font-medium">Buscando chasis en bodega...</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">
                                Chasis Disponibles en inventario ({chasisDisponibles.length})
                            </p>

                            {chasisDisponibles.length === 0 && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-200">
                                    <AlertCircle size={20} />
                                    <p className="text-sm font-medium">
                                        No hay chasis disponibles para este modelo.
                                    </p>
                                </div>
                            )}

                            {chasisDisponibles.map(chasis => (
                                <label
                                    key={chasis.id}
                                    className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${chasisSeleccionadoId === chasis.id
                                        ? 'border-amber-500 bg-amber-50'
                                        : 'border-slate-200 bg-white hover:border-amber-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="chasis_select"
                                        className="hidden"
                                        checked={chasisSeleccionadoId === chasis.id}
                                        onChange={() => setChasisSeleccionadoId(chasis.id)}
                                    />
                                    <div className="flex-1 ml-2">
                                        <p className="font-mono font-bold text-sm text-slate-800">
                                            VIN: {chasis.numero_chasis}
                                        </p>
                                        <p className="font-mono text-xs text-slate-500">
                                            Motor: {chasis.numero_motor}
                                        </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${chasisSeleccionadoId === chasis.id
                                        ? 'border-amber-500 bg-amber-500'
                                        : 'border-slate-300'
                                        }`}>
                                        {chasisSeleccionadoId === chasis.id && (
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={!chasisSeleccionadoId || cargando}
                        onClick={handleConfirmar}
                        className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-md disabled:shadow-none flex items-center gap-2 transition-colors"
                    >
                        <CheckCircle size={18} /> Asignar al Carrito
                    </button>
                </div>
            </div>
        </div>
    );
}
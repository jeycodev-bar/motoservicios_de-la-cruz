// /src/components/ModalTallerAcciones.tsx    (aquí nos quedamos)
import { FormEvent, Dispatch, SetStateAction } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { RepuestoCatalogo, DetalleOrden } from '../types';

// ==========================================
// TIPOS DE ESTADO (compartidos con el padre)
// ==========================================

export interface EstadoModalCantidad {
    abierto: boolean;
    repuesto: RepuestoCatalogo | null;
    cantidad: string;
}

export interface EstadoModalConfirmacion {
    abierto: boolean;
    detalle: DetalleOrden | null;
}

// ==========================================
// PROPS
// ==========================================

interface ModalTallerAccionesProps {
    modalCantidad: EstadoModalCantidad;
    setModalCantidad: Dispatch<SetStateAction<EstadoModalCantidad>>;
    confirmarAgregarRepuesto: (e: FormEvent<HTMLFormElement>) => void;
    modalConfirmacion: EstadoModalConfirmacion;
    setModalConfirmacion: Dispatch<SetStateAction<EstadoModalConfirmacion>>;
    confirmarEliminarRepuesto: () => void;
    procesando: boolean;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalTallerAcciones({
    modalCantidad,
    setModalCantidad,
    confirmarAgregarRepuesto,
    modalConfirmacion,
    setModalConfirmacion,
    confirmarEliminarRepuesto,
    procesando,
}: ModalTallerAccionesProps) {
    return (
        <>
            {/* MINI-MODAL: CONFIRMAR CANTIDAD DE REPUESTO */}
            {modalCantidad.abierto && modalCantidad.repuesto && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-in-center border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Agregar Repuesto</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {modalCantidad.repuesto.producto_nombre}
                        </p>
                        <form onSubmit={confirmarAgregarRepuesto}>
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                                    Cantidad a usar (Max: {modalCantidad.repuesto.cantidad})
                                </label>
                                <input
                                    type="number"
                                    autoFocus
                                    required
                                    min="1"
                                    max={modalCantidad.repuesto.cantidad}
                                    value={modalCantidad.cantidad}
                                    onChange={e =>
                                        setModalCantidad({ ...modalCantidad, cantidad: e.target.value })
                                    }
                                    className="w-full text-center text-3xl font-black p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setModalCantidad({ abierto: false, repuesto: null, cantidad: '1' })
                                    }
                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={procesando}
                                    className="flex-1 px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex justify-center items-center"
                                >
                                    {procesando ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Confirmar'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MINI-MODAL: CONFIRMAR ELIMINACIÓN */}
            {modalConfirmacion.abierto && modalConfirmacion.detalle && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-in-center border border-slate-100 text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">¿Quitar repuesto?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Se devolverán{' '}
                            <b>{modalConfirmacion.detalle.cantidad}</b> unidades de &ldquo;
                            {modalConfirmacion.detalle.producto_nombre}&rdquo; al almacén general.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() =>
                                    setModalConfirmacion({ abierto: false, detalle: null })
                                }
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarEliminarRepuesto}
                                disabled={procesando}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex justify-center items-center"
                            >
                                {procesando ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    'Sí, quitar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

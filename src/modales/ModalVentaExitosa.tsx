// src/modales/ModalVentaExitosa.tsx
import { Printer, Download, CheckCircle } from 'lucide-react';

interface DatosVenta {
    id: string;
    cliente: string;
    total: number;
}

interface Props {
    venta: DatosVenta | null;
    onVerPDF: () => void;
    onDescargarPDF: () => void;
    onCerrar: () => void;
}

export default function ModalVentaExitosa({ venta, onVerPDF, onDescargarPDF, onCerrar }: Props) {
    if (!venta) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">

                {/* --- HEADER VISUAL --- */}
                <div className="mb-6">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} strokeWidth={2.5} />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Venta Exitosa!</h2>
                    <p className="text-slate-500 mb-4">La operación se registró en el sistema.</p>

                    {/* --- CAJA DE DATOS CONGELADOS --- */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left space-y-1">
                        <p className="text-slate-700">
                            <span className="font-semibold text-slate-500">Cliente:</span> {venta.cliente}
                        </p>
                        <p className="text-slate-700">
                            <span className="font-semibold text-slate-500">Total Pagado:</span> S/ {venta.total.toFixed(2)}
                        </p>
                        <p className="text-slate-400 text-xs mt-2 pt-2 border-t border-slate-200">
                            Ticket: TCK-{venta.id.toString().substring(0, 8).toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* --- ACCIONES --- */}
                <div className="space-y-3 relative z-10">
                    <button
                        onClick={onVerPDF}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all shadow-md"
                    >
                        <Printer size={20} /> Previsualizar Ticket PDF
                    </button>

                    <button
                        onClick={onDescargarPDF}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all"
                    >
                        <Download size={20} /> Descargar PDF
                    </button>

                    <button
                        onClick={onCerrar}
                        className="w-full text-blue-600 hover:text-red-700 font-bold py-2 rounded-xl flex justify-center items-center mt-2 transition-all"
                    >
                        Cerrar y Hacer Nueva Venta
                    </button>
                </div>
            </div>
        </div>
    );
}
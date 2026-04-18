// src/modales/ModalVisorPDF.tsx
import { X, FileText } from 'lucide-react';

// ✨ Agregamos la interfaz para las Props
interface ModalVisorPDFProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
}

export default function ModalVisorPDF({ isOpen, onClose, pdfUrl }: ModalVisorPDFProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2 text-slate-800">
                        <FileText size={20} className="text-orange-600" />
                        <h2 className="text-lg font-bold">Vista Previa del Comprobante</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Contenedor del Iframe */}
                <div className="flex-1 bg-slate-300/50 p-2 md:p-4">
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full rounded-xl shadow-sm border border-slate-200 bg-white"
                            title="Visor PDF"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-500 font-medium">
                            Generando documento...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
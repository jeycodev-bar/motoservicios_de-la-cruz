// src/modales/ModalConfirmacion.tsx
import React, { memo, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, Trash2, MonitorOff } from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    titulo: string;
    /** Permite strings o JSX (ej. negritas en el mensaje) */
    mensaje: React.ReactNode;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'peligro' | 'advertencia' | 'info' | 'exito' | 'salir';
    /** Deshabilita botones mientras se ejecuta la acción */
    procesando?: boolean;
}

// ==========================================
// CONFIGURACIÓN DE ESTILOS
// ==========================================

const CONFIG = {
    peligro: {
        icono: <Trash2 size={24} className="text-red-600" />,
        bgIcono: 'bg-red-100',
        btnConfirmar: 'bg-red-600 hover:bg-red-700 focus:ring-red-200',
    },
    advertencia: {
        icono: <AlertTriangle size={24} className="text-amber-600" />,
        bgIcono: 'bg-amber-100',
        btnConfirmar: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200',
    },
    info: {
        icono: <Info size={24} className="text-blue-600" />,
        bgIcono: 'bg-blue-100',
        btnConfirmar: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200',
    },
    exito: {
        icono: <CheckCircle size={24} className="text-green-600" />,
        bgIcono: 'bg-green-100',
        btnConfirmar: 'bg-green-600 hover:bg-green-700 focus:ring-green-200',
    },
    salir: {
        icono: <MonitorOff size={24} className="text-rose-600" />,
        bgIcono: 'bg-rose-100',
        btnConfirmar: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200',
    },
} as const;

// ==========================================
// COMPONENTE
// ==========================================

const ModalConfirmacion = memo(({
    isOpen,
    onClose,
    onConfirm,
    titulo,
    mensaje,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    tipo = 'advertencia',
    procesando = false,
}: Props) => {

    // Bloquear scroll del body mientras el modal está abierto
    useEffect(() => {
        // ✅ Una sola asignación — el cleanup siempre restaura 'unset'
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const actual = CONFIG[tipo];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Cuerpo */}
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 p-3 rounded-full ${actual.bgIcono}`}>
                            {actual.icono}
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-extrabold text-slate-900 leading-tight mb-2">
                                {titulo}
                            </h3>
                            <div className="text-sm text-slate-600">
                                {mensaje}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pie */}
                <div className="px-6 py-4 bg-slate-100 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={procesando}
                        className="px-4 py-3 rounded-lg bg-rose-200 text-sm font-bold text-rose-900 hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
                    >
                        {textoCancelar}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={procesando}
                        className={`px-4 py-3 rounded-lg text-sm font-bold text-white shadow-sm transition-all focus:outline-none focus:ring-4 disabled:opacity-70 flex items-center gap-2 ${actual.btnConfirmar}`}
                    >
                        {procesando ? 'Procesando...' : textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
});

ModalConfirmacion.displayName = 'ModalConfirmacion';
export default ModalConfirmacion;
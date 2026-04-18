// src/modales/ModalRegistroVehiculoEspecifico.tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, Fingerprint, Package, CheckCircle2 } from 'lucide-react';
import { VehiculosService } from '../services/vehiculos';
import { normalizeError } from '../utils/errors';
import type { LotePendiente } from '../services/vehiculos';

// ==========================================
// TIPOS
// ==========================================

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onGuardado: () => void;
    lote: LotePendiente | null;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalRegistroVehiculoEspecifico({
    isOpen,
    onClose,
    onGuardado,
    lote,
}: Props) {
    const [chasis, setChasis] = useState('');
    const [motor, setMotor] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [faltantes, setFaltantes] = useState(0);

    // SSR-safe: createPortal requiere que el componente esté montado en el navegador
    const [isMounted, setIsMounted] = useState(false);

    const inputChasisRef = useRef<HTMLInputElement>(null);

    // ── Efecto 1: marcamos mount para habilitar createPortal ─────────────────
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // ── Efecto 2: reset del formulario al abrir con un lote nuevo ────────────
    useEffect(() => {
        if (!isOpen || !lote) return;
        setFaltantes(lote.cantidad_en_bodega - lote.chasis_registrados);
        setChasis('');
        setMotor('');
        setTimeout(() => inputChasisRef.current?.focus(), 100);
    }, [isOpen, lote]);

    // ── Efecto 3: bloqueo de scroll del body — separado del reset ────────────
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lote || !chasis || !motor) return;

        setIsSaving(true);
        try {
            await VehiculosService.registrarVehiculoFisico(lote.lote_id, chasis, motor);

            const nuevosFaltantes = faltantes - 1;
            setFaltantes(nuevosFaltantes);
            onGuardado();

            if (nuevosFaltantes <= 0) {
                onClose();
            } else {
                setChasis('');
                setMotor('');
                inputChasisRef.current?.focus();
            }
        } catch (e: unknown) {
            // ✅ toast.error en lugar de alert() — catch tipado + normalizeError
            const msg = normalizeError(
                e,
                'Es probable que este CHASIS o MOTOR ya esté registrado.'
            );
            toast.error(msg);
            inputChasisRef.current?.select();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !lote || !isMounted) return null;

    const esUltimoRegistro = faltantes <= 1;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[50] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Cabecera */}
                <div className="bg-amber-500 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-amber-100 hover:text-white bg-amber-600/50 hover:bg-amber-600 p-1 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                            <Package size={32} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-tight mb-1">
                                Asignar Identidad a Lote
                            </h2>
                            <p className="font-medium text-amber-50 leading-snug">
                                {lote.producto_nombre}
                            </p>
                            <div className="inline-block mt-2 bg-amber-700/40 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                                Color: {lote.color ?? 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contador de progreso */}
                <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-amber-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-amber-500" />
                        Unidades Faltantes
                    </span>
                    <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full font-black text-lg">
                        {faltantes}
                    </span>
                </div>

                {/* Formulario de escaneo continuo */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            Número de CHASIS (VIN)
                        </label>
                        <div className="relative">
                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={20} />
                            <input
                                ref={inputChasisRef}
                                type="text"
                                required
                                disabled={isSaving}
                                value={chasis}
                                onChange={e => setChasis(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono text-lg focus:bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                                placeholder="Escanea el código de barras..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            Número de MOTOR
                        </label>
                        <div className="relative">
                            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={20} />
                            <input
                                type="text"
                                required
                                disabled={isSaving}
                                value={motor}
                                onChange={e => setMotor(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono text-lg focus:bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                                placeholder="Escanea el código de barras..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 mt-6 border-t border-slate-100">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl hover:bg-amber-500 font-bold shadow-lg shadow-slate-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:hover:bg-slate-900"
                        >
                            {isSaving
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : esUltimoRegistro ? 'Registrar y Finalizar' : 'Registrar y Siguiente'
                            }
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-wider">
                            {esUltimoRegistro
                                ? 'Presiona Enter para terminar'
                                : 'Presiona Enter para guardar rápidamente'}
                        </p>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
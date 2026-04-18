// src/modales/ModalRecargaStock.tsx
import React, { useEffect, useState } from 'react';
import {
    X,
    Package,
    PackagePlus,
    Save,
    CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecargarStock } from '../hooks/useRecargarStock';
import ErrorBanner from '../components/common/ErrorBanner';
import type { BodegaItemVista } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onGuardado: () => void;
    loteInfo: BodegaItemVista | null;
}

export default function ModalRecargarStock({
    isOpen,
    onClose,
    onGuardado,
    loteInfo,
}: Props) {
    const { usuario } = useAuth();
    const { ejecutar, loading, error, setError } = useRecargarStock();

    const [cantidad, setCantidad] = useState<string>('');

    useEffect(() => {
        if (!isOpen) {
            setCantidad('');
            setError(null);
        }
    }, [isOpen, setError]);

    if (!isOpen || !loteInfo) return null;

    const cantidadNum = Number(cantidad);
    const isInvalid =
        !cantidad ||
        Number.isNaN(cantidadNum) ||
        cantidadNum <= 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isInvalid) return;

        if (!usuario?.id) {
            setError('Sesión inválida');
            return;
        }

        const ok = await ejecutar(
            String(loteInfo.lote_id),
            cantidadNum,
            String(usuario.id)
        );

        if (ok) {
            onGuardado();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <PackagePlus size={24} />
                        <h2 className="text-xl font-bold">
                            Recargar Stock
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="bg-blue-700/50 p-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* CARD INFO */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="flex gap-3 items-start">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                <CheckCircle2 size={20} />
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800">
                                    {loteInfo.producto_nombre}
                                </h4>

                                <div className="flex gap-2 text-xs mt-1 flex-wrap">
                                    <span className="bg-slate-200 px-2 py-0.5 rounded">
                                        SKU: {loteInfo.sku}
                                    </span>

                                    {loteInfo.color && (
                                        <span className="bg-slate-200 px-2 py-0.5 rounded">
                                            Color: {loteInfo.color}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex items-center gap-1 text-sm font-bold text-slate-600">
                                    <Package size={14} />
                                    Stock actual:
                                    <span className="bg-white border px-2 rounded">
                                        {loteInfo.cantidad}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ERROR BACKEND */}
                    {error && (
                        <ErrorBanner
                            mensaje={error}
                            onReintentar={() => setError(null)}
                        />
                    )}

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div>
                            <label className="text-sm font-bold text-slate-700">
                                Cantidad a ingresar
                            </label>

                            <input
                                type="number"
                                min="1"
                                value={cantidad}
                                onChange={e => setCantidad(e.target.value)}
                                disabled={loading}
                                className="w-full mt-1 px-4 py-3 rounded-xl border bg-slate-50
                                           focus:bg-white focus:ring-2 focus:ring-blue-500/20
                                           focus:border-blue-500 outline-none text-lg font-bold
                                           transition-all disabled:opacity-60"
                                placeholder="Digite cantidad"
                            />

                            {isInvalid && cantidad && (
                                <p className="text-red-500 text-xs mt-1">
                                    La cantidad debe ser mayor a 0
                                </p>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-3 pt-2">

                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 border rounded-xl py-2.5 font-bold text-slate-600
                                           hover:bg-slate-50 transition disabled:opacity-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={loading || isInvalid}
                                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5
                                           font-bold flex justify-center items-center gap-2
                                           hover:bg-blue-700 transition shadow-md shadow-blue-600/20
                                           disabled:opacity-50"
                            >
                                <Save size={18} />
                                {loading ? 'Guardando...' : 'Confirmar'}
                            </button>

                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
// src/components/PeriodoInfo.tsx
// =============================================================================
// PeriodoInfo — Muestra al usuario exactamente qué fechas cubre cada período
// =============================================================================
//
// PROBLEMA QUE RESUELVE:
//   Cuando un usuario ve "Ventas del período: S/ 48,320" no sabe si eso es
//   de los últimos 7 días corridos, de la semana pasada, del mes calendario,
//   etc. Esto causa confusión al comparar con reportes externos o cierres
//   contables. Este componente lo hace explícito y sin ambigüedad.
//
// QUÉ MUESTRA:
//   - Fechas exactas de inicio y fin del período actual (en Lima)
//   - Fechas exactas del período anterior (para entender el "vs anterior")
//   - Número de días de cada período (siempre iguales → comparación justa)
//   - Nota aclaratoria sobre el criterio de taller (fecha_entrega)
//   - Hora de corte del día de hoy
//
// VARIANTES:
//   - compact: una línea, para el header del dashboard
//   - full: tooltip/panel expandido con todo el detalle
// =============================================================================

import { useState, useRef, useEffect, memo } from 'react';
import { CalendarDays, Info, X, Clock } from 'lucide-react';
import type { Periodo } from '../types/dashboard';
import { PERIODOS } from '../types/dashboard';
import {
    hoyEnLima,
    restarDiasLima,
    // inicioDelDiaUTC,
} from '../utils/fechas';

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/** Formatea "YYYY-MM-DD" → "lun 22 abr 2026" en Lima */
function formatFechaLima(fechaISO: string): string {
    // Parsear como fecha local Lima usando T05:00:00Z (mediodia Lima para evitar edge cases)
    const [y, m, d] = fechaISO.split('-').map(Number);
    const fecha = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('es-PE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Lima',
    }).format(fecha);
}

/** Formatea "YYYY-MM-DD" → "22/04/2026" */
function formatCorto(fechaISO: string): string {
    const [y, m, d] = fechaISO.split('-');
    return `${d}/${m}/${y}`;
}

// =============================================================================
// DATOS DEL PERÍODO — puro, sin estado
// =============================================================================

export interface DetallePeriodo {
    // Período actual
    inicioActual: string;   // "YYYY-MM-DD"
    finActual: string;      // "YYYY-MM-DD" (= hoy)
    diasActual: number;

    // Período anterior (para el "vs período anterior")
    inicioAnterior: string; // "YYYY-MM-DD"
    finAnterior: string;    // "YYYY-MM-DD" (= día antes del inicio actual)
    diasAnterior: number;

    // Hoy
    hoy: string;            // "YYYY-MM-DD"
    horaCorte: string;      // "HH:MM" Lima — hora actual
}

export function calcularDetallePeriodo(periodo: Periodo): DetallePeriodo {
    const dias = PERIODOS[periodo].dias;
    const hoy = hoyEnLima(); // "YYYY-MM-DD"

    // Mismo criterio que construirPeriodoParams:
    //   inicio = hoy - (N-1) días  →  N días total incluyendo hoy
    const inicioActual = restarDiasLima(hoy, dias - 1);
    const inicioAnterior = restarDiasLima(hoy, dias * 2 - 1);
    // finAnterior = día antes del inicio actual (último día del período anterior)
    const finAnterior = restarDiasLima(inicioActual, 1);

    const horaCorte = new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
    });

    return {
        inicioActual,
        finActual: hoy,
        diasActual: dias,
        inicioAnterior,
        finAnterior,
        diasAnterior: dias,
        hoy,
        horaCorte,
    };
}

// =============================================================================
// VERSIÓN COMPACTA — una línea para el header
// =============================================================================

interface PeriodoInfoCompactProps {
    periodo: Periodo;
    className?: string;
}

export const PeriodoInfoCompact = memo(function PeriodoInfoCompact({
    periodo,
    className = '',
}: PeriodoInfoCompactProps) {
    const d = calcularDetallePeriodo(periodo);
    return (
        <span className={`text-[11px] text-[#565b73] whitespace-nowrap ${className}`}>
            <span className="text-[#8a8fa8]">{formatCorto(d.inicioActual)}</span>
            <span className="mx-1 text-[#3a3f52]">→</span>
            <span className="text-[#8a8fa8]">{formatCorto(d.finActual)}</span>
            <span className="ml-1 text-[#3a3f52]">({d.diasActual}d)</span>
        </span>
    );
});

// =============================================================================
// PANEL COMPLETO — tooltip/popover con todo el detalle
// =============================================================================

interface PeriodoInfoPanelProps {
    periodo: Periodo;
}

export const PeriodoInfoPanel = memo(function PeriodoInfoPanel({
    periodo,
}: PeriodoInfoPanelProps) {
    const [abierto, setAbierto] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const d = calcularDetallePeriodo(periodo);

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!abierto) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [abierto]);

    // Cerrar con Escape
    useEffect(() => {
        if (!abierto) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [abierto]);

    return (
        <div className="relative" ref={panelRef}>
            {/* Trigger */}
            <button
                onClick={() => setAbierto(v => !v)}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                    border transition-all duration-150 select-none
                    ${abierto
                        ? 'bg-[#00b4d8]/10 border-[#00b4d8]/30 text-[#00b4d8]'
                        : 'bg-[#1a1d27] border-white/[0.07] text-[#565b73] hover:text-[#8a8fa8] hover:border-white/[0.14]'
                    }
                `}
                title="Ver fechas exactas del período"
            >
                <CalendarDays size={12} />
                <span className="hidden sm:inline">
                    {formatCorto(d.inicioActual)}
                    <span className="mx-1 opacity-50">—</span>
                    {formatCorto(d.finActual)}
                </span>
                <Info size={11} className="opacity-60" />
            </button>

            {/* Panel */}
            {abierto && (
                <div className="
                    absolute right-0 top-full mt-2 z-50
                    w-[340px] rounded-2xl
                    bg-[#13151c] border border-white/[0.10]
                    shadow-[0_8px_40px_rgba(0,0,0,0.6)]
                    animate-in fade-in slide-in-from-top-2 duration-150
                ">
                    {/* Header del panel */}
                    <div className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-white/[0.07]">
                        <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="text-[#00b4d8]" />
                            <span className="text-xs font-semibold text-[#eef0f6]">
                                ¿Qué cubre este período?
                            </span>
                        </div>
                        <button
                            onClick={() => setAbierto(false)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-[#565b73] hover:text-[#8a8fa8] transition-colors"
                        >
                            <X size={11} />
                        </button>
                    </div>

                    <div className="p-4 space-y-3">

                        {/* Período actual */}
                        <div className="rounded-xl bg-[#00b4d8]/[0.07] border border-[#00b4d8]/20 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#00b4d8]">
                                    Período actual — {PERIODOS[periodo].label}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00b4d8]/15 text-[#00b4d8]">
                                    {d.diasActual} días
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#565b73]">Desde</span>
                                    <span className="text-[#eef0f6] font-medium">
                                        {formatFechaLima(d.inicioActual)}
                                        <span className="text-[#565b73] ml-1 text-[10px]">00:00</span>
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#565b73]">Hasta</span>
                                    <span className="text-[#eef0f6] font-medium">
                                        {formatFechaLima(d.finActual)}
                                        <span className="text-[#00b4d8] ml-1 text-[10px] flex items-center gap-0.5 inline-flex">
                                            <Clock size={9} />{d.horaCorte}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] text-[#565b73] mt-2 leading-relaxed">
                                El día de hoy está <span className="text-[#8a8fa8]">incompleto</span> — solo incluye
                                lo registrado hasta las {d.horaCorte} (Lima). El total crece durante el día.
                            </p>
                        </div>

                        {/* Período anterior */}
                        <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#565b73]">
                                    Período anterior — "vs anterior"
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.07] text-[#565b73]">
                                    {d.diasAnterior} días
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#565b73]">Desde</span>
                                    <span className="text-[#8a8fa8]">{formatFechaLima(d.inicioAnterior)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#565b73]">Hasta</span>
                                    <span className="text-[#8a8fa8]">{formatFechaLima(d.finAnterior)}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-[#565b73] mt-2 leading-relaxed">
                                Mismo ancho exacto ({d.diasAnterior} días). Los porcentajes ▲▼ comparan
                                magnitudes equivalentes — no hay sesgo por períodos de distinto largo.
                            </p>
                        </div>

                        {/* Criterios de cálculo */}
                        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#565b73]">
                                Criterios de cálculo
                            </p>

                            <div className="space-y-1.5 text-[11px] text-[#565b73] leading-relaxed">
                                <div className="flex gap-2">
                                    <span className="text-[#00b4d8] shrink-0 mt-px">•</span>
                                    <span>
                                        <span className="text-[#8a8fa8] font-medium">Ventas:</span>{' '}
                                        se contabilizan por su <span className="text-[#8a8fa8]">fecha de registro</span> en el sistema.
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#06d6a0] shrink-0 mt-px">•</span>
                                    <span>
                                        <span className="text-[#8a8fa8] font-medium">Taller:</span>{' '}
                                        solo órdenes <span className="text-[#06d6a0]">ENTREGADAS</span> o{' '}
                                        <span className="text-[#06d6a0]">ARCHIVADAS</span> (pago confirmado).
                                        Se usa la <span className="text-[#8a8fa8]">fecha de entrega</span> como fecha de cobro.
                                        Incluye mano de obra + repuestos.
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#ffd166] shrink-0 mt-px">•</span>
                                    <span>
                                        <span className="text-[#8a8fa8] font-medium">Estado LISTO:</span>{' '}
                                        trabajo terminado pero <span className="text-[#ffd166]">pago no confirmado</span> aún.
                                        No se incluye en los totales del período ni en el balance del día.
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#8b8fa8] shrink-0 mt-px">•</span>
                                    <span>
                                        Todas las horas son en zona horaria{' '}
                                        <span className="text-[#8a8fa8]">Lima (UTC-5)</span>.
                                        Los días van de 00:00 a 23:59:59 Lima.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Ejemplo ilustrativo según el período activo */}
                        <EjemploPeriodo periodo={periodo} d={d} />

                    </div>
                </div>
            )}
        </div>
    );
});

// =============================================================================
// EJEMPLO ILUSTRATIVO
// =============================================================================

function EjemploPeriodo({
    periodo,
    d,
}: { periodo: Periodo; d: DetallePeriodo }) {
    const ejemplos: Record<Periodo, string> = {
        '7d': `Ideal para ver la semana laboral reciente. Compara esta semana contra la anterior. Si hoy es ${formatCorto(d.hoy)}, el período va del ${formatCorto(d.inicioActual)} al ${formatCorto(d.finActual)}.`,
        '30d': `Equivale aproximadamente a un mes comercial (4 semanas). Útil para cierres mensuales y comparar con el mes anterior.`,
        '90d': `Cubre un trimestre completo (~3 meses). Permite ver tendencias de temporada y comparar trimestres.`,
    };

    return (
        <div className="flex gap-2 bg-white/[0.02] rounded-lg px-3 py-2.5">
            <Info size={11} className="text-[#565b73] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#565b73] leading-relaxed">
                {ejemplos[periodo]}
            </p>
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT — el componente completo (botón + panel)
// =============================================================================

export default PeriodoInfoPanel;
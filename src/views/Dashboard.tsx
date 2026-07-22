// src/views/Dashboard.tsx
// =============================================================================
// Dashboard — versión de producción
// =============================================================================
//
// CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
//
//   1. TEMA CLARO/OSCURO
//      Todos los colores usan var(--token) de theme.tsx.
//      ThemeToggleButton en el header — persiste en localStorage.
//
//   2. MONTOS EXACTOS
//      fmt.moneda() muestra el valor completo con separadores de miles (es-PE).
//      fmt.monedaCorta() eliminado del dashboard — causaba pérdida de precisión.
//      Excepción: los ejes Y del gráfico de barras usan fmt.monedaEje() que
//      abrevia solo en los ticks del eje (no en tooltips ni en cards).
//
//   3. ARCHIVADAS ELIMINADAS
//      TallerResumen ya no incluye el campo archivadas[].
//      El historial completo está en el módulo "Historial de servicios de taller".
//
//   4. RENDIMIENTO
//      Montos y labels del gráfico memoizados con useMemo.
//      Componentes hoja envueltos en memo().
//      Sin subqueries N+1 (resuelto en el backend).
// =============================================================================

import React, {
    useState, useCallback, useEffect, memo, useMemo,
} from 'react';
import type { ChartData, ChartOptions } from 'chart.js';

import ChartComponent from '../components/Chart';
import PeriodoInfoPanel, { PeriodoInfoCompact } from '../components/PeriodoInfo';
import { ThemeToggleButton } from '../lib/theme';
import { useDashboard, tiempoRelativo } from '../hooks/useDashboard';
import { formatearFechaLocal } from '../utils/fechas';
import type {
    Periodo,
    KpiPrincipal,
    PuntoVentaDiaria,
    VentaCategoria,
    ProductoStockCritico,
    ActividadReciente,
    OrdenTallerResumen,
    TallerResumen,
    TopProducto,
} from '../types/dashboard';
import {
    PERIODOS,
    CATEGORIA_COLORES,
    ESTADO_ORDEN_CONFIG,
    NIVEL_STOCK_CONFIG,
    ACTIVIDAD_CONFIG,
    ESTADOS_KANBAN,
} from '../types/dashboard';
import {
    RefreshCcw,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    ShoppingCart,
    Wrench,
    DollarSign,
    Sun,
    Users,
} from 'lucide-react';

// =============================================================================
// TOKENS DE ESTILO — todos usan CSS variables del sistema de tema
// Jamás colores hardcodeados en className (excepto los colores de acento del
// negocio: azul, verde, rojo, amarillo — que son constantes de marca).
// =============================================================================

const S = {
    // Fondos
    root: 'bg-[var(--bg-root)]',
    card: 'bg-[var(--bg-card)] border border-[var(--border-card)]',
    inner: 'bg-[var(--bg-inner)]',
    hover: 'hover:bg-[var(--bg-hover)]',

    // Texto
    textPrimary: 'text-[var(--text-primary)]',
    textSecondary: 'text-[var(--text-secondary)]',
    textTertiary: 'text-[var(--text-tertiary)]',
    textMuted: 'text-[var(--text-muted)]',

    // Bordes
    borderCard: 'border-[var(--border-card)]',
    borderSubtle: 'border-[var(--border-subtle)]',
} as const;

// =============================================================================
// FORMATO DE MONTOS
// =============================================================================

/**
 * Moneda exacta con separadores de miles peruanos.
 * "S/ 2,467.00" — nunca "S/ 2.5k"
 */
const moneda = (n: number): string =>
    'S/ ' + n.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

/**
 * Solo para ticks del eje Y del gráfico de barras.
 * En un eje con 6 ticks, "S/ 12k" es más legible que "S/ 12,000.00".
 * NO se usa en cards, tooltips ni tablas.
 */
const monedaEje = (n: number): string => {
    if (n >= 1_000_000) return 'S/ ' + (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return 'S/ ' + (n / 1_000).toFixed(0) + 'k';
    return 'S/ ' + n.toFixed(0);
};

// =============================================================================
// SKELETON
// =============================================================================

const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-[var(--bg-inner)] rounded-2xl ${className}`} />;
});

// =============================================================================
// DELTA BADGE
// =============================================================================

const DeltaBadge = memo(function DeltaBadge({ pct }: { pct: number }) {
    if (pct > 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={10} />{Math.abs(pct).toFixed(1)}%
        </span>
    );
    if (pct < 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-500">
            <TrendingDown size={10} />{Math.abs(pct).toFixed(1)}%
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-subtle)] ${S.textSecondary}`}>
            <Minus size={10} />0%
        </span>
    );
});

// =============================================================================
// ROW 1 — KPI CARDS
// =============================================================================

interface KpiCardProps {
    label: string;
    value: string;
    delta: number;
    deltaTexto: string;
    color: string;
    icon: React.ReactNode;
}

const KpiCard = memo(function KpiCard({ label, value, delta: d, deltaTexto, color, icon }: KpiCardProps) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl p-5 ${S.card} cursor-default transition-colors hover:border-[var(--border-hover)]`}
            style={{ boxShadow: 'var(--shadow-card)' }}
        >
            <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: color }} />
            <div className="flex justify-between items-start mb-3">
                <p className={`text-[11px] font-medium uppercase tracking-[0.6px] ${S.textTertiary}`}>{label}</p>
                <div className="opacity-25">{icon}</div>
            </div>
            <p className="text-3xl font-semibold tracking-tight mb-2" style={{ color }}>{value}</p>
            <div className={`flex items-center gap-2 text-xs ${S.textSecondary}`}>
                <DeltaBadge pct={d} />
                <span>{deltaTexto}</span>
            </div>
        </div>
    );
});

// =============================================================================
// ROW 2 — VENTAS DIARIAS
// =============================================================================

const GraficoVentasDiarias = memo(function GraficoVentasDiarias({
    puntos, periodo,
}: { puntos: PuntoVentaDiaria[]; periodo: Periodo }) {
    const labels = useMemo(() => puntos.map(p => {
        const parts = p.fecha.split('-');
        if (parts.length !== 3) return p.fecha;
        const [, mes, dia] = parts;
        return periodo === '90d' ? `${dia}/${mes}` : `${parseInt(dia)}/${parseInt(mes)}`;
    }), [puntos, periodo]);

    const chartData: ChartData<'bar'> = useMemo(() => ({
        labels,
        datasets: [
            {
                label: 'Ventas',
                data: puntos.map(p => p.ventas),
                backgroundColor: 'rgba(0,180,216,0.55)',
                borderColor: '#00b4d8',
                borderWidth: 1, borderRadius: 3,
            },
            {
                label: 'Taller cobrado',
                data: puntos.map(p => p.taller),
                backgroundColor: 'rgba(6,214,160,0.45)',
                borderColor: '#06d6a0',
                borderWidth: 1, borderRadius: 3,
            },
        ],
    }), [labels, puntos]);

    const chartOptions: ChartOptions<'bar'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    // Tooltip: monto exacto
                    label: item => `${item.dataset.label}: ${moneda(item.raw as number)}`,
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: 'var(--chart-tick)',
                    font: { size: 10 },
                    maxRotation: labels.length > 20 ? 45 : 0,
                    autoSkip: labels.length > 20,
                    maxTicksLimit: 20,
                },
                grid: { color: 'var(--chart-grid)' },
                border: { color: 'var(--chart-border)' },
            },
            y: {
                ticks: {
                    color: 'var(--chart-tick)',
                    font: { size: 10 },
                    // Eje Y: abreviado para no saturar el espacio lateral
                    callback: v => monedaEje(v as number),
                },
                grid: { color: 'var(--chart-grid)' },
                border: { color: 'transparent' },
            },
        },
    }), [labels.length]);

    return (
        <div className={`${S.card} rounded-2xl p-5`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex justify-between items-center mb-4">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Ventas diarias</span>
                <div className="flex items-center gap-4">
                    <div className="flex gap-4">
                        {[
                            { color: '#00b4d8', label: 'Ventas directas' },
                            { color: '#06d6a0', label: 'Taller cobrado' },
                        ].map(({ color, label }) => (
                            <span key={label} className={`flex items-center gap-1.5 text-xs ${S.textSecondary}`}>
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                                {label}
                            </span>
                        ))}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] ${S.textSecondary}`}>
                        {PERIODOS[periodo].label}
                    </span>
                </div>
            </div>
            <div className="w-full h-[240px]">
                <ChartComponent
                    type="bar"
                    data={chartData}
                    options={chartOptions}
                    ariaLabel={`Gráfico de ventas diarias — ${PERIODOS[periodo].label}`}
                />
            </div>
        </div>
    );
});

// =============================================================================
// ROW 3 — BALANCE HOY
// =============================================================================

const BalanceHoyCard = memo(function BalanceHoyCard({ kpis }: { kpis: KpiPrincipal }) {
    const horaActual = new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima',
    });

    return (
        <div
            className={`relative overflow-hidden rounded-2xl p-5 ${S.card} cursor-default transition-colors`}
            style={{ borderColor: 'rgba(255,209,102,0.2)', boxShadow: 'var(--shadow-card)' }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffd166]/[0.04] to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#ffd166] to-[#fb923c]" />

            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className={`text-[11px] font-medium uppercase tracking-[0.6px] ${S.textTertiary}`}>
                        Balance de hoy
                    </p>
                    <p className={`text-[10px] mt-0.5 ${S.textTertiary}`}>Hasta las {horaActual} (Lima)</p>
                </div>
                <Sun size={18} className="text-[#ffd166] opacity-60" />
            </div>

            <p className="text-4xl font-semibold tracking-tight mb-4 text-[#ffd166]">
                {moneda(kpis.balance_hoy)}
            </p>

            <div className="grid grid-cols-2 gap-2">
                <div className={`${S.inner} rounded-xl p-2.5`}>
                    <p className={`text-[10px] mb-1 flex items-center gap-1 ${S.textTertiary}`}>
                        <ShoppingCart size={9} />Ventas
                    </p>
                    <p className={`text-sm font-semibold ${S.textPrimary}`}>{moneda(kpis.ventas_hoy)}</p>
                    <p className={`text-[10px] ${S.textSecondary}`}>{kpis.transacciones_hoy} trx</p>
                </div>

                <div className={`${S.inner} rounded-xl p-2.5`}>
                    <p className={`text-[10px] mb-1 flex items-center gap-1 ${S.textTertiary}`}>
                        <Wrench size={9} />Taller entregado
                    </p>
                    <p className={`text-sm font-semibold ${S.textPrimary}`}>{moneda(kpis.taller_hoy)}</p>
                    {kpis.taller_hoy > 0 ? (
                        <div className="mt-1.5 space-y-0.5">
                            {[
                                { label: 'Mano obra', value: kpis.mano_obra_hoy },
                                { label: 'Repuestos', value: kpis.repuestos_taller_hoy },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between text-[9px]">
                                    <span className={S.textTertiary}>{label}</span>
                                    <span className={S.textSecondary}>{moneda(value)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`text-[10px] italic ${S.textTertiary}`}>Sin entregas hoy</p>
                    )}
                </div>
            </div>

            <p className={`text-[9px] mt-3 leading-relaxed ${S.textTertiary}`}>
                Solo incluye órdenes <span className={S.textSecondary}>entregadas</span> hoy.
                Las órdenes en LISTO son cobros pendientes de confirmar.
            </p>
        </div>
    );
});

// =============================================================================
// ROW 3 — GRÁFICO CATEGORÍAS
// =============================================================================

const GraficoCategorias = memo(function GraficoCategorias({
    categorias,
}: { categorias: VentaCategoria[] }) {
    const totalGeneral = useMemo(() => categorias.reduce((a, c) => a + c.total, 0), [categorias]);

    const chartData: ChartData<'doughnut'> = useMemo(() => ({
        labels: categorias.map(c => c.nombre),
        datasets: [{
            data: categorias.map(c => c.total),
            backgroundColor: CATEGORIA_COLORES.slice(0, categorias.length),
            borderWidth: 0,
            hoverOffset: 8,
        }],
    }), [categorias]);

    const chartOptions: ChartOptions<'doughnut'> = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: item => {
                        const pct = totalGeneral > 0
                            ? ((item.raw as number / totalGeneral) * 100).toFixed(1)
                            : '0.0';
                        return `${item.label}: ${moneda(item.raw as number)} (${pct}%)`;
                    },
                },
            },
        },
    }), [totalGeneral]);

    return (
        <div
            className={`${S.card} rounded-2xl p-5 flex flex-col h-full`}
            style={{ boxShadow: 'var(--shadow-card)' }}
        >
            <div className="flex justify-between items-center mb-4">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Por categoría</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] ${S.textSecondary}`}>
                    distribución
                </span>
            </div>

            <div className="flex justify-center mb-4">
                <div className="relative w-[160px] h-[160px] shrink-0">
                    <ChartComponent
                        type="doughnut"
                        data={chartData}
                        options={chartOptions}
                        ariaLabel="Distribución de ventas por categoría"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={`text-lg font-semibold ${S.textPrimary}`}>{moneda(totalGeneral)}</span>
                        <span className={`text-[10px] ${S.textSecondary}`}>total</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border-card)]">
                {categorias.map((cat, i) => {
                    const color = CATEGORIA_COLORES[i] ?? '#8b8fa8';
                    const barPct = totalGeneral > 0 ? (cat.total / totalGeneral) * 100 : 0;
                    return (
                        <div key={cat.nombre} className="group">
                            <div className="flex items-center gap-2 py-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                <span className={`flex-1 text-xs truncate transition-colors group-hover:${S.textPrimary} ${S.textSecondary}`}>
                                    {cat.nombre}
                                </span>
                                <span className={`text-[11px] ${S.textTertiary}`}>{cat.cantidad} und.</span>
                                <span className={`text-xs font-semibold w-20 text-right ${S.textPrimary}`}>
                                    {moneda(cat.total)}
                                </span>
                                <span className="text-[11px] font-semibold w-10 text-right" style={{ color }}>
                                    {cat.porcentaje.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-[2px] bg-[var(--border-subtle)] rounded-full mb-0.5">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${barPct}%`, background: color }}
                                />
                            </div>
                        </div>
                    );
                })}
                {categorias.length === 0 && (
                    <p className={`text-xs text-center py-6 ${S.textTertiary}`}>Sin datos para el período</p>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// ROW 4 — KANBAN TALLER
// =============================================================================

const COLUMNAS_KANBAN = ESTADOS_KANBAN.map(estado => ({
    estado,
    label: ESTADO_ORDEN_CONFIG[estado].label,
    color: ESTADO_ORDEN_CONFIG[estado].color,
}));

const TarjetaOrden = memo(function TarjetaOrden({
    orden, onClick,
}: { orden: OrdenTallerResumen; onClick: () => void }) {
    const total = orden.costo_mano_obra + orden.total_repuestos;
    return (
        <button
            onClick={onClick}
            className={`w-full text-left ${S.inner} border ${S.borderCard} rounded-lg p-2.5 mb-1.5 last:mb-0 transition-colors hover:border-[var(--border-hover)] ${S.hover}`}
        >
            <p className={`text-xs font-medium truncate ${S.textPrimary}`}>{orden.vehiculo_info}</p>
            <p className={`text-[11px] mt-0.5 truncate ${S.textSecondary}`}>{orden.motivo_ingreso}</p>
            <div className="flex justify-between items-center mt-1.5">
                <span className="text-[11px] font-semibold text-[#06d6a0]">{moneda(total)}</span>
                <span className={`text-[10px] ${S.textTertiary}`}>{tiempoRelativo(orden.fecha_ingreso)}</span>
            </div>
        </button>
    );
});

const KanbanTaller = memo(function KanbanTaller({
    taller, onOrdenClick,
}: { taller: TallerResumen; onOrdenClick: (o: OrdenTallerResumen) => void }) {
    const ordenesKanban = useMemo(
        () => taller.ordenes.filter(o =>
            ESTADOS_KANBAN.includes(o.estado as typeof ESTADOS_KANBAN[number])
        ),
        [taller.ordenes],
    );

    return (
        <div className={`${S.card} rounded-2xl p-5`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex justify-between items-center mb-4">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Taller — estado de órdenes</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] ${S.textSecondary}`}>
                    {ordenesKanban.length} activas
                </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {COLUMNAS_KANBAN.map(col => {
                    const ordenes = ordenesKanban.filter(o => o.estado === col.estado);
                    return (
                        <div key={col.estado} className="bg-[var(--bg-subtle)] rounded-xl p-2.5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-medium uppercase tracking-[0.5px]" style={{ color: col.color }}>
                                    {col.label}
                                </span>
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--bg-inner)] ${S.textPrimary}`}>
                                    {ordenes.length}
                                </span>
                            </div>
                            {ordenes.slice(0, 4).map(orden => (
                                <TarjetaOrden key={orden.id} orden={orden} onClick={() => onOrdenClick(orden)} />
                            ))}
                            {ordenes.length > 4 && (
                                <p className={`text-[11px] text-center py-1 ${S.textTertiary}`}>
                                    +{ordenes.length - 4} más
                                </p>
                            )}
                            {ordenes.length === 0 && (
                                <p className={`text-[11px] text-center py-3 italic ${S.textTertiary}`}>
                                    Sin órdenes
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={`flex gap-4 mt-3.5 pt-3 border-t border-[var(--border-subtle)]`}>
                <span className={`text-xs ${S.textSecondary}`}>
                    <strong className={S.textPrimary}>{ordenesKanban.length}</strong> activas
                </span>
                <span className={`text-xs ${S.textSecondary}`}>
                    Ingresos del mes:{' '}
                    <strong className="text-[#06d6a0]">{moneda(taller.ingresos_mes)}</strong>
                </span>
                <span className={`text-xs ${S.textTertiary}`}>(entregas cobradas, inc. repuestos)</span>
            </div>
        </div>
    );
});

// =============================================================================
// ROW 5 — STOCK CRÍTICO
// =============================================================================

const PanelStockCritico = memo(function PanelStockCritico({
    productos, onVerTodos,
}: { productos: ProductoStockCritico[]; onVerTodos: () => void }) {
    const agotados = useMemo(() => productos.filter(p => p.nivel === 'AGOTADO'), [productos]);
    const criticos = useMemo(() => productos.filter(p => p.nivel !== 'AGOTADO'), [productos]);

    return (
        <div className={`${S.card} rounded-2xl p-5 flex flex-col`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex justify-between items-center mb-4">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Stock crítico</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agotados.length > 0
                    ? 'bg-red-500/10 text-red-500'
                    : `bg-[var(--bg-subtle)] ${S.textSecondary}`
                    }`}>
                    {agotados.length > 0 ? `${agotados.length} agotados` : `${productos.length} alertas`}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border-card)] space-y-3">
                {agotados.length > 0 && (
                    <section>
                        <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-red-500/70 mb-1.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            Agotados ({agotados.length})
                        </p>
                        <div className="space-y-1.5">
                            {agotados.map(p => (
                                <div key={p.id} className="flex items-center gap-2.5 bg-red-500/[0.04] rounded-lg px-2.5 py-2 border border-red-500/10">
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${S.textPrimary}`}>{p.nombre}</p>
                                        <p className={`text-[10px] ${S.textTertiary}`}>{p.sku ?? '—'}</p>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 shrink-0">
                                        Agotado
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {criticos.length > 0 && (
                    <section>
                        {agotados.length > 0 && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#ffd166]/70 mb-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd166] inline-block" />
                                Stock bajo ({criticos.length})
                            </p>
                        )}
                        <div className="space-y-2">
                            {criticos.map(p => {
                                const cfg = NIVEL_STOCK_CONFIG[p.nivel as keyof typeof NIVEL_STOCK_CONFIG];
                                const pct = Math.min(p.stock_minimo > 0 ? (p.cantidad_actual / p.stock_minimo) * 100 : 0, 100);
                                const barColor = p.nivel === 'CRITICO' ? '#ffd166' : '#00b4d8';
                                return (
                                    <div key={p.id} className="flex items-center gap-2.5">
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs truncate ${S.textPrimary}`}>{p.nombre}</p>
                                            <p className={`text-[10px] ${S.textTertiary}`}>{p.sku ?? '—'}</p>
                                            <div className="h-[3px] bg-[var(--border-card)] rounded-full mt-1">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, background: barColor }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                                style={{ background: cfg.bg, color: cfg.color }}
                                            >
                                                {cfg.label}
                                            </span>
                                            <span className={`text-[10px] ${S.textSecondary}`}>
                                                {p.cantidad_actual}/{p.stock_minimo}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {productos.length === 0 && (
                    <p className={`text-xs text-center py-8 ${S.textTertiary}`}>
                        No hay productos con stock crítico
                    </p>
                )}
            </div>

            <button
                onClick={onVerTodos}
                className="mt-4 w-full py-2 text-xs font-medium rounded-xl bg-red-500/[0.08] border border-red-500/25 text-red-500 hover:bg-red-500/15 transition-colors"
            >
                Ver reporte completo ({productos.length})
            </button>
        </div>
    );
});

// =============================================================================
// ROW 5 — ACTIVIDAD RECIENTE
// =============================================================================

const PanelActividad = memo(function PanelActividad({
    actividad,
}: { actividad: ActividadReciente[] }) {
    return (
        <div className={`${S.card} rounded-2xl p-5 flex flex-col`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex justify-between items-center mb-4">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Actividad reciente</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] ${S.textSecondary}`}>
                    últimos 7 días
                </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border-card)]">
                {actividad.map(a => {
                    const cfg = ACTIVIDAD_CONFIG[a.tipo as keyof typeof ACTIVIDAD_CONFIG];
                    return (
                        <div key={a.id} className={`flex gap-2.5 py-2 border-b border-[var(--border-subtle)] last:border-0`}>
                            <div
                                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5"
                                style={{ background: cfg.bg, color: cfg.color }}
                            >
                                {cfg.icono}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${S.textPrimary}`}>{a.descripcion}</p>
                                <p className={`text-[11px] truncate ${S.textSecondary}`}>{a.detalle}</p>
                            </div>
                            <div className="text-right shrink-0">
                                {a.monto !== null && a.tipo !== 'KARDEX' && (
                                    <p className="text-[11px] font-semibold text-[#06d6a0]">{moneda(a.monto)}</p>
                                )}
                                {a.tipo === 'KARDEX' && a.monto !== null && (
                                    <p className="text-[11px] font-semibold text-[#ffd166]">+{a.monto} u.</p>
                                )}
                                <p className={`text-[10px] mt-0.5 ${S.textTertiary}`}>{tiempoRelativo(a.fecha)}</p>
                            </div>
                        </div>
                    );
                })}
                {actividad.length === 0 && (
                    <p className={`text-xs text-center py-8 ${S.textTertiary}`}>Sin actividad reciente</p>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// ROW 6 — RESUMEN DEL PERÍODO
// =============================================================================

const PanelMiniStats = memo(function PanelMiniStats({ kpis }: { kpis: KpiPrincipal }) {
    const filas = [
        { label: 'Ticket promedio', value: moneda(kpis.ticket_promedio) },
        { label: 'Motos vendidas', value: `${kpis.motos_vendidas} und.` },
        { label: 'Clientes nuevos', value: String(kpis.clientes_nuevos) },
        { label: 'Total transacciones', value: String(kpis.transacciones) },
        { label: 'Ingresos taller', value: moneda(kpis.ingresos_taller), green: true },
    ] as const;

    return (
        <div className={`${S.card} rounded-2xl p-5`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className={`text-sm font-semibold mb-3 ${S.textPrimary}`}>Resumen del período</p>
            {filas.map(f => (
                <div
                    key={f.label}
                    className={`flex justify-between items-center py-2 border-b border-[var(--border-subtle)] last:border-0 text-xs`}
                >
                    <span className={S.textSecondary}>{f.label}</span>
                    <span className={`font-semibold ${'green' in f && f.green ? 'text-[#06d6a0]' : S.textPrimary}`}>
                        {f.value}
                    </span>
                </div>
            ))}
        </div>
    );
});

// =============================================================================
// ROW 6 — TOP PRODUCTOS
// =============================================================================

const PanelTopProductos = memo(function PanelTopProductos({
    productos,
}: { productos: TopProducto[] }) {
    const rankColor = (i: number) =>
        i === 0 ? '#ffd166' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : undefined;

    return (
        <div className={`${S.card} rounded-2xl p-5`} style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex justify-between items-center mb-3">
                <span className={`text-sm font-semibold ${S.textPrimary}`}>Top productos</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] ${S.textSecondary}`}>
                    por facturación
                </span>
            </div>
            <div>
                {productos.slice(0, 10).map((p, i) => {
                    const rc = rankColor(i);
                    return (
                        <div
                            key={`${p.nombre}-${i}`}
                            className={`flex items-center gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0`}
                        >
                            <span
                                className="text-xs font-bold w-5 text-center"
                                style={{ color: rc ?? 'var(--text-tertiary)' }}
                            >
                                {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${S.textPrimary}`}>{p.nombre}</p>
                                <p className={`text-[10px] ${S.textTertiary}`}>{p.categoria ?? '—'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-xs font-semibold ${S.textPrimary}`}>{moneda(p.total_generado)}</p>
                                <p className={`text-[10px] ${S.textTertiary}`}>{p.cantidad_vendida} und.</p>
                            </div>
                        </div>
                    );
                })}
                {productos.length === 0 && (
                    <p className={`text-xs text-center py-6 ${S.textTertiary}`}>Sin datos para el período</p>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// MODAL — Orden de Taller
// =============================================================================

const ModalOrdenTaller = memo(function ModalOrdenTaller({
    orden, onClose,
}: { orden: OrdenTallerResumen; onClose: () => void }) {
    const est = ESTADO_ORDEN_CONFIG[orden.estado as keyof typeof ESTADO_ORDEN_CONFIG] ?? ESTADO_ORDEN_CONFIG.PENDIENTE;
    const total = orden.costo_mano_obra + orden.total_repuestos;

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-150"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`${S.card} rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-3 duration-200`}
                style={{ boxShadow: 'var(--shadow-popover)' }}
            >
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className={`text-base font-semibold ${S.textPrimary}`}>{orden.vehiculo_info}</p>
                        <p className={`text-xs mt-1 ${S.textSecondary}`}>
                            {orden.cliente_nombre}
                            <span className="mx-1.5">·</span>
                            <span className="font-semibold" style={{ color: est.color }}>{est.label}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-subtle)] hover:bg-red-500/15 hover:text-red-500 ${S.textSecondary} transition-colors text-sm`}
                    >
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                        { label: 'Motivo', value: orden.motivo_ingreso },
                        { label: 'Mecánico', value: orden.mecanico ?? '—' },
                        { label: 'Fecha ingreso', value: formatearFechaLocal(orden.fecha_ingreso) },
                        { label: 'Fecha estimada', value: orden.fecha_estimada ? formatearFechaLocal(orden.fecha_estimada) : '—' },
                        { label: 'Fecha entrega', value: orden.fecha_entrega ? formatearFechaLocal(orden.fecha_entrega) : '—' },
                    ].map(f => (
                        <div key={f.label}>
                            <p className={`text-[10px] uppercase tracking-[0.4px] mb-0.5 ${S.textTertiary}`}>{f.label}</p>
                            <p className={`text-xs font-medium ${S.textPrimary}`}>{f.value}</p>
                        </div>
                    ))}
                </div>

                <div className={`${S.inner} rounded-xl p-3`}>
                    {[
                        { label: 'Mano de obra', value: moneda(orden.costo_mano_obra) },
                        { label: 'Repuestos', value: moneda(orden.total_repuestos) },
                    ].map(f => (
                        <div key={f.label} className="flex justify-between text-xs py-1">
                            <span className={S.textSecondary}>{f.label}</span>
                            <span className={S.textPrimary}>{f.value}</span>
                        </div>
                    ))}
                    <div className={`flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-[var(--border-subtle)]`}>
                        <span className={S.textSecondary}>Total</span>
                        <span className="text-[#06d6a0]">{moneda(total)}</span>
                    </div>
                </div>

                {(orden.estado === 'ENTREGADO' || orden.estado === 'ARCHIVADO') && (
                    <p className={`text-[10px] mt-3 text-center ${S.textTertiary}`}>
                        Orden cobrada y cerrada — el monto no puede modificarse.
                    </p>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// MODAL — Stock Completo
// =============================================================================

const ModalStockCompleto = memo(function ModalStockCompleto({
    productos, onClose,
}: { productos: ProductoStockCritico[]; onClose: () => void }) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);

    const agotados = useMemo(() => productos.filter(p => p.nivel === 'AGOTADO'), [productos]);
    const otros = useMemo(() => productos.filter(p => p.nivel !== 'AGOTADO'), [productos]);

    return (
        <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-150"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`${S.card} rounded-2xl p-6 w-full max-w-lg animate-in slide-in-from-bottom-3 duration-200`}
                style={{ boxShadow: 'var(--shadow-popover)' }}
            >
                <div className="flex justify-between items-start mb-5">
                    <div>
                        <p className={`text-base font-semibold ${S.textPrimary}`}>Reporte de stock crítico</p>
                        <p className={`text-xs mt-1 ${S.textSecondary}`}>
                            {agotados.length} agotados · {otros.length} con stock bajo
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-subtle)] hover:bg-red-500/15 hover:text-red-500 ${S.textSecondary} transition-colors text-sm`}
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto max-h-[440px] pr-1 space-y-1">
                    {productos.map(p => {
                        const cfg = NIVEL_STOCK_CONFIG[p.nivel as keyof typeof NIVEL_STOCK_CONFIG];
                        return (
                            <div key={p.id} className={`flex items-center gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${S.textPrimary}`}>{p.nombre}</p>
                                    <p className={`text-[10px] ${S.textTertiary}`}>{p.sku ?? '—'} · {p.categoria}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[11px] ${S.textSecondary}`}>
                                        {p.cantidad_actual}/{p.stock_minimo}
                                    </span>
                                    <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                        {cfg.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

// =============================================================================
// COMPONENTE RAÍZ
// =============================================================================

const Dashboard: React.FC = () => {
    const { data, loading, error, periodo, setPeriodo, refresh, lastUpdate } = useDashboard();

    const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTallerResumen | null>(null);
    const [mostrarModalStock, setMostrarModalStock] = useState(false);

    const handleOrdenClick = useCallback((o: OrdenTallerResumen) => setOrdenSeleccionada(o), []);
    const handleCerrarOrden = useCallback(() => setOrdenSeleccionada(null), []);

    const fechaHoy = new Date().toLocaleDateString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/Lima',
    });

    if (error && !data) {
        return (
            <div className={`${S.root} min-h-screen flex items-center justify-center`}>
                <div className={`flex flex-col items-center gap-4 ${S.textSecondary}`}>
                    <AlertTriangle size={32} className="text-red-500" />
                    <p className="text-sm">{error}</p>
                    <button
                        onClick={refresh}
                        className="px-5 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-sm hover:bg-red-500/15 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const showSkeletons = loading && !data;

    return (
        <div className={`${S.root} min-h-screen`}>
            <div className="px-7 py-6 max-w-[1600px] mx-auto space-y-3">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className={`text-xl font-semibold tracking-tight ${S.textPrimary}`}>Dashboard</h1>
                        <div className={`flex items-center gap-3 mt-1`}>
                            <p className={`text-xs capitalize ${S.textSecondary}`}>{fechaHoy}</p>
                            <span className={S.textMuted}>·</span>
                            <PeriodoInfoCompact periodo={periodo} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {lastUpdate && (
                            <span className={`text-[11px] whitespace-nowrap ${S.textTertiary}`}>
                                Actualizado {tiempoRelativo(lastUpdate)}
                            </span>
                        )}
                        {/* Selector de período */}
                        <div className={`flex ${S.inner} border border-[var(--border-card)] rounded-lg overflow-hidden`}>
                            {(Object.keys(PERIODOS) as Periodo[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodo(p)}
                                    className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${periodo === p
                                        ? 'bg-[var(--accent-blue)] text-white'
                                        : `${S.textSecondary} hover:${S.textPrimary} ${S.hover}`
                                        }`}
                                >
                                    {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
                                </button>
                            ))}
                        </div>
                        {/* Info del período */}
                        <PeriodoInfoPanel periodo={periodo} />
                        {/* Toggle de tema claro/oscuro */}
                        <ThemeToggleButton />
                        {/* Refrescar */}
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${S.inner} border border-[var(--border-hover)] ${S.textSecondary} text-xs font-medium hover:${S.textPrimary} ${S.hover} disabled:opacity-50 transition-colors`}
                        >
                            <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* ── ROW 1 — KPIs ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {showSkeletons
                        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                        : data && (
                            <>
                                <KpiCard
                                    label="Ventas del período"
                                    value={moneda(data.kpis.ventas_total)}
                                    delta={data.kpis.ventas_delta_pct}
                                    deltaTexto="vs período anterior"
                                    color="var(--accent-blue)"
                                    icon={<ShoppingCart size={18} />}
                                />
                                <KpiCard
                                    label="Transacciones"
                                    value={String(data.kpis.transacciones)}
                                    delta={data.kpis.transacciones_delta_pct}
                                    deltaTexto="vs período anterior"
                                    color="var(--accent-yellow)"
                                    icon={<DollarSign size={18} />}
                                />
                                <KpiCard
                                    label="Ingresos taller"
                                    value={moneda(data.kpis.ingresos_taller)}
                                    delta={data.kpis.taller_delta_pct}
                                    deltaTexto="vs período anterior"
                                    color="var(--accent-green)"
                                    icon={<Wrench size={18} />}
                                />
                                <KpiCard
                                    label="Clientes activos"
                                    value={String(data.kpis.clientes_activos)}
                                    delta={
                                        data.kpis.clientes_nuevos > 0
                                            ? (data.kpis.clientes_nuevos / Math.max(data.kpis.clientes_activos - data.kpis.clientes_nuevos, 1)) * 100
                                            : 0
                                    }
                                    deltaTexto={`+${data.kpis.clientes_nuevos} nuevos`}
                                    color="var(--accent-red)"
                                    icon={<Users size={18} />}
                                />
                            </>
                        )
                    }
                </div>

                {/* ── ROW 2 — Ventas diarias ──────────────────────────────── */}
                {showSkeletons
                    ? <Skeleton className="h-[320px]" />
                    : data && <GraficoVentasDiarias puntos={data.ventas_diarias} periodo={periodo} />
                }

                {/* ── ROW 3 — Balance hoy + Categorías ───────────────────── */}
                <div className="grid grid-cols-[360px_1fr] gap-3">
                    {showSkeletons ? (
                        <><Skeleton className="h-[340px]" /><Skeleton className="h-[340px]" /></>
                    ) : data && (
                        <>
                            <BalanceHoyCard kpis={data.kpis} />
                            <GraficoCategorias categorias={data.por_categoria} />
                        </>
                    )}
                </div>

                {/* ── ROW 4 — Kanban Taller ───────────────────────────────── */}
                {showSkeletons
                    ? <Skeleton className="h-64" />
                    : data && <KanbanTaller taller={data.taller} onOrdenClick={handleOrdenClick} />
                }

                {/* ── ROW 5 — Stock crítico + Actividad ──────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    {showSkeletons ? (
                        <><Skeleton className="h-80" /><Skeleton className="h-80" /></>
                    ) : data && (
                        <>
                            <PanelStockCritico
                                productos={data.stock_critico}
                                onVerTodos={() => setMostrarModalStock(true)}
                            />
                            <PanelActividad actividad={data.actividad_reciente} />
                        </>
                    )}
                </div>

                {/* ── ROW 6 — Resumen + Top productos ────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                    {showSkeletons ? (
                        <><Skeleton className="h-52" /><Skeleton className="h-52" /></>
                    ) : data && (
                        <>
                            <PanelMiniStats kpis={data.kpis} />
                            <PanelTopProductos productos={data.top_productos} />
                        </>
                    )}
                </div>

            </div>

            {/* ── Modales ─────────────────────────────────────────────────── */}
            {ordenSeleccionada && (
                <ModalOrdenTaller orden={ordenSeleccionada} onClose={handleCerrarOrden} />
            )}
            {mostrarModalStock && data && (
                <ModalStockCompleto
                    productos={data.stock_critico}
                    onClose={() => setMostrarModalStock(false)}
                />
            )}
        </div>
    );
};

export default Dashboard;
// src/components/Chart.tsx
// =============================================================================
// ChartComponent — wrapper de Chart.js
// =============================================================================
//
// Usa 'chart.js/auto' — se auto-registra internamente.
// Esto elimina cualquier problema de módulo duplicado con Vite + React.lazy:
// no importa cómo se dividan los chunks, el registro siempre ocurre.
//
// El impacto en bundle size es mínimo para una app desktop Tauri donde el
// tamaño del ejecutable no es una restricción crítica.
//
// ARQUITECTURA DE DOS EFECTOS:
//   Efecto 1 (deps: [type]) — Crea/destruye la instancia Chart.js.
//     Chart.getChart(canvas) destruye cualquier instancia huérfana antes
//     de crear una nueva — resuelve el race condition de React StrictMode.
//   Efecto 2 (deps: [data, options]) — Actualización suave sin recrear canvas.
//     update('none') redibuja sin animación de entrada.
// =============================================================================

import { useEffect, useRef, memo } from 'react';
import { Chart } from 'chart.js/auto';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface ChartComponentProps {
    type: ChartType;
    data: ChartData;
    options?: ChartOptions;
    className?: string;
    ariaLabel?: string;
}

// =============================================================================
// COMPONENTE
// =============================================================================

function ChartComponentBase({
    type,
    data,
    options,
    className,
    ariaLabel,
}: ChartComponentProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    // ── Efecto 1: Inicialización y destrucción ────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Destruir instancia conocida
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        // Destruir instancia huérfana en el canvas (React StrictMode double-mount)
        const orphan = Chart.getChart(canvas);
        if (orphan) orphan.destroy();

        chartRef.current = new Chart(ctx, {
            type,
            data: typeof structuredClone === 'function'
                ? structuredClone(data)
                : JSON.parse(JSON.stringify(data)) as ChartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options,
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    // ── Efecto 2: Actualización suave ─────────────────────────────────────────
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        chart.data = data;
        chart.options = {
            responsive: true,
            maintainAspectRatio: false,
            ...options,
        };
        chart.update('none');
    }, [data, options]);

    return (
        <div
            className={`relative w-full h-full ${className ?? ''}`}
            role="img"
            aria-label={ariaLabel}
        >
            <canvas ref={canvasRef} />
        </div>
    );
}

const ChartComponent = memo(ChartComponentBase);
ChartComponent.displayName = 'ChartComponent';

export default ChartComponent;
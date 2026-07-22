// src/hooks/useDashboard.ts
// =============================================================================
// Hook principal del Dashboard + hooks granulares + utilidades de formato
// =============================================================================
//
// ARQUITECTURA DE FECHAS:
//   El frontend es el único que conoce la TZ del usuario (Lima, UTC-5).
//   El backend Rust/SQLite es agnóstico al timezone: recibe strings UTC
//   ya calculados aquí y filtra con >= / <.
//
//   NUNCA se usa getDate() / getMonth() raw del navegador para construir
//   fechas de consulta, porque esas funciones operan en la TZ local del OS,
//   que puede diferir de Lima. Toda aritmética de fechas Lima se delega a
//   las funciones puras de fechas.ts.
//
// PARÁMETROS DE PERÍODO enviados al backend:
//   inicio     → 00:00 Lima del día de inicio (UTC)
//   inicio_ant → 00:00 Lima del inicio del período anterior (para deltas)
//   inicio_hoy → 00:00 Lima de hoy (UTC) — para balance del día
//   fin_hoy    → 00:00 Lima de mañana (UTC) — extremo superior EXCLUSIVO
//   inicio_mes → 00:00 Lima del 1ro del mes actual (UTC) — para ingresos_mes
//   dias       → entero, ancho del período
//
// EXTREMO SUPERIOR EXCLUSIVO (fin_hoy):
//   Todas las queries SQL usan `fecha >= inicio AND fecha < fin_hoy`.
//   Esto garantiza que:
//   1. El período actual y el anterior tienen exactamente el mismo ancho en días.
//   2. No se incluyen registros con timestamp > 23:59:59.999 Lima de hoy.
//   3. Los deltas son comparables (manzanas con manzanas).
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    hoyEnLima,
    primerDiaDelMesEnLima,
    restarDiasLima,
    inicioDelDiaUTC,
    finExclusivoDelDiaUTC,
    formatearFechaLocal,
} from '../utils/fechas';
import type {
    DashboardData,
    Periodo,
    KpiPrincipal,
    TallerResumen,
    ProductoStockCritico,
    ActividadReciente,
    VentaCategoria,
    PuntoVentaDiaria,
    TopProducto,
} from '../types/dashboard';

// =============================================================================
// CONSTANTES
// =============================================================================

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos

// =============================================================================
// PERÍODO — construcción de parámetros
// =============================================================================

/**
 * Parámetros de período enviados al comando Tauri.
 * Todos los timestamps son UTC en formato "YYYY-MM-DD HH:MM:SS" para SQLite.
 */
export interface PeriodoParams {
    /** 00:00 Lima del primer día del período (UTC) */
    inicio: string;
    /** 00:00 Lima del inicio del período anterior — mismo ancho que el actual (UTC) */
    inicio_ant: string;
    /** 00:00 Lima de hoy (UTC) — inicio del día actual para balance */
    inicio_hoy: string;
    /**
     * 00:00 Lima de mañana (UTC) — extremo superior EXCLUSIVO.
     * Usar siempre como: `fecha < fin_hoy` para cerrar el intervalo.
     */
    fin_hoy: string;
    /** 00:00 Lima del primer día del mes actual (UTC) — para ingresos_mes del taller */
    inicio_mes: string;
    /** Ancho del período en días (7, 30 o 90) */
    dias: number;
}

/**
 * Construye los PeriodoParams para un período dado.
 *
 * DEFINICIÓN DE "N días":
 *   El período cubre exactamente N días calendario Lima, siendo el último
 *   día SIEMPRE hoy (incompleto hasta la hora actual).
 *
 *   Fórmula:  inicio = hoy - (N-1) días
 *   Intervalo: [inicio 00:00 Lima, mañana 00:00 Lima)  →  N días exactos
 *
 * Ejemplo para '7d' ejecutado el sábado 2026-04-25 en Lima:
 *   dias        = 7
 *   inicio      = "2026-04-19 05:00:00"  (00:00 Lima 19/04, domingo)
 *   inicio_ant  = "2026-04-12 05:00:00"  (00:00 Lima 12/04, domingo)
 *   inicio_hoy  = "2026-04-25 05:00:00"  (00:00 Lima 25/04, sábado)
 *   fin_hoy     = "2026-04-26 05:00:00"  (00:00 Lima 26/04) ← EXCLUSIVO
 *   inicio_mes  = "2026-04-01 05:00:00"  (00:00 Lima 01/04)
 *
 *   Días en gráfico: 19,20,21,22,23,24,25 → exactamente 7 barras ✓
 *
 * Por qué (N-1) y no N:
 *   Con N=7 y hoy=25:  restar 7 → inicio=18 → días: 18,19,20,21,22,23,24,25 = 8 ✗
 *   Con N=7 y hoy=25:  restar 6 → inicio=19 → días: 19,20,21,22,23,24,25    = 7 ✓
 *   El día de hoy ya cuenta como 1, por eso se restan N-1 días anteriores.
 */
export function construirPeriodoParams(periodo: Periodo): PeriodoParams {
    const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90;

    // Siempre desde Lima — nunca getDate() del navegador
    const hoy = hoyEnLima();                        // "2026-04-25"
    const inicioP = restarDiasLima(hoy, dias - 1);     // hoy + N-1 días atrás = N días total
    const inicioAnt = restarDiasLima(hoy, dias * 2 - 1); // período anterior, mismo ancho
    const inicioMes = primerDiaDelMesEnLima();             // "2026-04-01"

    return {
        inicio: inicioDelDiaUTC(inicioP),
        inicio_ant: inicioDelDiaUTC(inicioAnt),
        inicio_hoy: inicioDelDiaUTC(hoy),
        fin_hoy: finExclusivoDelDiaUTC(hoy),          // extremo superior exclusivo
        inicio_mes: inicioDelDiaUTC(inicioMes),
        dias,
    };
}

// =============================================================================
// HOOK GENÉRICO useInvoke<T>
// =============================================================================

interface UseInvokeOptions<P> {
    command: string;
    params?: P;
    autoFetch?: boolean;
}

interface UseInvokeReturn<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

/**
 * Hook genérico para invocar un comando Tauri.
 * Maneja race conditions mediante un contador de generación.
 */
export function useInvoke<
    T,
    P extends Record<string, unknown> = Record<string, unknown>,
>(
    { command, params, autoFetch = true }: UseInvokeOptions<P>,
    deps: readonly unknown[] = [],
): UseInvokeReturn<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState<string | null>(null);
    const generacionRef = useRef(0);

    const cargar = useCallback(async () => {
        generacionRef.current += 1;
        const miGeneracion = generacionRef.current;

        setLoading(true);
        setError(null);

        try {
            const resultado = await invoke<T>(command, params ?? {});
            if (generacionRef.current !== miGeneracion) return;
            setData(resultado);
        } catch (err) {
            if (generacionRef.current !== miGeneracion) return;
            setError(
                typeof err === 'string'
                    ? err
                    : err instanceof Error
                        ? err.message
                        : `Error al invocar ${command}`,
            );
        } finally {
            if (generacionRef.current === miGeneracion) setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [command, ...deps]);

    useEffect(() => {
        if (autoFetch) cargar();
    }, [cargar, autoFetch]);

    return { data, loading, error, refresh: cargar };
}

// =============================================================================
// HOOK PRINCIPAL — useDashboard
// =============================================================================

interface DashboardHookReturn {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    periodo: Periodo;
    lastUpdate: Date | null;
    setPeriodo: (p: Periodo) => void;
    refresh: () => void;
}

export function useDashboard(periodoInicial: Periodo = '30d'): DashboardHookReturn {
    const [periodo, setPeriodo] = useState<Periodo>(periodoInicial);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const lastRefreshRef = useRef<number>(Date.now());

    const periodoParams = construirPeriodoParams(periodo);

    const { data, loading, error, refresh: cargarInterno } = useInvoke<DashboardData>(
        {
            command: 'get_dashboard_data',
            params: { params: periodoParams } as unknown as Record<string, unknown>,
        },
        [periodo],
    );

    useEffect(() => {
        if (data) setLastUpdate(new Date());
    }, [data]);

    // Refrescar al volver a la ventana si pasaron más de 60s
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) return;
            if (Date.now() - lastRefreshRef.current > 60_000) {
                cargarInterno();
                lastRefreshRef.current = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [cargarInterno]);

    // Auto-refresh periódico
    useEffect(() => {
        const timer = setInterval(() => {
            if (!document.hidden) {
                cargarInterno();
                lastRefreshRef.current = Date.now();
            }
        }, AUTO_REFRESH_MS);
        return () => clearInterval(timer);
    }, [cargarInterno]);

    const refresh = useCallback(() => {
        lastRefreshRef.current = Date.now();
        cargarInterno();
    }, [cargarInterno]);

    return { data, loading, error, periodo, lastUpdate, setPeriodo, refresh };
}

// =============================================================================
// HOOKS GRANULARES
// =============================================================================

export function useKpis(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    return useInvoke<KpiPrincipal>(
        { command: 'get_kpis', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
}

export function useTallerResumen(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    return useInvoke<TallerResumen>(
        { command: 'get_taller_resumen', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
}

export function useStockCritico() {
    const result = useInvoke<ProductoStockCritico[]>({ command: 'get_stock_critico' });
    const stock = result.data ?? [];
    return {
        ...result,
        stock,
        counts: {
            agotados: stock.filter(p => p.nivel === 'AGOTADO').length,
            criticos: stock.filter(p => p.nivel === 'CRITICO').length,
            bajos: stock.filter(p => p.nivel === 'BAJO').length,
            total: stock.length,
        },
    };
}

export function useActividadReciente(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    const result = useInvoke<ActividadReciente[]>(
        { command: 'get_actividad_reciente', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
    return { ...result, actividad: result.data ?? [] };
}

export function useVentasPorCategoria(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    const result = useInvoke<VentaCategoria[]>(
        { command: 'get_ventas_por_categoria', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
    return { ...result, categorias: result.data ?? [] };
}

export function useVentasPorDia(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    const result = useInvoke<PuntoVentaDiaria[]>(
        { command: 'get_ventas_por_dia', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
    return { ...result, puntos: result.data ?? [] };
}

export function useTopProductos(periodo: Periodo) {
    const params = construirPeriodoParams(periodo);
    const result = useInvoke<TopProducto[]>(
        { command: 'get_top_productos', params: { params } as unknown as Record<string, unknown> },
        [periodo],
    );
    return { ...result, productos: result.data ?? [] };
}

// =============================================================================
// UTILIDADES DE FORMATO
// =============================================================================

/**
 * Tiempo relativo desde ahora, corrigiendo el parsing de fechas SQLite.
 * SQLite guarda 'YYYY-MM-DD HH:MM:SS' sin sufijo Z.
 * Añadimos 'Z' para forzar interpretación UTC.
 */
export function tiempoRelativo(fechaSQLite: string | Date): string {
    if (!fechaSQLite) return '—';

    let ms: number;
    if (fechaSQLite instanceof Date) {
        ms = fechaSQLite.getTime();
    } else {
        const estandarizada =
            fechaSQLite.includes('Z') || fechaSQLite.includes('T')
                ? fechaSQLite
                : fechaSQLite.replace(' ', 'T') + 'Z';
        const d = new Date(estandarizada);
        if (isNaN(d.getTime())) return '—';
        ms = d.getTime();
    }

    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60_000);
    const horas = Math.floor(diff / 3_600_000);
    const dias = Math.floor(diff / 86_400_000);

    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    if (horas < 24) return `hace ${horas}h`;
    if (dias === 1) return 'ayer';
    return `hace ${dias} días`;
}

/** Re-exporta formatearFechaLocal para consumidores del hook */
export { formatearFechaLocal } from '../utils/fechas';

export const fmt = {
    moneda: (n: number) =>
        'S/ ' + n.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),

    monedaCorta: (n: number): string => {
        if (n >= 1_000_000) return 'S/ ' + (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return 'S/ ' + (n / 1_000).toFixed(1) + 'k';
        return 'S/ ' + n.toFixed(0);
    },

    delta: (pct: number) => (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%',

    relativo: tiempoRelativo,

    fecha: (fechaSQLite: string) => formatearFechaLocal(fechaSQLite),
};
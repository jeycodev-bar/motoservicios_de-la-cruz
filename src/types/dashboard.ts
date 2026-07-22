// src/types/dashboard.ts
// =============================================================================
// Tipos TypeScript del módulo Dashboard — espejo exacto de dashboard.rs
// =============================================================================
//
// ESTADO DEL TALLER — ciclo de vida:
//   PENDIENTE → EN_PROCESO → LISTO → [pago confirmado] → ENTREGADO → ARCHIVADO
//
//   PENDIENTE / EN_PROCESO : mutables, no contabilizados como ingreso.
//   LISTO                  : monto congelado, trabajo hecho, pago pendiente.
//   ENTREGADO              : pago confirmado, moto entregada. Ingreso realizado.
//   ARCHIVADO              : ENTREGADO movido al historial del módulo de Taller.
//                            El dashboard NO lo muestra — evita redundancia y
//                            carga innecesaria de cientos/miles de registros.
//
// CRITERIO CONTABLE:
//   - Ingresos taller = ENTREGADO + ARCHIVADO, fecha_entrega, mano_obra + repuestos.
//   - LISTO no es ingreso (cobro no confirmado aún).
// =============================================================================

// -----------------------------------------------------------------------------
// Período
// -----------------------------------------------------------------------------
export type Periodo = '7d' | '30d' | '90d';

export const PERIODOS: Record<Periodo, { label: string; dias: number }> = {
    '7d': { label: 'Últimos 7 días', dias: 7 },
    '30d': { label: 'Últimos 30 días', dias: 30 },
    '90d': { label: 'Últimos 90 días', dias: 90 },
};

// -----------------------------------------------------------------------------
// KPIs
// -----------------------------------------------------------------------------
export interface KpiPrincipal {
    ventas_total: number;
    ventas_total_anterior: number;
    ventas_delta_pct: number;
    transacciones: number;
    transacciones_anterior: number;
    transacciones_delta_pct: number;
    ingresos_taller: number;
    ingresos_taller_anterior: number;
    taller_delta_pct: number;
    clientes_activos: number;
    clientes_nuevos: number;
    ticket_promedio: number;
    motos_vendidas: number;
    balance_hoy: number;
    ventas_hoy: number;
    taller_hoy: number;
    mano_obra_hoy: number;
    repuestos_taller_hoy: number;
    transacciones_hoy: number;
}

// -----------------------------------------------------------------------------
// Gráfico ventas diarias
// -----------------------------------------------------------------------------
export interface PuntoVentaDiaria {
    fecha: string;
    ventas: number;
    taller: number;
}

// -----------------------------------------------------------------------------
// Ventas por categoría
// -----------------------------------------------------------------------------
export interface VentaCategoria {
    nombre: string;
    total: number;
    porcentaje: number;
    cantidad: number;
}

// -----------------------------------------------------------------------------
// Stock crítico
// -----------------------------------------------------------------------------
export type NivelStock = 'AGOTADO' | 'CRITICO' | 'BAJO';

export interface ProductoStockCritico {
    id: string;
    nombre: string;
    sku: string | null;
    categoria: string | null;
    marca: string | null;
    cantidad_actual: number;
    stock_minimo: number;
    porcentaje_stock: number;
    nivel: NivelStock;
}

// -----------------------------------------------------------------------------
// Actividad reciente
// -----------------------------------------------------------------------------
export type TipoActividad = 'VENTA' | 'TALLER' | 'KARDEX' | 'CLIENTE';

export interface ActividadReciente {
    id: string;
    tipo: TipoActividad;
    descripcion: string;
    detalle: string;
    monto: number | null;
    fecha: string;
    usuario: string | null;
}

// -----------------------------------------------------------------------------
// Taller
// -----------------------------------------------------------------------------
export type EstadoOrden =
    | 'PENDIENTE'
    | 'EN_PROCESO'
    | 'LISTO'
    | 'ENTREGADO'
    | 'ARCHIVADO';

/** Estados con ingreso realizado (pago confirmado). */
export const ESTADOS_INGRESO_REALIZADO: EstadoOrden[] = ['ENTREGADO', 'ARCHIVADO'];

/** Estados visibles como columnas en el tablero Kanban. */
export const ESTADOS_KANBAN: EstadoOrden[] = ['PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO'];

export interface OrdenTallerResumen {
    id: string;
    cliente_nombre: string;
    vehiculo_info: string;
    motivo_ingreso: string;
    estado: EstadoOrden;
    fecha_ingreso: string;
    fecha_estimada: string | null;
    fecha_entrega: string | null;
    costo_mano_obra: number;
    total_repuestos: number;
    mecanico: string | null;
}

export interface TallerResumen {
    /** Órdenes activas del Kanban (sin ARCHIVADO). */
    ordenes: OrdenTallerResumen[];
    total_pendiente: number;
    total_en_proceso: number;
    total_listo: number;
    total_entregado: number;
    /** Ingresos del mes: mano_obra + repuestos, ENTREGADO + ARCHIVADO. */
    ingresos_mes: number;
}

// -----------------------------------------------------------------------------
// Top productos
// -----------------------------------------------------------------------------
export interface TopProducto {
    nombre: string;
    sku: string | null;
    categoria: string | null;
    cantidad_vendida: number;
    total_generado: number;
}

// -----------------------------------------------------------------------------
// Respuesta completa
// -----------------------------------------------------------------------------
export interface DashboardData {
    kpis: KpiPrincipal;
    ventas_diarias: PuntoVentaDiaria[];
    por_categoria: VentaCategoria[];
    stock_critico: ProductoStockCritico[];
    actividad_reciente: ActividadReciente[];
    taller: TallerResumen;
    top_productos: TopProducto[];
    periodo_dias: number;
}

// =============================================================================
// CONFIGURACIÓN DE UI
// =============================================================================

export const CATEGORIA_COLORES: string[] = [
    '#e94560', '#00b4d8', '#06d6a0', '#ffd166',
    '#8b8fa8', '#a78bfa', '#fb923c', '#34d399',
];

export const ESTADO_ORDEN_CONFIG: Record<
    EstadoOrden,
    { label: string; color: string; bg: string; esKanban: boolean; esIngreso: boolean }
> = {
    PENDIENTE: { label: 'Pendiente', color: '#ffd166', bg: 'rgba(255,209,102,0.12)', esKanban: true, esIngreso: false },
    EN_PROCESO: { label: 'En proceso', color: '#00b4d8', bg: 'rgba(0,180,216,0.12)', esKanban: true, esIngreso: false },
    LISTO: { label: 'Listo', color: '#06d6a0', bg: 'rgba(6,214,160,0.12)', esKanban: true, esIngreso: false },
    ENTREGADO: { label: 'Entregado', color: '#8b8fa8', bg: 'rgba(139,143,168,0.12)', esKanban: true, esIngreso: true },
    ARCHIVADO: { label: 'Archivado', color: '#444', bg: 'rgba(68,68,68,0.12)', esKanban: false, esIngreso: true },
};

export const NIVEL_STOCK_CONFIG: Record<NivelStock, { label: string; color: string; bg: string }> = {
    AGOTADO: { label: 'Agotado', color: '#e94560', bg: 'rgba(233,69,96,0.15)' },
    CRITICO: { label: 'Crítico', color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
    BAJO: { label: 'Bajo', color: '#00b4d8', bg: 'rgba(0,180,216,0.10)' },
};

export const ACTIVIDAD_CONFIG: Record<TipoActividad, { icono: string; color: string; bg: string }> = {
    VENTA: { icono: 'V', color: '#00b4d8', bg: 'rgba(0,180,216,0.15)' },
    TALLER: { icono: 'T', color: '#06d6a0', bg: 'rgba(6,214,160,0.15)' },
    KARDEX: { icono: 'K', color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
    CLIENTE: { icono: 'C', color: '#e94560', bg: 'rgba(233,69,96,0.12)' },
};
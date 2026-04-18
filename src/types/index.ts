/**
 * types/index.ts — Entry point único para todos los tipos del sistema.
 *
 * REGLA DE USO: Los componentes, servicios y contextos SIEMPRE importan desde aquí:
 *   import type { Usuario, ProductoCatalogo, OrdenActiva } from '@/types';
 *
 * Nunca se importa directamente desde los sub-archivos en el código de la app.
 * Eso garantiza que mover o renombrar un tipo solo requiere cambiar este archivo.
 *
 * ESTRUCTURA:
 *   database.ts  → Entidades canónicas (tablas de SQLite)
 *   api.ts       → Contratos IPC Rust ↔ TypeScript (structs serializados)
 *   ventas.ts    → Tipos del módulo de ventas (carrito, filtros, resultado)
 *   taller.ts    → Tipos del módulo de taller (órdenes, repuestos)
 */

// ── Entidades de BD ───────────────────────────────────────────────────────────
export type {
    Categoria,
    Marca,
    Producto,
    ProductoVista,
    ProductoDTO,
    InventarioLote,
    InventarioRecienteVista,
    EstadoVehiculo,
    VehiculoFisico,
    Cliente,
    ClienteDTO,
    RolUsuario,
    Usuario,
    AuditoriaLog,
    TipoMovimiento
} from './database';

// ── Contratos IPC (Rust → TypeScript) ────────────────────────────────────────
export type {
    UsuarioSesion,
    PaginatedResponse,
    PaginacionResult,
    VentaHistorialDTO,
    RespuestaPaginadaVentas,
    ProductoCatalogo,
    CarritoItemPayload,
    BodegaItemVista,
    PaginatedBodega,
    KardexMovimiento,
    VehiculoFisicoDetalle,
    RespuestaPaginadaVehiculos,
} from './api';

// ── Módulo de Ventas ──────────────────────────────────────────────────────────
export type {
    ItemCarrito,
    ChasisDisponible,
    ClienteVenta,
    VentaExitosa,
    FiltrosVentas,
} from './ventas';

// ── Módulo de Taller ──────────────────────────────────────────────────────────
export type {
    EstadoOrden,
    OrdenActiva,
    CrearOrdenDTO,
    RepuestoCatalogo,
    DetalleOrden,
} from './taller';
// /src/components/TarjetaTallerOrden.tsx
import {
    Settings, User, Calendar, ArrowLeft, Wrench,
    CheckCircle, PackageOpen, Archive, Eye, Download,
} from 'lucide-react';
import type { OrdenActiva, EstadoOrden } from '../types';

// ==========================================
// TIPOS LOCALES
// ==========================================

/** Columna del tablero Kanban — define el estado que representa */
export interface ColumnaKanban {
    id: EstadoOrden;
    label: string;
}

/** Acciones posibles al procesar el comprobante de una orden entregada */
type AccionComprobante = 'VER' | 'DESCARGAR';

// ==========================================
// PROPS
// ==========================================

interface TarjetaTallerOrdenProps {
    orden: OrdenActiva;
    columna: ColumnaKanban;
    abrirHojaTrabajo: (orden: OrdenActiva) => void;
    cambiarEstado: (id: string, estado: EstadoOrden) => void;
    formatearFecha: (fecha: string | null | undefined) => string;
    solicitarEntrega: (orden: OrdenActiva) => void;
    archivarOrden: (id: string) => void;
    procesarComprobante: (orden: OrdenActiva, accion: AccionComprobante) => void;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function TarjetaTallerOrden({
    orden,
    columna,
    abrirHojaTrabajo,
    cambiarEstado,
    formatearFecha,
    solicitarEntrega,
    archivarOrden,
    procesarComprobante,
}: TarjetaTallerOrdenProps) {
    const esEntregado = columna.id === 'ENTREGADO';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col hover:border-orange-400 hover:shadow-md transition-all group relative overflow-hidden">
            {/* Cinta decorativa para ENTREGADO */}
            {esEntregado && (
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-300" />
            )}

            {/* Cabecera */}
            <div className="flex justify-between items-start mb-3">
                <span
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider ${esEntregado
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-slate-100 text-slate-500'
                        }`}
                >
                    #{orden.id.substring(0, 6)}
                </span>

                {/* Botón de configuración — oculto si ya está entregado */}
                {!esEntregado && (
                    <button
                        onClick={() => abrirHojaTrabajo(orden)}
                        className="text-slate-400 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Hoja de Trabajo y Costos"
                    >
                        <Settings size={18} />
                    </button>
                )}
            </div>

            {/* Título del vehículo */}
            <h3
                className={`font-bold text-base leading-tight mb-3 ${esEntregado ? 'text-slate-500' : 'text-slate-800'
                    }`}
            >
                {orden.vehiculo_info}
            </h3>

            {/* Datos del cliente y fechas */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} className="text-slate-400" />
                    <span className="font-medium truncate">{orden.cliente_nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={14} className="text-slate-400" />
                    <span>Ingreso: {formatearFecha(orden.fecha_ingreso)}</span>
                </div>
                {esEntregado && orden.fecha_entrega && (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span>Entregado: {formatearFecha(orden.fecha_entrega)}</span>
                    </div>
                )}
            </div>

            {/* Motivo de ingreso */}
            <div
                className={`p-2.5 rounded-lg border text-xs mb-4 line-clamp-2 italic ${esEntregado
                    ? 'bg-slate-100 border-slate-200 text-slate-500'
                    : 'bg-slate-50/50 border-slate-100 text-slate-600'
                    }`}
                title={orden.motivo_ingreso}
            >
                &ldquo;{orden.motivo_ingreso}&rdquo;
            </div>

            {/* Acciones de Estado */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-auto">
                {/* Retroceso de estado */}
                <div className="flex-1">
                    {columna.id === 'EN_PROCESO' && (
                        <button
                            onClick={() => cambiarEstado(orden.id, 'PENDIENTE')}
                            className="text-slate-400 hover:text-amber-600 p-1 rounded-full hover:bg-amber-50 transition-colors"
                            title="Devolver a Pendiente"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {columna.id === 'LISTO' && (
                        <button
                            onClick={() => cambiarEstado(orden.id, 'EN_PROCESO')}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                            title="Devolver a Taller"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                </div>

                {/* Avance y acciones finales */}
                <div>
                    {columna.id === 'PENDIENTE' && (
                        <button
                            onClick={() => cambiarEstado(orden.id, 'EN_PROCESO')}
                            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            A Taller <Wrench size={14} />
                        </button>
                    )}
                    {columna.id === 'EN_PROCESO' && (
                        <button
                            onClick={() => cambiarEstado(orden.id, 'LISTO')}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            Marcar Listo <CheckCircle size={14} />
                        </button>
                    )}
                    {columna.id === 'LISTO' && (
                        <button
                            onClick={() => solicitarEntrega(orden)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300"
                        >
                            Entregar <PackageOpen size={14} />
                        </button>
                    )}
                    {esEntregado && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => procesarComprobante(orden, 'VER')}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver Comprobante"
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                onClick={() => procesarComprobante(orden, 'DESCARGAR')}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Descargar Comprobante"
                            >
                                <Download size={16} />
                            </button>
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <button
                                onClick={() => archivarOrden(orden.id)}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1.5 transition-colors"
                                title="Mandar al Historial"
                            >
                                Archivar <Archive size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

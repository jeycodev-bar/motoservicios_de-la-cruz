// src/views/ControlVehiculos.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '../hooks/useDebounce';

// VehiculoFisicoDetalle ya está en @/types — LotePendiente es exclusivo del servicio vehiculos
import type { VehiculoFisicoDetalle } from '../types';
import { VehiculosService } from '../services/vehiculos';
import type { LotePendiente } from '../services/vehiculos';

import ModalRegistroVehiculoEspecifico from '../modales/ModalRegistroVehiculoEspecifico';
import {
    Fingerprint, Bike, Search, ChevronLeft, ChevronRight,
    CheckCircle2, ScanBarcode, X, AlertTriangle,
} from 'lucide-react';
import { formatearFechaLocal } from '../utils/fechas';
import { obtenerHexPorColor } from '../utils/colors'; //Utilidad Migrado

// ==========================================
// TIPOS
// ==========================================

type TabEstado = 'PENDIENTE' | 'DISPONIBLE' | 'VENDIDO';

interface FiltroState {
    pagina: number;
    busqueda: string;
    estado: TabEstado;
}

const LIMITE_POR_PAGINA = 50;

// ==========================================
// VISTA PRINCIPAL
// ==========================================

export default function ControlVehiculos() {

    const [vehiculos, setVehiculos] = useState<VehiculoFisicoDetalle[]>([]);
    const [lotesPendientes, setLotesPendientes] = useState<LotePendiente[]>([]);
    const [totalRegistros, setTotalRegistros] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [loteSeleccionado, setLoteSeleccionado] = useState<LotePendiente | null>(null);

    const [textoBusqueda, setTextoBusqueda] = useState<string>('');
    const [filtro, setFiltro] = useState<FiltroState>({
        pagina: 1,
        busqueda: '',
        estado: 'PENDIENTE',
    });

    // ✅ useDebounce — elimina el setTimeout manual del efecto de búsqueda
    const busquedaDebounced = useDebounce(textoBusqueda, 300);

    // Sincroniza el debounce al filtro (reinicia página si cambia el texto)
    useEffect(() => {
        setFiltro(prev => {
            if (prev.busqueda === busquedaDebounced) return prev;
            return { ...prev, busqueda: busquedaDebounced, pagina: 1 };
        });
    }, [busquedaDebounced]);

    // Motor de carga con AbortController — ya estaba bien implementado
    const cargarDatos = useCallback(async (filtrosActuales: FiltroState, signal: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            if (filtrosActuales.estado === 'PENDIENTE') {
                const data = await VehiculosService.obtenerLotesPendientesDeChasis();
                if (signal.aborted) return;
                const filtrados = filtrosActuales.busqueda
                    ? data.filter(l =>
                        l.producto_nombre.toLowerCase().includes(filtrosActuales.busqueda.toLowerCase()))
                    : data;
                setLotesPendientes(filtrados);
                setTotalRegistros(filtrados.length);
            } else {
                const respuesta = await VehiculosService.obtenerVehiculosFisicosPaginados(
                    filtrosActuales.pagina,
                    filtrosActuales.busqueda,
                    filtrosActuales.estado
                );
                if (signal.aborted) return;
                setVehiculos(respuesta.data);
                setTotalRegistros(respuesta.total_registros);
            }
        } catch (err: unknown) {
            if (signal.aborted) return;
            const msg = err instanceof Error ? err.message : 'No se pudieron cargar los datos.';
            setError(msg);
            toast.error(msg);
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        cargarDatos(filtro, ctrl.signal);
        return () => ctrl.abort();
    }, [filtro, cargarDatos]);

    // ✅ handleGuardadoExitoso sin fakeController — simplemente actualiza el filtro
    //    El cambio de referencia en el estado dispara el useEffect de carga
    const handleGuardadoExitoso = useCallback(() => {
        setFiltro(prev => ({ ...prev })); // Copia shallow — fuerza re-render del efecto
    }, []);

    // Paginación en memoria solo para PENDIENTES
    const lotesPendientesPaginados = lotesPendientes.slice(
        (filtro.pagina - 1) * LIMITE_POR_PAGINA,
        filtro.pagina * LIMITE_POR_PAGINA
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            <HeaderFlota />

            <FiltrosControl
                filtro={filtro}
                setFiltro={setFiltro}
                textoBusqueda={textoBusqueda}
                setTextoBusqueda={setTextoBusqueda}
                totalMuestra={totalRegistros}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px] flex flex-col">
                {loading && <OverlayCarga />}

                {error && (
                    <div className="m-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
                        <AlertTriangle size={20} />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <div className="overflow-x-auto flex-1">
                    {filtro.estado === 'PENDIENTE' ? (
                        <TablaLotesPendientes
                            lotes={lotesPendientesPaginados}
                            loading={loading}
                            onSeleccionarLote={setLoteSeleccionado}
                        />
                    ) : (
                        <TablaVehiculosFisicos vehiculos={vehiculos} loading={loading} />
                    )}
                </div>

                <PaginacionProfesional
                    filtro={filtro}
                    setFiltro={setFiltro}
                    totalRegistros={totalRegistros}
                    limitePorPagina={LIMITE_POR_PAGINA}
                />
            </div>

            <ModalRegistroVehiculoEspecifico
                isOpen={loteSeleccionado !== null}
                lote={loteSeleccionado}
                onClose={() => setLoteSeleccionado(null)}
                onGuardado={handleGuardadoExitoso}
            />
        </div>
    );
}

// ==========================================
// COMPONENTES SECUNDARIOS
// ==========================================

const HeaderFlota = () => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="bg-amber-100 p-2 rounded-xl text-amber-800 shadow-lg shadow-blue-200">
                    <Bike size={32} />
                </div>
                Control de Flota
            </h1>
            <p className="text-slate-500 font-medium mt-1">
                Gestión integral de unidades físicas y asignaciones de bodega.
            </p>
        </div>
    </div>
);

interface FiltrosControlProps {
    filtro: FiltroState;
    setFiltro: React.Dispatch<React.SetStateAction<FiltroState>>;
    textoBusqueda: string;
    setTextoBusqueda: React.Dispatch<React.SetStateAction<string>>;
    totalMuestra: number;
}

const FiltrosControl = ({ filtro, setFiltro, textoBusqueda, setTextoBusqueda, totalMuestra }: FiltrosControlProps) => {
    const TABS: TabEstado[] = ['PENDIENTE', 'DISPONIBLE', 'VENDIDO'];
    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={filtro.estado === 'PENDIENTE' ? 'Buscar producto en pendientes...' : 'Buscar por Chasis, Motor o Producto...'}
                        className="w-full pl-12 pr-10 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 outline-none font-medium transition-all"
                        value={textoBusqueda}
                        onChange={e => setTextoBusqueda(e.target.value)}
                    />
                    {textoBusqueda && (
                        <button
                            onClick={() => setTextoBusqueda('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Limpiar búsqueda"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
                <div className="flex bg-slate-200 p-1.5 rounded-xl w-full md:w-auto overflow-x-auto">
                    {TABS.map(est => (
                        <button
                            key={est}
                            onClick={() => setFiltro(prev => ({ ...prev, estado: est, pagina: 1 }))}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filtro.estado === est
                                    ? est === 'PENDIENTE'
                                        ? 'bg-amber-100 text-amber-800 shadow-sm'
                                        : 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {est === 'PENDIENTE' && <ScanBarcode size={16} />}
                            {est}
                        </button>
                    ))}
                </div>
            </div>
            <div className="text-sm font-bold text-slate-500 flex items-center gap-2 px-1">
                <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md">{totalMuestra}</span>
                {filtro.estado === 'PENDIENTE' ? 'Productos a la espera de chasis' : 'Vehículos encontrados en esta categoría'}
            </div>
        </div>
    );
};

const OverlayCarga = () => (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
);

interface PaginacionProfesionalProps {
    filtro: FiltroState;
    setFiltro: React.Dispatch<React.SetStateAction<FiltroState>>;
    totalRegistros: number;
    limitePorPagina: number;
}

const PaginacionProfesional = ({ filtro, setFiltro, totalRegistros, limitePorPagina }: PaginacionProfesionalProps) => {
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limitePorPagina));
    const inicio = totalRegistros === 0 ? 0 : (filtro.pagina - 1) * limitePorPagina + 1;
    const fin = Math.min(filtro.pagina * limitePorPagina, totalRegistros);
    return (
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">
                Mostrando <span className="font-bold text-slate-800">{inicio}</span> al{' '}
                <span className="font-bold text-slate-800">{fin}</span> de{' '}
                <span className="font-bold text-slate-800">{totalRegistros}</span>
                <span className="mx-2 text-slate-300">|</span>
                Página <span className="font-bold text-slate-800">{filtro.pagina}</span> de{' '}
                <span className="font-bold text-slate-800">{totalPaginas}</span>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={() => setFiltro(prev => ({ ...prev, pagina: Math.max(1, prev.pagina - 1) }))}
                    disabled={filtro.pagina === 1}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm text-sm font-bold text-slate-600"
                >
                    <ChevronLeft size={18} /> Anterior
                </button>
                <button
                    onClick={() => setFiltro(prev => ({ ...prev, pagina: prev.pagina + 1 }))}
                    disabled={filtro.pagina >= totalPaginas || totalRegistros === 0}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm text-sm font-bold text-slate-600"
                >
                    Siguiente <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

interface TablaLotesPendientesProps {
    lotes: LotePendiente[];
    loading: boolean;
    onSeleccionarLote: (lote: LotePendiente) => void;
}

const TablaLotesPendientes = ({ lotes, loading, onSeleccionarLote }: TablaLotesPendientesProps) => (
    <table className="w-full text-left border-collapse">
        <thead>
            <tr className="bg-primary text-slate-400 text-sm uppercase tracking-widest border-b border-amber-200/60">
                <th className="px-4 py-3 font-bold">Producto en Bodega</th>
                <th className="px-4 py-3 font-bold text-center">Variante / Color</th>
                <th className="px-4 py-3 font-bold text-center">Estado de Asignación</th>
                <th className="px-4 py-3 font-bold text-right">Acción</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {lotes.length === 0 && !loading && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                    No hay lotes pendientes de asignación. ¡Todo al día!
                </td></tr>
            )}
            {lotes.map(lote => {
                const faltantes = lote.cantidad_en_bodega - lote.chasis_registrados;
                return (
                    <tr key={lote.lote_id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{lote.producto_nombre}</td>
                        <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-bold text-[11px] uppercase border border-slate-200 shadow-sm">
                                <span
                                    className="w-3 h-3 rounded-full border border-slate-300 shadow-inner"
                                    style={{ backgroundColor: obtenerHexPorColor(lote.color) ?? undefined }}
                                />
                                {lote.color ?? 'N/A'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-amber-600 font-black text-[15px]">{faltantes}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Sin Registrar</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button
                                onClick={() => onSeleccionarLote(lote)}
                                className="inline-flex items-center gap-2 bg-blue-200 text-blue-800 hover:bg-blue-800 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                                <Fingerprint size={16} /> Asignar Chasis
                            </button>
                        </td>
                    </tr>
                );
            })}
        </tbody>
    </table>
);

interface TablaVehiculosFisicosProps {
    vehiculos: VehiculoFisicoDetalle[];
    loading: boolean;
}

const TablaVehiculosFisicos = ({ vehiculos, loading }: TablaVehiculosFisicosProps) => (
    <table className="w-full text-left border-collapse">
        <thead>
            <tr className="bg-slate-900 text-slate-400 text-sm uppercase tracking-widest border-b border-slate-200">
                <th className="px-4 py-3 font-bold">Vehículo</th>
                <th className="px-4 py-3 font-bold">N° Chasis (VIN)</th>
                <th className="px-4 py-3 font-bold">N° Motor</th>
                <th className="px-4 py-3 font-bold text-center">Estado</th>
                <th className="px-4 py-3 font-bold text-right">Ingreso</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {vehiculos.length === 0 && !loading && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    No se encontraron vehículos físicos con estos filtros.
                </td></tr>
            )}
            {vehiculos.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 leading-tight">{v.producto_nombre}</p>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase mt-1">
                            {v.marca_nombre}
                            <span className="mx-0.5 text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1">
                                <span
                                    className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-inner block"
                                    style={{ backgroundColor: obtenerHexPorColor(v.color) ?? undefined }}
                                />
                                {v.color ?? 'N/A'}
                            </span>
                        </p>
                    </td>
                    <td className="px-4 py-3 bg-blue-50/10">
                        <span className="font-mono text-[14px] font-bold text-slate-800 tracking-wider">{v.numero_chasis}</span>
                    </td>
                    <td className="px-4 py-3 bg-blue-50/10">
                        <span className="font-mono text-[14px] font-bold text-slate-700 tracking-wider">{v.numero_motor}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                        {v.estado === 'DISPONIBLE' ? (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200">
                                <CheckCircle2 size={14} /> DISPONIBLE
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200">
                                VENDIDO
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-medium text-slate-600">{formatearFechaLocal(v.fecha_ingreso)}</p>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
);
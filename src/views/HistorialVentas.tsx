// src/views/HistorialVentas.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Receipt, Eye, X, Calendar, User,
    Printer, Download, FilterX,
} from 'lucide-react';

import type { VentaHistorialDTO } from '../types';
import type { VentaDetalle } from '../services/ventas_service';
import type { DetalleTicket } from '../utils/pdfGenerator';

import { VentasService } from '../services/ventas_service';
import { generarTicketVentaPDF } from '../utils/pdfGenerator';
import ModalVisorPDF from '../modales/ModalVisorPDF';
import { formatearFechaLocal } from '../utils/fechas';
import { useDebounce } from '../hooks/useDebounce';
import { normalizeError } from '../utils/errors';

// ✅ Componentes UI compartidos
import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/common';

const LIMITE = 15;

export default function HistorialVentas() {

    const [ventas, setVentas] = useState<VentaHistorialDTO[]>([]);
    const [cargando, setCargando] = useState(false);
    const [errorVista, setErrorVista] = useState<string | null>(null);

    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const debouncedBusqueda = useDebounce(busquedaCliente, 300);

    const [paginaActual, setPaginaActual] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaHistorialDTO | null>(null);
    const [detalles, setDetalles] = useState<VentaDetalle[]>([]);
    const [pdfGeneradoUrl, setPdfGeneradoUrl] = useState<string | null>(null);
    const [procesandoPdf, setProcesandoPdf] = useState(false);

    const hayFiltrosFecha = Boolean(fechaInicio || fechaFin);

    const cargarHistorial = useCallback(async () => {
        setCargando(true);
        setErrorVista(null);
        try {
            const data = await VentasService.obtenerHistorialVentas({
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFin || undefined,
                busqueda_cliente: debouncedBusqueda || undefined,
                usuario_id: undefined,
                limite: LIMITE,
                offset: (paginaActual - 1) * LIMITE,
            });
            setVentas(data.items);
            setTotalRegistros(data.total_registros);
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al cargar el historial');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    }, [paginaActual, debouncedBusqueda, fechaInicio, fechaFin]);

    useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

    const handleCambiarFiltro = useCallback((setter: (v: string) => void) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setter(e.target.value);
            setPaginaActual(1);
        }, []);

    const limpiarFechas = useCallback(() => {
        // setBusquedaCliente('');
        setFechaInicio('');
        setFechaFin('');
        setPaginaActual(1);
    }, []);

    const verDetalle = useCallback(async (venta: VentaHistorialDTO) => {
        try {
            const data = await VentasService.obtenerDetalleVenta(venta.id);
            setDetalles(data);
            setVentaSeleccionada(venta);
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al cargar los detalles'));
        }
    }, []);

    const procesarTicket = useCallback(async (venta: VentaHistorialDTO, accion: 'DESCARGAR' | 'VER') => {
        setProcesandoPdf(true);
        try {
            const detallesPDF = await VentasService.obtenerDetalleVenta(venta.id);
            const url = generarTicketVentaPDF(venta, detallesPDF as DetalleTicket[], accion);
            if (accion === 'DESCARGAR') {
                toast.success('Comprobante descargado correctamente');
            } else if (accion === 'VER' && url) {
                setPdfGeneradoUrl(url);
            }
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al procesar el ticket PDF'));
        } finally {
            setProcesandoPdf(false);
        }
    }, []);

    const cerrarVisorPDF = useCallback(() => {
        if (pdfGeneradoUrl) URL.revokeObjectURL(pdfGeneradoUrl);
        setPdfGeneradoUrl(null);
    }, [pdfGeneradoUrl]);

    const totalPaginas = Math.ceil(totalRegistros / LIMITE);

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-80px)]">

            {/* Encabezado */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                            <Receipt className="text-emerald-600" size={28} strokeWidth={2.5} />
                        </div>
                        Historial de Ventas
                    </h1>
                    <p className="text-slate-500">Consulta de tickets emitidos y detalles de facturación.</p>
                </div>
            </div>

            {/* ✅ ErrorBanner */}
            {errorVista && (
                <ErrorBanner mensaje={errorVista} onReintentar={cargarHistorial} className="mb-4" />
            )}

            {/* Barra de filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 shrink-0 flex flex-wrap gap-4 items-end">

                {/* ✅ BuscadorInput */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Buscar Cliente / DNI</label>
                    {/* <BuscadorInput
                        value={busquedaCliente}
                        onChange={handleCambiarFiltro(setBusquedaCliente)}
                        placeholder="Nombre o DNI del cliente..."
                        rounded="lg"
                    /> */}
                    <BuscadorInput
                        value={busquedaCliente}
                        onChange={handleCambiarFiltro(setBusquedaCliente)}
                        onLimpiar={() => {
                            setBusquedaCliente('');
                            setPaginaActual(1);
                        }}
                        placeholder="Nombre o DNI del cliente..."
                        rounded="lg"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Desde</label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={handleCambiarFiltro(setFechaInicio)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Hasta</label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={handleCambiarFiltro(setFechaFin)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {hayFiltrosFecha && (
                    <button
                        onClick={limpiarFechas}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors font-medium"
                    >
                        <FilterX size={18} /> Limpiar fecha
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col relative">
                {cargando && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                    </div>
                )}

                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-primary z-10 shadow-sm">
                            <tr className="text-slate-400 text-sm border-b border-slate-200">
                                <th className="p-4 font-bold">Fecha / Hora</th>
                                <th className="p-4 font-bold">N° Ticket</th>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Vendedor</th>
                                <th className="p-4 font-bold text-right">Total</th>
                                <th className="p-4 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {!cargando && ventas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500">
                                        No se encontraron ventas con los filtros actuales.
                                    </td>
                                </tr>
                            )}
                            {ventas.map(v => (
                                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-slate-400 shrink-0" />
                                            {formatearFechaLocal(v.fecha)}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-sm text-slate-500">{v.id.substring(0, 8)}...</td>
                                    <td className="p-4 font-bold text-slate-800 max-w-[200px] truncate" title={v.cliente_nombre ?? undefined}>
                                        {v.cliente_nombre ?? 'Cliente General'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-2 truncate">
                                            <User size={14} className="text-blue-400 shrink-0" />
                                            {v.vendedor_nombre ?? 'Sistema'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-lg font-black text-emerald-600">
                                        S/ {v.total.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => verDetalle(v)} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Ver Detalle">
                                                <Eye size={20} />
                                            </button>
                                            <button onClick={() => procesarTicket(v, 'VER')} disabled={procesandoPdf} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50" title="Previsualizar PDF">
                                                <Printer size={20} />
                                            </button>
                                            <button onClick={() => procesarTicket(v, 'DESCARGAR')} disabled={procesandoPdf} className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors disabled:opacity-50" title="Descargar PDF">
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ✅ PaginacionTabla */}
                <PaginacionTabla
                    paginaActual={paginaActual}
                    totalPaginas={totalPaginas}
                    onAnterior={() => setPaginaActual(p => Math.max(1, p - 1))}
                    onSiguiente={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    cargando={cargando}
                    contador={
                        <span className="text-sm text-slate-600">
                            Mostrando <strong>{ventas.length}</strong> de <strong>{totalRegistros}</strong> registros
                        </span>
                    }
                />
            </div>

            {/* Modal de detalle */}
            {ventaSeleccionada && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b bg-slate-900 text-white shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Receipt size={20} className="text-emerald-400" /> Detalle de Venta
                                </h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">Ticket: {ventaSeleccionada.id}</p>
                            </div>
                            <button onClick={() => setVentaSeleccionada(null)} className="text-slate-400 hover:text-red-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-4 shrink-0">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Cliente</p>
                                <p className="font-bold text-slate-800 text-base truncate" title={ventaSeleccionada.cliente_nombre ?? undefined}>
                                    {ventaSeleccionada.cliente_nombre ?? 'Cliente General'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Atendido por</p>
                                <p className="font-bold text-blue-700 text-base flex items-center gap-1 truncate">
                                    <User size={14} /> {ventaSeleccionada.vendedor_nombre ?? 'Sistema'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase">Fecha</p>
                                <p className="font-medium text-slate-700">{formatearFechaLocal(ventaSeleccionada.fecha)}</p>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs font-bold text-slate-400 uppercase border-b border-slate-200">
                                        <th className="pb-2">Producto</th>
                                        <th className="pb-2 text-center">Cant.</th>
                                        <th className="pb-2 text-right">P. Unit</th>
                                        <th className="pb-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detalles.map((d, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3">
                                                <p className="font-bold text-slate-800 text-sm">{d.producto_nombre}</p>
                                                {d.color && <p className="text-xs text-slate-500">Color: {d.color}</p>}
                                                {d.numero_chasis && <p className="text-xs font-mono text-amber-600 font-bold mt-1">VIN: {d.numero_chasis}</p>}
                                            </td>
                                            <td className="py-3 text-center text-sm font-medium text-slate-600">{d.cantidad}</td>
                                            <td className="py-3 text-right text-sm text-slate-600">S/ {d.precio_unitario.toFixed(2)}</td>
                                            <td className="py-3 text-right text-sm font-bold text-slate-800">S/ {d.subtotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                            <span className="text-lg font-bold text-slate-500">TOTAL TICKET:</span>
                            <span className="text-3xl font-black text-emerald-600">S/ {ventaSeleccionada.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            <ModalVisorPDF
                isOpen={!!pdfGeneradoUrl}
                onClose={cerrarVisorPDF}
                pdfUrl={pdfGeneradoUrl}
            />
        </div>
    );
}
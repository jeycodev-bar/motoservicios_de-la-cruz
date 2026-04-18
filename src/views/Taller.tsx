// src/views/Taller.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Wrench, Plus, Clock, CheckCircle, PackageOpen,
    Loader2, LayoutDashboard, History, Columns3Cog,
} from 'lucide-react';

import { TallerService } from '../services/taller_service';
import { useAuth } from '../context/AuthContext';
import { formatearFechaLocal } from '../utils/fechas';
import { generarComprobantePDF } from '../utils/pdfGenerator';
import { normalizeError } from '../utils/errors';

import TarjetaTallerOrden, { ColumnaKanban } from '../components/TarjetaTallerOrden';
// ✅ FormOrden importado desde su fuente canónica — eliminada la duplicación local
import ModalTallerRecepcion, { FormOrden } from '../components/ModalTallerRecepcion';
import ModalTallerHojaTrabajo from '../components/ModalTallerHojaTrabajo';
import ModalTallerAcciones, {
    EstadoModalCantidad,
    EstadoModalConfirmacion,
} from '../components/ModalTallerAcciones';
import ModalConfirmarEntrega from '../components/ModalTallerConfirmarEntrega';
import TablaTallerHistorial from '../components/TablaTallerHistorial';
import ModalVisorPDF from '../modales/ModalVisorPDF';
import ModalConfirmacion from '../modales/ModalConfirmacion';
import ErrorBanner from '../components/common/ErrorBanner';

import type { OrdenActiva, DetalleOrden, EstadoOrden } from '../types';

// ==========================================
// TIPOS LOCALES
// ==========================================

interface EstadoModalEntrega {
    abierto: boolean;
    orden: OrdenActiva | null;
    detalles: DetalleOrden[];
}

// Tipo para el modal genérico de confirmación de acciones destructivas
interface EstadoModalConfirmarAccion {
    abierto: boolean;
    titulo: string;
    mensaje: React.ReactNode;
    onConfirm: (() => Promise<void>) | null;
    tipo?: 'peligro' | 'advertencia' | 'info' | 'exito' | 'salir';
}

// ==========================================
// CONSTANTES
// ==========================================

const COLUMNAS_KANBAN: (ColumnaKanban & {
    titulo: string;
    icon: React.ElementType;
    colorBorde: string;
    colorFondo: string;
    header: string;
})[] = [
        { id: 'PENDIENTE', label: 'Pendientes', titulo: 'Pendientes', icon: Clock, colorBorde: 'border-amber-200', colorFondo: 'bg-amber-50/50', header: 'bg-amber-100 text-amber-800' },
        { id: 'EN_PROCESO', label: 'En Taller', titulo: 'En Taller', icon: Wrench, colorBorde: 'border-blue-200', colorFondo: 'bg-blue-50/50', header: 'bg-blue-100 text-blue-800' },
        { id: 'LISTO', label: 'Listos', titulo: 'Listos', icon: CheckCircle, colorBorde: 'border-emerald-200', colorFondo: 'bg-emerald-50/50', header: 'bg-emerald-100 text-emerald-800' },
        { id: 'ENTREGADO', label: 'Entregados', titulo: 'Entregados', icon: PackageOpen, colorBorde: 'border-slate-200', colorFondo: 'bg-slate-50/50', header: 'bg-slate-200 text-slate-700' },
    ];

const FORM_VACIO: FormOrden = {
    cliente_id: '',
    vehiculo_info: '',
    motivo_ingreso: '',
    fecha_estimada: '',
};

const MODAL_ACCION_VACIO: EstadoModalConfirmarAccion = {
    abierto: false,
    titulo: '',
    mensaje: '',
    onConfirm: null,
};

// ==========================================
// VISTA PRINCIPAL
// ==========================================

export default function Taller() {
    const { usuario } = useAuth();
    const usuarioId = usuario?.id ?? 'SISTEMA';

    // ── Estado principal ──────────────────────────────────────────────────────
    const [ordenes, setOrdenes] = useState<OrdenActiva[]>([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [errorVista, setErrorVista] = useState<string | null>(null);

    // ── PDF ───────────────────────────────────────────────────────────────────
    const [pdfGeneradoUrl, setPdfGeneradoUrl] = useState<string | null>(null);

    // ── Modal de recepción ────────────────────────────────────────────────────
    const [modalAbierto, setModalAbierto] = useState(false);
    const [form, setForm] = useState<FormOrden>(FORM_VACIO);

    // ── Hoja de trabajo ───────────────────────────────────────────────────────
    const [ordenActiva, setOrdenActiva] = useState<OrdenActiva | null>(null);
    const [detallesOrden, setDetallesOrden] = useState<DetalleOrden[]>([]);
    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
    const [manoObra, setManoObra] = useState(0);

    // ── Modales de interacción de repuestos ───────────────────────────────────
    const [modalCantidad, setModalCantidad] = useState<EstadoModalCantidad>({ abierto: false, repuesto: null, cantidad: '1' });
    const [modalConfirmacion, setModalConfirmacion] = useState<EstadoModalConfirmacion>({ abierto: false, detalle: null });

    // ── Modal de confirmación de entrega ──────────────────────────────────────
    const [modalEntrega, setModalEntrega] = useState<EstadoModalEntrega>({ abierto: false, orden: null, detalles: [] });

    // ✅ Declarado ANTES de los handlers que lo usan (orden correcto)
    // ── Modal genérico para acciones destructivas (archivar, etc.) ────────────
    const [modalConfirmarAccion, setModalConfirmarAccion] = useState<EstadoModalConfirmarAccion>(MODAL_ACCION_VACIO);

    // ── Vista activa ──────────────────────────────────────────────────────────
    const [vistaActiva, setVistaActiva] = useState<'KANBAN' | 'HISTORIAL'>('KANBAN');

    // ==========================================
    // CARGA DE DATOS
    // ==========================================

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setErrorVista(null);
        try {
            const data = await TallerService.obtenerOrdenes();
            setOrdenes(data);
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al cargar el taller');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // Barrendero de órdenes viejas al montar — operación de escritura separada de la lectura
        TallerService.archivarOrdenesViejas();
        cargarDatos();
    }, [cargarDatos]);

    // ==========================================
    // HANDLERS — todos con useCallback para referencias estables
    // Esto permite que los modales con memo() no se re-renderizen
    // innecesariamente cuando el estado del padre cambia.
    // ==========================================

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setProcesando(true);
        try {
            await TallerService.crearOrden({ ...form, creado_por: usuarioId });
            toast.success('Orden de trabajo creada correctamente');
            setModalAbierto(false);
            setForm(FORM_VACIO);
            await cargarDatos();
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al crear la orden'));
        } finally {
            setProcesando(false);
        }
    }, [form, usuarioId, cargarDatos]);

    const cambiarEstado = useCallback(async (id: string, nuevoEstado: EstadoOrden) => {
        try {
            await TallerService.actualizarEstado(id, nuevoEstado);
            await cargarDatos();
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al cambiar el estado'));
        }
    }, [cargarDatos]);

    const solicitarEntrega = useCallback(async (orden: OrdenActiva) => {
        setProcesando(true);
        try {
            const detalles = await TallerService.obtenerDetallesOrden(orden.id);
            setModalEntrega({ abierto: true, orden, detalles });
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al obtener detalles'));
        } finally {
            setProcesando(false);
        }
    }, []);

    const confirmarEntrega = useCallback(async () => {
        if (!modalEntrega.orden) return;
        setProcesando(true);
        try {
            await TallerService.actualizarEstado(modalEntrega.orden.id, 'ENTREGADO');
            toast.success(`Vehículo de ${modalEntrega.orden.cliente_nombre} marcado como entregado`);
            setModalEntrega({ abierto: false, orden: null, detalles: [] });
            await cargarDatos();
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al confirmar la entrega'));
        } finally {
            setProcesando(false);
        }
    }, [modalEntrega.orden, cargarDatos]);

    const archivarOrden = useCallback((id: string) => {
        setModalConfirmarAccion({
            abierto: true,
            titulo: 'Archivar orden',
            mensaje: (
                <>
                    ¿Seguro que deseas archivar esta orden?{' '}
                    <span className="font-semibold">Pasará al Historial de Servicios.</span>
                </>
            ),
            tipo: 'peligro',
            // ✅ onConfirm solo cierra en finally una vez — sin doble cierre
            onConfirm: async () => {
                setProcesando(true);
                try {
                    await TallerService.actualizarEstado(id, 'ARCHIVADO');
                    toast.success('Orden archivada correctamente');
                    await cargarDatos();
                } catch (e: unknown) {
                    toast.error(normalizeError(e, 'Error al archivar la orden'));
                } finally {
                    setProcesando(false);
                }
            },
        });
    }, [cargarDatos]);

    // ✅ Un único punto de cierre — handleConfirmarAccion NO cierra el modal
    //    porque onConfirm ya lo hace en su finally (eliminado el doble cierre)
    const handleConfirmarAccion = useCallback(async () => {
        if (!modalConfirmarAccion.onConfirm) return;
        await modalConfirmarAccion.onConfirm();
        // onConfirm es responsable de cerrar el modal si lo necesita
        // Aquí solo cerramos si onConfirm no lo hizo (guard final)
        setModalConfirmarAccion(prev => ({ ...prev, abierto: false }));
    }, [modalConfirmarAccion.onConfirm]);

    const procesarComprobante = useCallback(async (orden: OrdenActiva, accion: 'DESCARGAR' | 'VER') => {
        setProcesando(true);
        try {
            const detalles = await TallerService.obtenerDetallesOrden(orden.id);
            const url = generarComprobantePDF(orden, detalles, accion);
            if (accion === 'DESCARGAR') {
                toast.success(`Comprobante de ${orden.cliente_nombre} descargado correctamente`);
            } else if (accion === 'VER' && url) {
                setPdfGeneradoUrl(url);
            }
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al procesar el comprobante'));
        } finally {
            setProcesando(false);
        }
    }, []);

    const cargarDetallesOrden = useCallback(async (id: string) => {
        const data = await TallerService.obtenerDetallesOrden(id);
        setDetallesOrden(data);
    }, []);

    const abrirHojaTrabajo = useCallback(async (orden: OrdenActiva) => {
        setOrdenActiva(orden);
        setManoObra(orden.costo_mano_obra ?? 0);
        const data = await TallerService.obtenerDetallesOrden(orden.id);
        setDetallesOrden(data);
        setModalDetalleAbierto(true);
    }, []);

    const confirmarAgregarRepuesto = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const { repuesto, cantidad: cantidadStr } = modalCantidad;
        if (!repuesto || !ordenActiva) return;
        const cantidad = parseInt(cantidadStr, 10);
        if (isNaN(cantidad) || cantidad <= 0 || cantidad > repuesto.cantidad) return;

        setProcesando(true);
        try {
            await TallerService.agregarRepuesto(
                ordenActiva.id,
                repuesto.lote_id,
                cantidad,
                repuesto.precio_venta_referencial ?? 0,
                usuarioId
            );
            toast.success(`${repuesto.producto_nombre} agregado a la orden`);
            await cargarDetallesOrden(ordenActiva.id);
            setModalCantidad({ abierto: false, repuesto: null, cantidad: '1' });
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al agregar repuesto'));
        } finally {
            setProcesando(false);
        }
    }, [modalCantidad, ordenActiva, usuarioId, cargarDetallesOrden]);

    const confirmarEliminarRepuesto = useCallback(async () => {
        const { detalle } = modalConfirmacion;
        if (!detalle || !ordenActiva) return;

        setProcesando(true);
        try {
            await TallerService.eliminarRepuesto(
                detalle.id,
                detalle.lote_id,
                detalle.cantidad,
                ordenActiva.id,
                usuarioId
            );
            toast.success(`${detalle.producto_nombre} devuelto al almacén`);
            await cargarDetallesOrden(ordenActiva.id);
            setModalConfirmacion({ abierto: false, detalle: null });
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al eliminar repuesto'));
        } finally {
            setProcesando(false);
        }
    }, [modalConfirmacion, ordenActiva, usuarioId, cargarDetallesOrden]);

    const guardarManoObra = useCallback(async () => {
        if (!ordenActiva) return;
        setProcesando(true);
        try {
            await TallerService.actualizarManoObra(ordenActiva.id, manoObra);
            toast.success('Costo de mano de obra guardado');
            await cargarDatos();
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al guardar mano de obra'));
        } finally {
            setProcesando(false);
        }
    }, [ordenActiva, manoObra, cargarDatos]);

    const totalRepuestos = useMemo(
        () => detallesOrden.reduce((acc, d) => acc + d.subtotal, 0),
        [detallesOrden]
    );

    const cerrarVisorPDF = useCallback(() => {
        if (pdfGeneradoUrl) URL.revokeObjectURL(pdfGeneradoUrl);
        setPdfGeneradoUrl(null);
    }, [pdfGeneradoUrl]);

    // ==========================================
    // RENDER
    // ==========================================

    if (cargando) return (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
            <div className="text-center flex flex-col items-center opacity-50">
                <Loader2 size={40} className="animate-spin text-orange-600 mb-4" />
                <p className="text-slate-500 font-medium">Cargando taller...</p>
            </div>
        </div>
    );

    if (errorVista) return (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center px-4">
            <ErrorBanner
                mensaje={errorVista}
                onReintentar={cargarDatos}
                className="max-w-md w-full"
            />
        </div>
    );

    return (
        <div className="p-4 max-w-[1800px] mx-auto flex flex-col h-[calc(100vh-80px)] font-sans">

            {/* Cabecera */}
            <div className="flex justify-between items-end mb-6 shrink-0 px-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight mb-4">
                        <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                            <Columns3Cog size={28} />
                        </div>
                        Taller y Servicios
                    </h1>
                    {/* Selector de vista */}
                    <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
                        {(['KANBAN', 'HISTORIAL'] as const).map(vista => (
                            <button
                                key={vista}
                                onClick={() => setVistaActiva(vista)}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all ${vistaActiva === vista
                                    ? 'bg-white shadow-sm text-slate-800'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                {vista === 'KANBAN'
                                    ? <><LayoutDashboard size={18} /> Tablero de Trabajo</>
                                    : <><History size={18} /> Historial de Servicios</>
                                }
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3 pb-1">
                    {vistaActiva === 'KANBAN' && (
                        <button
                            onClick={() => setModalAbierto(true)}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-bold shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={20} /> Ingresar Vehículo
                        </button>
                    )}
                </div>
            </div>

            {/* Contenido */}
            {vistaActiva === 'KANBAN' ? (
                <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start select-none">
                    {COLUMNAS_KANBAN.map(columna => {
                        const ordenesColumna = ordenes.filter(o => o.estado === columna.id);
                        const Icono = columna.icon;
                        return (
                            <div
                                key={columna.id}
                                className={`flex flex-col w-80 min-w-[22rem] h-full rounded-2xl border ${columna.colorBorde} ${columna.colorFondo} shrink-0 overflow-hidden shadow-sm`}
                            >
                                <div className={`px-4 py-3 flex justify-between items-center font-bold border-b ${columna.colorBorde} ${columna.header} shrink-0`}>
                                    <div className="flex items-center gap-2">
                                        <Icono size={18} />
                                        <span>{columna.titulo}</span>
                                    </div>
                                    <span className="bg-white/60 px-2.5 py-0.5 rounded-full text-xs shadow-sm">
                                        {ordenesColumna.length}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {ordenesColumna.map(orden => (
                                        <TarjetaTallerOrden
                                            key={orden.id}
                                            orden={orden}
                                            columna={columna}
                                            abrirHojaTrabajo={abrirHojaTrabajo}
                                            cambiarEstado={cambiarEstado}
                                            formatearFecha={formatearFechaLocal}
                                            solicitarEntrega={solicitarEntrega}
                                            archivarOrden={archivarOrden}
                                            procesarComprobante={procesarComprobante}
                                        />
                                    ))}
                                    {ordenesColumna.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-slate-400 gap-2">
                                            <Icono size={24} className="opacity-20" />
                                            <span className="text-sm font-medium">Sin registros</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1 overflow-hidden pb-4">
                    <TablaTallerHistorial
                        formatearFecha={formatearFechaLocal}
                        procesarComprobante={procesarComprobante}
                    />
                </div>
            )}

            {/* ── Modales ────────────────────────────────────────────────────── */}

            <ModalTallerRecepcion
                abierto={modalAbierto}
                onClose={() => { setModalAbierto(false); setForm(FORM_VACIO); }}
                onSubmit={handleSubmit}
                form={form}
                setForm={setForm}
                procesando={procesando}
            />

            <ModalTallerHojaTrabajo
                abierto={modalDetalleAbierto}
                onClose={() => setModalDetalleAbierto(false)}
                ordenActiva={ordenActiva}
                fetchRepuestos={TallerService.obtenerCatalogoRepuestos}
                setModalCantidad={setModalCantidad}
                detallesOrden={detallesOrden}
                setModalConfirmacion={setModalConfirmacion}
                manoObra={manoObra}
                setManoObra={setManoObra}
                guardarManoObra={guardarManoObra}
                totalRepuestos={totalRepuestos}
                procesando={procesando}
            />

            <ModalTallerAcciones
                modalCantidad={modalCantidad}
                setModalCantidad={setModalCantidad}
                confirmarAgregarRepuesto={confirmarAgregarRepuesto}
                modalConfirmacion={modalConfirmacion}
                setModalConfirmacion={setModalConfirmacion}
                confirmarEliminarRepuesto={confirmarEliminarRepuesto}
                procesando={procesando}
            />

            <ModalConfirmarEntrega
                abierto={modalEntrega.abierto}
                onClose={() => setModalEntrega({ abierto: false, orden: null, detalles: [] })}
                onConfirm={confirmarEntrega}
                orden={modalEntrega.orden}
                detalles={modalEntrega.detalles}
                procesando={procesando}
            />

            <ModalVisorPDF
                isOpen={!!pdfGeneradoUrl}
                onClose={cerrarVisorPDF}
                pdfUrl={pdfGeneradoUrl}
            />

            <ModalConfirmacion
                isOpen={modalConfirmarAccion.abierto}
                onClose={() => setModalConfirmarAccion(prev => ({ ...prev, abierto: false }))}
                onConfirm={handleConfirmarAccion}
                titulo={modalConfirmarAccion.titulo}
                mensaje={modalConfirmarAccion.mensaje}
                tipo={modalConfirmarAccion.tipo}
                procesando={procesando}
            />
        </div>
    );
}
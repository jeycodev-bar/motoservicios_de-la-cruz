// src/views/Taller.tsx
import {
    Wrench, Plus, Clock, CheckCircle, PackageOpen,
    Loader2, LayoutDashboard, History, Columns3Cog
} from 'lucide-react';

// Contexto y Hooks
import { useAuth } from '../context/AuthContext';
import { useTaller, FORM_VACIO } from '../hooks/useTaller';

// Servicios y Utilidades
import { TallerService } from '../services/taller_service';
import { formatearFechaLocal } from '../utils/fechas';

// Componentes
import TarjetaTallerOrden, { ColumnaKanban } from '../components/TarjetaTallerOrden';
import ModalTallerRecepcion from '../components/ModalTallerRecepcion';
import ModalTallerHojaTrabajo from '../components/ModalTallerHojaTrabajo';
import ModalTallerAcciones from '../components/ModalTallerAcciones';
import ModalConfirmarEntrega from '../components/ModalTallerConfirmarEntrega';
import TablaTallerHistorial from '../components/TablaTallerHistorial';
import ModalVisorPDF from '../modales/ModalVisorPDF';
import ModalConfirmacion from '../modales/ModalConfirmacion';
import ErrorBanner from '../components/common/ErrorBanner';

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

// ==========================================
// VISTA PRINCIPAL
// ==========================================

export default function Taller() {
    const { usuario } = useAuth();

    // Inyectamos nuestro Custom Hook que contiene toda la lógica de negocio y estado
    const { state, actions } = useTaller(usuario?.id ?? 'SISTEMA');

    // ==========================================
    // RENDER: ESTADOS DE CARGA Y ERROR
    // ==========================================

    if (state.cargando) return (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
            <div className="text-center flex flex-col items-center opacity-50">
                <Loader2 size={40} className="animate-spin text-orange-600 mb-4" />
                <p className="text-slate-500 font-medium">Cargando taller...</p>
            </div>
        </div>
    );

    if (state.errorVista) return (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center px-4">
            <ErrorBanner
                mensaje={state.errorVista}
                onReintentar={actions.cargarDatos}
                className="max-w-md w-full"
            />
        </div>
    );

    // ==========================================
    // RENDER: VISTA PRINCIPAL
    // ==========================================

    return (
        <div className="p-2 max-w-[1800px] mx-auto flex flex-col h-[calc(100vh-80px)] font-sans">

            {/* ── Cabecera ──────────────────────────────────────────────────────── */}
            <div className="flex justify-between items-end mb-6 shrink-0 px-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight mb-4">
                        <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                            <Columns3Cog size={28} />
                        </div>
                        Taller y Servicios
                    </h1>
                    <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit">
                        {(['KANBAN', 'HISTORIAL'] as const).map(vista => (
                            <button
                                key={vista}
                                onClick={() => actions.setVistaActiva(vista)}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all ${state.vistaActiva === vista
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
                    {state.vistaActiva === 'KANBAN' && (
                        <button
                            onClick={() => actions.setModalAbierto(true)}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 flex items-center gap-2 font-bold shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={20} /> Ingresar Vehículo
                        </button>
                    )}
                </div>
            </div>

            {/* ── Contenido Principal ───────────────────────────────────────────── */}
            {state.vistaActiva === 'KANBAN' ? (
                <div className="flex-1 flex gap-5 overflow-x-auto pb-4 items-start select-none">
                    {COLUMNAS_KANBAN.map(columna => {
                        const ordenesColumna = state.ordenes.filter(o => o.estado === columna.id);
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
                                            abrirHojaTrabajo={actions.abrirHojaTrabajo}
                                            cambiarEstado={actions.cambiarEstado}
                                            formatearFecha={formatearFechaLocal}
                                            solicitarEntrega={actions.solicitarEntrega}
                                            archivarOrden={actions.archivarOrden}
                                            procesarComprobante={actions.procesarComprobante}
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
                        procesarComprobante={actions.procesarComprobante}
                    />
                </div>
            )}

            {/* ── Modales ────────────────────────────────────────────────────── */}

            <ModalTallerRecepcion
                abierto={state.modalAbierto}
                onClose={() => { actions.setModalAbierto(false); actions.setForm(FORM_VACIO); }}
                onSubmit={actions.crearOrden}
                form={state.form}
                setForm={actions.setForm}
                procesando={state.procesando}
            />

            <ModalTallerHojaTrabajo
                abierto={state.modalDetalleAbierto}
                onClose={() => actions.setModalDetalleAbierto(false)}
                ordenActiva={state.ordenActiva}
                fetchRepuestos={TallerService.obtenerCatalogoRepuestos}
                setModalCantidad={actions.setModalCantidad}
                detallesOrden={state.detallesOrden}
                setModalConfirmacion={actions.setModalConfirmacion}
                manoObra={state.manoObra}
                setManoObra={actions.setManoObra}
                guardarManoObra={actions.guardarManoObra}
                totalRepuestos={state.totalRepuestos}
                procesando={state.procesando}
                onRefrescarCatalogo={actions.setRefrescarCatalogo}
            />

            <ModalTallerAcciones
                modalCantidad={state.modalCantidad}
                setModalCantidad={actions.setModalCantidad}
                confirmarAgregarRepuesto={actions.confirmarAgregarRepuesto}
                modalConfirmacion={state.modalConfirmacion}
                setModalConfirmacion={actions.setModalConfirmacion}
                confirmarEliminarRepuesto={actions.confirmarEliminarRepuesto}
                procesando={state.procesando}
            />

            <ModalConfirmarEntrega
                abierto={state.modalEntrega.abierto}
                onClose={() => actions.setModalEntrega({ abierto: false, orden: null, detalles: [] })}
                onConfirm={actions.confirmarEntrega}
                orden={state.modalEntrega.orden}
                detalles={state.modalEntrega.detalles}
                procesando={state.procesando}
            />

            <ModalVisorPDF
                isOpen={!!state.pdfGeneradoUrl}
                onClose={actions.cerrarVisorPDF}
                pdfUrl={state.pdfGeneradoUrl}
            />

            <ModalConfirmacion
                isOpen={state.modalConfirmarAccion.abierto}
                onClose={() => actions.setModalConfirmarAccion((prev: any) => ({ ...prev, abierto: false }))}
                onConfirm={actions.handleConfirmarAccion}
                titulo={state.modalConfirmarAccion.titulo}
                mensaje={state.modalConfirmarAccion.mensaje}
                tipo={state.modalConfirmarAccion.tipo}
                procesando={state.procesando}
            />
        </div>
    );
}
// src/hooks/useTaller.ts
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';

import { TallerService } from '../services/taller_service';
import { generarComprobantePDF } from '../utils/pdfGenerator';
import { normalizeError } from '../utils/errors';

import type { OrdenActiva, DetalleOrden, EstadoOrden } from '../types';
import { FormOrden } from '../components/ModalTallerRecepcion';
import { EstadoModalCantidad, EstadoModalConfirmacion } from '../components/ModalTallerAcciones';

// ==========================================
// INTERFACES LOCALES
// ==========================================

export interface EstadoModalEntrega {
    abierto: boolean;
    orden: OrdenActiva | null;
    detalles: DetalleOrden[];
}

export interface EstadoModalConfirmarAccion {
    abierto: boolean;
    titulo: string;
    mensaje: React.ReactNode;
    onConfirm: (() => Promise<void>) | null;
    tipo?: 'peligro' | 'advertencia' | 'info' | 'exito' | 'salir';
}

export const FORM_VACIO: FormOrden = {
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
// CUSTOM HOOK: useTaller
// ==========================================

export function useTaller(usuarioId: string) {
    // ── 1. Estados de Datos ───────────────────────────────────────────────────
    const [ordenes, setOrdenes] = useState<OrdenActiva[]>([]);
    const [ordenActiva, setOrdenActiva] = useState<OrdenActiva | null>(null);
    const [detallesOrden, setDetallesOrden] = useState<DetalleOrden[]>([]);
    const [manoObra, setManoObra] = useState(0);

    // ── 2. Estados de UI (Carga, Errores, Vistas) ─────────────────────────────
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [errorVista, setErrorVista] = useState<string | null>(null);
    const [vistaActiva, setVistaActiva] = useState<'KANBAN' | 'HISTORIAL'>('KANBAN');
    const [pdfGeneradoUrl, setPdfGeneradoUrl] = useState<string | null>(null);

    // ── 3. Estados de Modales ─────────────────────────────────────────────────
    const [modalAbierto, setModalAbierto] = useState(false);
    const [form, setForm] = useState<FormOrden>(FORM_VACIO);
    const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
    const [modalCantidad, setModalCantidad] = useState<EstadoModalCantidad>({ abierto: false, repuesto: null, cantidad: '1' });
    const [modalConfirmacion, setModalConfirmacion] = useState<EstadoModalConfirmacion>({ abierto: false, detalle: null });
    const [modalEntrega, setModalEntrega] = useState<EstadoModalEntrega>({ abierto: false, orden: null, detalles: [] });
    const [modalConfirmarAccion, setModalConfirmarAccion] = useState<EstadoModalConfirmarAccion>(MODAL_ACCION_VACIO);

    // Referencia para actualizar el catálogo desde el hook sin dependencias cíclicas
    const refrescarCatalogoRef = useRef<(() => void) | null>(null);

    // ── 4. Métodos Core ───────────────────────────────────────────────────────

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
        TallerService.archivarOrdenesViejas();
        cargarDatos();
    }, [cargarDatos]);

    const cargarDetallesOrden = useCallback(async (id: string) => {
        try {
            const data = await TallerService.obtenerDetallesOrden(id);
            setDetallesOrden(data);
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al actualizar los repuestos de la orden'));
        }
    }, []);

    // ── 5. Handlers de Negocio ────────────────────────────────────────────────

    const crearOrden = useCallback(async (e: React.FormEvent) => {
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
            toast.error(normalizeError(e, 'Error al obtener detalles de la orden'));
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
            mensaje: '¿Seguro que deseas archivar esta orden? Pasará al Historial de Servicios.',
            tipo: 'peligro',
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

    const handleConfirmarAccion = useCallback(async () => {
        if (!modalConfirmarAccion.onConfirm) return;
        await modalConfirmarAccion.onConfirm();
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

    const cerrarVisorPDF = useCallback(() => {
        if (pdfGeneradoUrl) URL.revokeObjectURL(pdfGeneradoUrl);
        setPdfGeneradoUrl(null);
    }, [pdfGeneradoUrl]);

    const abrirHojaTrabajo = useCallback(async (orden: OrdenActiva) => {
        setOrdenActiva(orden);
        setManoObra(orden.costo_mano_obra ?? 0);
        try {
            const data = await TallerService.obtenerDetallesOrden(orden.id);
            setDetallesOrden(data);
            setModalDetalleAbierto(true);
        } catch (e: unknown) {
            toast.error(normalizeError(e, 'Error al cargar la hoja de trabajo'));
        }
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
            refrescarCatalogoRef.current?.();
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
            refrescarCatalogoRef.current?.();
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

    const setRefrescarCatalogo = useCallback((fn: () => void) => {
        refrescarCatalogoRef.current = fn;
    }, []);

    // ── 6. Valores Calculados ─────────────────────────────────────────────────

    const totalRepuestos = useMemo(
        () => detallesOrden.reduce((acc, d) => acc + d.subtotal, 0),
        [detallesOrden]
    );

    // ── 7. Retorno Estructurado ───────────────────────────────────────────────

    return {
        state: {
            ordenes,
            ordenActiva,
            detallesOrden,
            manoObra,
            cargando,
            procesando,
            errorVista,
            vistaActiva,
            pdfGeneradoUrl,
            modalAbierto,
            form,
            modalDetalleAbierto,
            modalCantidad,
            modalConfirmacion,
            modalEntrega,
            modalConfirmarAccion,
            totalRepuestos,
        },
        actions: {
            setVistaActiva,
            setModalAbierto,
            setForm,
            setModalDetalleAbierto,
            setModalCantidad,
            setModalConfirmacion,
            setModalEntrega,
            setModalConfirmarAccion,
            setManoObra,
            setPdfGeneradoUrl,
            cargarDatos,
            crearOrden,
            cambiarEstado,
            solicitarEntrega,
            confirmarEntrega,
            archivarOrden,
            handleConfirmarAccion,
            abrirHojaTrabajo,
            procesarComprobante,
            cerrarVisorPDF,
            confirmarAgregarRepuesto,
            confirmarEliminarRepuesto,
            guardarManoObra,
            setRefrescarCatalogo,
        }
    };
}
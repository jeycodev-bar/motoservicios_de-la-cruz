// src/hooks/useCarritoVentas.ts
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import { VentasService } from '../services/ventas_service';
import { generarTicketVentaPDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';

import type { ItemCarrito, ClienteVenta, ChasisDisponible } from '../types';
import type { StockVenta } from '../services/ventas_service';

export interface VentaExitosaState {
    id: string;
    cliente: string;
    total: number;
    fecha: string;
    detalles: ItemCarrito[];
}

export function useCarritoVentas() {
    const { usuario } = useAuth();

    // ── ESTADO DEL DOMINIO ────────────────────────────────────────────────────
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteVenta | null>(null);
    const [nombreManual, setNombreManual] = useState('');
    const [procesando, setProcesando] = useState(false);

    // Estado post-venta
    const [ventaExitosa, setVentaExitosa] = useState<VentaExitosaState | null>(null);
    const [pdfGeneradoUrl, setPdfGeneradoUrl] = useState<string | null>(null);

    // ── CÁLCULOS DERIVADOS (MEMORIZADOS) ──────────────────────────────────────
    const totalCarrito = useMemo(
        () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
        [carrito]
    );

    const stockEnCarrito = useMemo(() => {
        const mapa = new Map<string, number>();
        for (const item of carrito) {
            if (item.lote_id) {
                mapa.set(item.lote_id, (mapa.get(item.lote_id) ?? 0) + item.cantidad);
            }
        }
        return mapa;
    }, [carrito]);

    // ── LÓGICA DE NEGOCIO (MUTACIONES) ────────────────────────────────────────

    const agregarItem = useCallback(
        (producto: StockVenta, chasis: ChasisDisponible | null = null) => {
            setCarrito(prev => {
                const idx = prev.findIndex(item =>
                    item.lote_id === producto.lote_id &&
                    (chasis === null || item.vehiculo_id === chasis.id)
                );

                // Lógica si el producto ya existe en el carrito (sin chasis específico)
                if (idx >= 0 && !chasis) {
                    const actual = prev[idx];
                    if (actual.cantidad < producto.cantidad) {
                        const copia = [...prev];
                        copia[idx] = { ...actual, cantidad: actual.cantidad + 1 };
                        return copia;
                    }
                    toast.warning('Stock máximo en bodega alcanzado para este lote.');
                    return prev;
                }

                // Prevención de duplicidad de VIN/Chasis
                if (chasis && prev.some(item => item.vehiculo_id === chasis.id)) {
                    toast.warning('Este chasis ya fue agregado al carrito.');
                    return prev;
                }

                // Inserción de nuevo ítem
                return [...prev, {
                    lote_id: producto.lote_id,
                    producto_nombre: producto.producto_nombre,
                    sku: producto.sku ?? undefined,
                    cantidad: 1,
                    stock_maximo: chasis ? 1 : producto.cantidad,
                    precio: producto.precio_venta_referencial,
                    es_vehiculo: producto.es_vehiculo,
                    vehiculo_id: chasis?.id ?? null,
                    chasis_str: chasis?.numero_chasis ?? null,
                    color: producto.color ?? undefined,
                }];
            });
        }, []
    );

    const procesarVenta = useCallback(async (onSuccessCallback?: () => void) => {
        if (carrito.length === 0) return;
        if (!usuario) {
            toast.error('No hay un usuario logueado en el sistema.');
            return;
        }

        setProcesando(true);
        try {
            const clienteId = clienteSeleccionado?.id ?? null;
            const nombreFinal = clienteSeleccionado?.nombre_completo ?? (nombreManual || 'Público en General');

            const resultado = await VentasService.procesarVenta(
                usuario.id,
                clienteId,
                nombreFinal,
                totalCarrito,
                carrito
            );

            toast.success(`Venta registrada — Ticket: TCK-${resultado.id.substring(0, 8).toUpperCase()}`);

            setVentaExitosa({
                id: resultado.id,
                cliente: nombreFinal,
                total: totalCarrito,
                fecha: new Date().toISOString(),
                detalles: [...carrito],
            });

            if (onSuccessCallback) onSuccessCallback();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Error al procesar la venta');
        } finally {
            setProcesando(false);
        }
    }, [carrito, usuario, clienteSeleccionado, nombreManual, totalCarrito]);

    // ── LÓGICA DE DOCUMENTOS (PDF) ────────────────────────────────────────────

    const manejarTicketPDF = useCallback(
        (accion: 'VER' | 'DESCARGAR') => {
            if (!ventaExitosa) return;
            try {
                const datosVenta = {
                    id: ventaExitosa.id,
                    cliente_nombre: ventaExitosa.cliente,
                    vendedor_nombre: usuario?.nombre_completo ?? 'Vendedor',
                    fecha: ventaExitosa.fecha,
                    total: ventaExitosa.total,
                };
                const url = generarTicketVentaPDF(datosVenta, ventaExitosa.detalles, accion);
                if (accion === 'VER' && typeof url === 'string') setPdfGeneradoUrl(url);

                if (accion === 'DESCARGAR') {
                    toast.success(`Comprobante de ${datosVenta.cliente_nombre} descargado correctamente`);
                }
            } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : 'Error al generar el ticket PDF');
            }
        }, [ventaExitosa, usuario]
    );

    const limpiarVentaExitosa = useCallback(() => {
        setVentaExitosa(null);
        setCarrito([]);
        setClienteSeleccionado(null);
        setNombreManual('');
    }, []);

    const cerrarVisorPDF = useCallback(() => {
        if (pdfGeneradoUrl) URL.revokeObjectURL(pdfGeneradoUrl);
        setPdfGeneradoUrl(null);
    }, [pdfGeneradoUrl]);

    // ── API DEL HOOK ──────────────────────────────────────────────────────────
    return {
        // Propiedades de Estado
        carrito, setCarrito,
        clienteSeleccionado, setClienteSeleccionado,
        nombreManual, setNombreManual,
        procesando,
        ventaExitosa,
        pdfGeneradoUrl,

        // Propiedades Derivadas
        totalCarrito,
        stockEnCarrito,

        // Métodos de Acción
        agregarItem,
        procesarVenta,
        manejarTicketPDF,
        limpiarVentaExitosa,
        cerrarVisorPDF
    };
}
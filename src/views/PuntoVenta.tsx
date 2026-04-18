// src/views/PuntoVenta.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

import CatalogoProductos from '../components/CatalogoProductos';
import CarritoVentas from '../components/CarritoVentas';
import ModalSeleccionChasis from '../modales/ModalSeleccionChasis';
import ModalDirectorioClientes from '../modales/ModalDirectorioClientes';
import ModalSeleccionVariante from '../modales/ModalSeleccionVariante';
import ModalVentaExitosa from '../modales/ModalVentaExitosa';
import ModalVisorPDF from '../modales/ModalVisorPDF';
import { generarTicketVentaPDF } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { VentasService } from '../services/ventas_service';
import { MaestrosService } from '../services/maestros_service';

// ✅ CarritoItemPayload eliminado — ya no se usa aquí (el servicio adapta internamente)
import type {
    Categoria,
    Marca,
    ItemCarrito,
    ClienteVenta,
    ChasisDisponible,

} from '../types';
import type {
    ProductoCatalogoUI,
    VarianteProducto,
    StockVenta,

} from '../services/ventas_service';

const LIMIT = 50;

// ==========================================
// TIPOS LOCALES
// ==========================================

interface VentaExitosaState {
    id: string;
    cliente: string;
    total: number;
    fecha: string;
    detalles: ItemCarrito[];
}

// ==========================================
// VISTA PRINCIPAL
// ==========================================

export default function PuntoVenta() {
    const { usuario } = useAuth();

    // ── Catálogo ──────────────────────────────────────────────────────────────
    const [productosAgrupados, setProductosAgrupados] = useState<ProductoCatalogoUI[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // ── Maestros (filtros) ────────────────────────────────────────────────────
    const [listaCategorias, setListaCategorias] = useState<Categoria[]>([]);
    const [listaMarcas, setListaMarcas] = useState<Marca[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoriaId, setFiltroCategoriaId] = useState('TODOS');
    const [filtroMarcaId, setFiltroMarcaId] = useState('TODAS');

    const busquedaDebounced = useDebounce(busqueda, 300);

    // ── Carrito y cliente ─────────────────────────────────────────────────────
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteVenta | null>(null);
    const [nombreManual, setNombreManual] = useState('');
    const [modalClientes, setModalClientes] = useState(false);
    const [procesando, setProcesando] = useState(false);

    // ── Modal selección chasis ────────────────────────────────────────────────
    const [modalChasisAbierto, setModalChasisAbierto] = useState(false);
    const [productoSeleccionadoParaChasis, setProductoSeleccionadoParaChasis] =
        useState<StockVenta | null>(null);

    // ── Modal selección variante ──────────────────────────────────────────────
    const [modalVariantesAbierto, setModalVariantesAbierto] = useState(false);
    const [productoAgrupadoSeleccionado, setProductoAgrupadoSeleccionado] =
        useState<ProductoCatalogoUI | null>(null);

    // ── PDF y venta exitosa ───────────────────────────────────────────────────
    const [ventaExitosa, setVentaExitosa] = useState<VentaExitosaState | null>(null);
    const [pdfGeneradoUrl, setPdfGeneradoUrl] = useState<string | null>(null);

    // ==========================================
    // EFECTOS DE CARGA
    // ==========================================

    useEffect(() => {
        const ctrl = new AbortController();
        MaestrosService.obtenerCategorias()
            .then(data => { if (!ctrl.signal.aborted) setListaCategorias(data); })
            .catch(e => { if (!ctrl.signal.aborted) console.error(e); });
        return () => ctrl.abort();
    }, []);

    useEffect(() => {
        const ctrl = new AbortController();
        const cargar = async () => {
            try {
                const marcas = filtroCategoriaId === 'TODOS'
                    ? await MaestrosService.obtenerMarcas()
                    : await MaestrosService.obtenerMarcasPorCategoria(filtroCategoriaId);
                if (!ctrl.signal.aborted) setListaMarcas(marcas);
            } catch (e) {
                if (!ctrl.signal.aborted) console.error(e);
            }
        };
        cargar();
        return () => ctrl.abort();
    }, [filtroCategoriaId]);

    useEffect(() => {
        const ctrl = new AbortController();
        const cargar = async () => {
            setCargandoCatalogo(true);
            try {
                const data = await VentasService.obtenerCatalogoOptimizado(
                    busquedaDebounced,
                    filtroCategoriaId === 'TODOS' ? '' : filtroCategoriaId,
                    filtroMarcaId === 'TODAS' ? '' : filtroMarcaId,
                    LIMIT, 0
                );
                if (ctrl.signal.aborted) return;
                setProductosAgrupados(data);
                setOffset(0);
                setHasMore(data.length === LIMIT);
            } catch (e) {
                if (!ctrl.signal.aborted) console.error(e);
            } finally {
                if (!ctrl.signal.aborted) setCargandoCatalogo(false);
            }
        };
        cargar();
        return () => ctrl.abort();
    }, [busquedaDebounced, filtroCategoriaId, filtroMarcaId, refreshTrigger]);

    // ==========================================
    // HANDLERS
    // ==========================================

    const cargarMasItems = useCallback(async () => {
        if (cargandoCatalogo || !hasMore) return;
        setCargandoCatalogo(true);
        try {
            const nextOffset = offset + LIMIT;
            const data = await VentasService.obtenerCatalogoOptimizado(
                busquedaDebounced,
                filtroCategoriaId === 'TODOS' ? '' : filtroCategoriaId,
                filtroMarcaId === 'TODAS' ? '' : filtroMarcaId,
                LIMIT, nextOffset
            );
            setProductosAgrupados(prev => [...prev, ...data]);
            setOffset(nextOffset);
            setHasMore(data.length === LIMIT);
        } catch (e) {
            console.error(e);
        } finally {
            setCargandoCatalogo(false);
        }
    }, [cargandoCatalogo, hasMore, offset, busquedaDebounced, filtroCategoriaId, filtroMarcaId]);

    const handleCambiarCategoria = useCallback((idCat: string) => {
        setFiltroCategoriaId(idCat);
        setFiltroMarcaId('TODAS');
    }, []);

    const totalCarrito = useMemo(
        () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
        [carrito]
    );

    const agregarItemAlEstadoCarrito = useCallback(
        (producto: StockVenta, chasis: ChasisDisponible | null) => {
            setCarrito(prev => {
                const idx = prev.findIndex(item =>
                    item.lote_id === producto.lote_id &&
                    (chasis === null || item.vehiculo_id === chasis.id)
                );

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

    const handleAgregarAlCarrito = useCallback(
        async (variante: VarianteProducto, productoPadre: ProductoCatalogoUI) => {
            if (variante.cantidad <= 0) {
                toast.warning('Este producto no tiene stock disponible.');
                return;
            }

            const productoAdaptado: StockVenta = {
                lote_id: variante.lote_id,
                color: variante.color,
                cantidad: variante.cantidad,
                producto_id: productoPadre.producto_id,
                producto_nombre: productoPadre.producto_nombre,
                sku: productoPadre.sku ?? '',
                es_vehiculo: productoPadre.es_vehiculo,
                precio_venta_referencial: productoPadre.precio_venta_referencial,
                categoria_id: null,
                marca_id: null,
                categoria_nombre: productoPadre.categoria_nombre,
                marca_nombre: productoPadre.marca_nombre,
            };

            if (productoAdaptado.es_vehiculo === 1) {
                try {
                    const chasis = await VentasService.obtenerChasisDisponibles(productoAdaptado.lote_id);
                    if (chasis.length === 0) {
                        toast.warning(
                            `DISCREPANCIA DE INVENTARIO: Hay ${productoAdaptado.cantidad} unidad(es) sin VIN asignado. Configúralo en 'Flota / Chasis'.`
                        );
                        return;
                    }
                    setProductoSeleccionadoParaChasis(productoAdaptado);
                    setModalChasisAbierto(true);
                } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : 'Error al validar los chasis');
                }
                return;
            }

            agregarItemAlEstadoCarrito(productoAdaptado, null);
        }, [agregarItemAlEstadoCarrito]
    );

    const handleConfirmarChasis = useCallback(
        (producto: StockVenta, chasis: ChasisDisponible) => {
            setCarrito(prev => {
                if (prev.some(item => item.vehiculo_id === chasis.id)) {
                    toast.warning('Este chasis ya fue agregado al carrito.');
                    return prev;
                }
                return [...prev, {
                    lote_id: producto.lote_id,
                    producto_nombre: producto.producto_nombre,
                    sku: producto.sku ?? undefined,
                    cantidad: 1,
                    stock_maximo: 1,
                    precio: producto.precio_venta_referencial,
                    es_vehiculo: producto.es_vehiculo,
                    vehiculo_id: chasis.id,
                    chasis_str: chasis.numero_chasis,
                    color: producto.color ?? undefined,
                }];
            });
            setModalChasisAbierto(false);
        }, []
    );

    const handleSeleccionarVarianteCat = useCallback((prod: ProductoCatalogoUI) => {
        setProductoAgrupadoSeleccionado(prod);
        setModalVariantesAbierto(true);
    }, []);

    const handleSeleccionarVarianteModal = useCallback(
        (variante: VarianteProducto) => {
            setModalVariantesAbierto(false);
            if (productoAgrupadoSeleccionado) {
                handleAgregarAlCarrito(variante, productoAgrupadoSeleccionado);
            }
        }, [handleAgregarAlCarrito, productoAgrupadoSeleccionado]
    );

    const handleSeleccionarCliente = useCallback((cliente: ClienteVenta) => {
        setClienteSeleccionado(cliente);
        setNombreManual('');
        setModalClientes(false);
    }, []);

    const handleProcesarVenta = useCallback(async () => {
        if (carrito.length === 0) return;
        if (!usuario) {
            toast.error('No hay un usuario logueado en el sistema.');
            return;
        }

        setProcesando(true);
        try {
            const clienteId = clienteSeleccionado?.id ?? null;
            const nombreFinal = clienteSeleccionado?.nombre_completo
                ?? (nombreManual || 'Público en General');

            // ✅ VentasService.procesarVenta adapta el carrito internamente a CarritoItemPayload[]
            //    No se construye carritoParaBackend aquí — esa variable era código muerto.
            const resultado = await VentasService.procesarVenta(
                usuario.id,
                clienteId,
                nombreFinal,
                totalCarrito,
                carrito
            );

            toast.success(
                `Venta registrada — Ticket: TCK-${resultado.id.substring(0, 8).toUpperCase()}`
            );

            setVentaExitosa({
                id: resultado.id,
                cliente: nombreFinal,
                total: totalCarrito,
                fecha: new Date().toISOString(),
                detalles: [...carrito],
            });
            setRefreshTrigger(prev => prev + 1);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Error al procesar la venta');
        } finally {
            setProcesando(false);
        }
    }, [carrito, usuario, clienteSeleccionado, nombreManual, totalCarrito]);

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
                // ✅ ItemCarrito extiende DetalleTicket — compatible sin cast
                const url = generarTicketVentaPDF(datosVenta, ventaExitosa.detalles, accion);
                if (accion === 'VER' && typeof url === 'string') setPdfGeneradoUrl(url);
            } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : 'Error al generar el ticket PDF');
            }
        }, [ventaExitosa, usuario]
    );

    const handleCerrarVentaExitosa = useCallback(() => {
        setVentaExitosa(null);
        setCarrito([]);
        setClienteSeleccionado(null);
        setNombreManual('');
    }, []);

    const handleCerrarVisorPDF = useCallback(() => {
        if (pdfGeneradoUrl) URL.revokeObjectURL(pdfGeneradoUrl);
        setPdfGeneradoUrl(null);
    }, [pdfGeneradoUrl]);

    // ==========================================
    // RENDERIZADO
    // ==========================================

    return (
        <>
            <div className="flex flex-1 gap-4 h-full overflow-hidden">
                <CatalogoProductos
                    busqueda={busqueda}
                    setBusqueda={setBusqueda}
                    categorias={listaCategorias}
                    filtroCategoriaId={filtroCategoriaId}
                    setFiltroCategoriaId={handleCambiarCategoria}
                    marcas={listaMarcas}
                    filtroMarcaId={filtroMarcaId}
                    setFiltroMarcaId={setFiltroMarcaId}
                    productosAgrupados={productosAgrupados}
                    onAgregarAlCarrito={handleAgregarAlCarrito}
                    onSeleccionarVariante={handleSeleccionarVarianteCat}
                    cargarMasItems={cargarMasItems}
                    hasMore={hasMore}
                    cargandoCatalogo={cargandoCatalogo}
                />
                <CarritoVentas
                    carrito={carrito}
                    setCarrito={setCarrito}
                    clienteSeleccionado={clienteSeleccionado}
                    setClienteSeleccionado={setClienteSeleccionado}
                    nombreManual={nombreManual}
                    setNombreManual={setNombreManual}
                    setModalClientes={setModalClientes}
                    totalCarrito={totalCarrito}
                    handleProcesarVenta={handleProcesarVenta}
                    procesando={procesando}
                />
            </div>

            {modalChasisAbierto && productoSeleccionadoParaChasis && (
                <ModalSeleccionChasis
                    isOpen={modalChasisAbierto}
                    onClose={() => setModalChasisAbierto(false)}
                    producto={productoSeleccionadoParaChasis}
                    onConfirmar={handleConfirmarChasis}
                />
            )}

            {modalVariantesAbierto && productoAgrupadoSeleccionado && (
                <ModalSeleccionVariante
                    isOpen={modalVariantesAbierto}
                    onClose={() => setModalVariantesAbierto(false)}
                    productoAgrupado={productoAgrupadoSeleccionado}
                    onSeleccionar={handleSeleccionarVarianteModal}
                />
            )}

            <ModalDirectorioClientes
                isOpen={modalClientes}
                onClose={() => setModalClientes(false)}
                onSelect={handleSeleccionarCliente}
            />

            <ModalVentaExitosa
                venta={ventaExitosa}
                onVerPDF={() => manejarTicketPDF('VER')}
                onDescargarPDF={() => manejarTicketPDF('DESCARGAR')}
                onCerrar={handleCerrarVentaExitosa}
            />

            {pdfGeneradoUrl && (
                <ModalVisorPDF
                    isOpen={!!pdfGeneradoUrl}
                    onClose={handleCerrarVisorPDF}
                    pdfUrl={pdfGeneradoUrl}
                />
            )}
        </>
    );
}
// src/views/PuntoVenta.tsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import CatalogoProductos from '../components/CatalogoProductos';
import CarritoVentas from '../components/CarritoVentas';
import ModalSeleccionChasis from '../modales/ModalSeleccionChasis';
import ModalDirectorioClientes from '../modales/ModalDirectorioClientes';
import ModalSeleccionVariante from '../modales/ModalSeleccionVariante';
import ModalVentaExitosa from '../modales/ModalVentaExitosa';
import ModalVisorPDF from '../modales/ModalVisorPDF';

import { useDebounce } from '../hooks/useDebounce';
import { useCarritoVentas } from '../hooks/useCarritoVentas'; // ✅ NUESTRO NUEVO HOOK
import { VentasService } from '../services/ventas_service';
import { MaestrosService } from '../services/maestros_service';

// import type { Categoria, Marca, ClienteVenta, ChasisDisponible } from '../types';
import type { Categoria, Marca, ChasisDisponible } from '../types';
import type { ProductoCatalogoUI, VarianteProducto, StockVenta } from '../services/ventas_service';

const LIMIT = 50;

export default function PuntoVenta() {
    // ── 1. INYECCIÓN DE LA LÓGICA DE NEGOCIO (HOOK) ───────────────────────────
    const {
        carrito, setCarrito,
        clienteSeleccionado, setClienteSeleccionado,
        nombreManual, setNombreManual,
        procesando, ventaExitosa, pdfGeneradoUrl,
        totalCarrito, stockEnCarrito,
        agregarItem, procesarVenta, manejarTicketPDF,
        limpiarVentaExitosa, cerrarVisorPDF
    } = useCarritoVentas();

    // ── 2. ESTADO LOCAL DE UI Y CATÁLOGO ──────────────────────────────────────
    const [productosAgrupados, setProductosAgrupados] = useState<ProductoCatalogoUI[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [listaCategorias, setListaCategorias] = useState<Categoria[]>([]);
    const [listaMarcas, setListaMarcas] = useState<Marca[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoriaId, setFiltroCategoriaId] = useState('TODOS');
    const [filtroMarcaId, setFiltroMarcaId] = useState('TODAS');
    const busquedaDebounced = useDebounce(busqueda, 300);

    // Estado de Modales
    const [modalClientes, setModalClientes] = useState(false);
    const [modalChasisAbierto, setModalChasisAbierto] = useState(false);
    const [productoSeleccionadoParaChasis, setProductoSeleccionadoParaChasis] = useState<StockVenta | null>(null);
    const [modalVariantesAbierto, setModalVariantesAbierto] = useState(false);
    const [productoAgrupadoSeleccionado, setProductoAgrupadoSeleccionado] = useState<ProductoCatalogoUI | null>(null);

    // ── 3. EFECTOS (Podrían extraerse luego a useCatalogo) ───────────────────
    useEffect(() => {
        MaestrosService.obtenerCategorias().then(setListaCategorias).catch(console.error);
    }, []);

    useEffect(() => {
        const cargar = async () => {
            try {
                const marcas = filtroCategoriaId === 'TODOS'
                    ? await MaestrosService.obtenerMarcas()
                    : await MaestrosService.obtenerMarcasPorCategoria(filtroCategoriaId);
                setListaMarcas(marcas);
            } catch (e) { console.error(e); }
        };
        cargar();
    }, [filtroCategoriaId]);

    useEffect(() => {
        const cargar = async () => {
            setCargandoCatalogo(true);
            try {
                const data = await VentasService.obtenerCatalogoOptimizado(
                    busquedaDebounced,
                    filtroCategoriaId === 'TODOS' ? '' : filtroCategoriaId,
                    filtroMarcaId === 'TODAS' ? '' : filtroMarcaId,
                    LIMIT, 0
                );
                setProductosAgrupados(data);
                setOffset(0);
                setHasMore(data.length === LIMIT);
            } catch (e) { console.error(e); }
            finally { setCargandoCatalogo(false); }
        };
        cargar();
    }, [busquedaDebounced, filtroCategoriaId, filtroMarcaId, refreshTrigger]);

    // ── 4. CONTROLADORES DE EVENTOS DE INTERFAZ ───────────────────────────────
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
        } catch (e) { console.error(e); }
        finally { setCargandoCatalogo(false); }
    }, [cargandoCatalogo, hasMore, offset, busquedaDebounced, filtroCategoriaId, filtroMarcaId]);

    const handleAgregarAlCarritoUI = useCallback(async (variante: VarianteProducto, productoPadre: ProductoCatalogoUI) => {
        if (variante.cantidad <= 0) {
            toast.warning('Este producto no tiene stock disponible.');
            return;
        }

        const productoAdaptado: StockVenta = {
            lote_id: variante.lote_id, color: variante.color, cantidad: variante.cantidad,
            producto_id: productoPadre.producto_id, producto_nombre: productoPadre.producto_nombre,
            sku: productoPadre.sku ?? '', es_vehiculo: productoPadre.es_vehiculo,
            precio_venta_referencial: productoPadre.precio_venta_referencial,
            categoria_id: null, marca_id: null,
            categoria_nombre: productoPadre.categoria_nombre, marca_nombre: productoPadre.marca_nombre,
        };

        if (productoAdaptado.es_vehiculo === 1) {
            try {
                const chasis = await VentasService.obtenerChasisDisponibles(productoAdaptado.lote_id);
                if (chasis.length === 0) {
                    toast.warning(`DISCREPANCIA: Hay ${productoAdaptado.cantidad} unidad(es) sin VIN asignado.`);
                    return;
                }
                setProductoSeleccionadoParaChasis(productoAdaptado);
                setModalChasisAbierto(true);
            } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : 'Error al validar chasis');
            }
            return;
        }
        agregarItem(productoAdaptado, null);
    }, [agregarItem]);

    const handleConfirmarChasisUI = useCallback((producto: StockVenta, chasis: ChasisDisponible) => {
        agregarItem(producto, chasis);
        setModalChasisAbierto(false);
    }, [agregarItem]);

    const handleFinalizarVenta = useCallback(() => {
        procesarVenta(() => setRefreshTrigger(prev => prev + 1));
    }, [procesarVenta]);

    // ── 5. RENDERIZADO ────────────────────────────────────────────────────────
    return (
        <>
            <div className="flex flex-1 gap-4 h-full overflow-hidden">
                <CatalogoProductos
                    busqueda={busqueda} setBusqueda={setBusqueda}
                    categorias={listaCategorias} filtroCategoriaId={filtroCategoriaId}
                    setFiltroCategoriaId={(id) => { setFiltroCategoriaId(id); setFiltroMarcaId('TODAS'); }}
                    marcas={listaMarcas} filtroMarcaId={filtroMarcaId} setFiltroMarcaId={setFiltroMarcaId}
                    productosAgrupados={productosAgrupados}
                    onAgregarAlCarrito={handleAgregarAlCarritoUI}
                    onSeleccionarVariante={(prod) => { setProductoAgrupadoSeleccionado(prod); setModalVariantesAbierto(true); }}
                    cargarMasItems={cargarMasItems} hasMore={hasMore} cargandoCatalogo={cargandoCatalogo}
                    stockEnCarrito={stockEnCarrito}
                />
                <CarritoVentas
                    carrito={carrito} setCarrito={setCarrito}
                    clienteSeleccionado={clienteSeleccionado} setClienteSeleccionado={setClienteSeleccionado}
                    nombreManual={nombreManual} setNombreManual={setNombreManual} setModalClientes={setModalClientes}
                    totalCarrito={totalCarrito} handleProcesarVenta={handleFinalizarVenta} procesando={procesando}
                />
            </div>

            {modalChasisAbierto && productoSeleccionadoParaChasis && (
                <ModalSeleccionChasis
                    isOpen={modalChasisAbierto} onClose={() => setModalChasisAbierto(false)}
                    producto={productoSeleccionadoParaChasis} onConfirmar={handleConfirmarChasisUI}
                />
            )}

            {modalVariantesAbierto && productoAgrupadoSeleccionado && (
                <ModalSeleccionVariante
                    isOpen={modalVariantesAbierto} onClose={() => setModalVariantesAbierto(false)}
                    productoAgrupado={productoAgrupadoSeleccionado}
                    onSeleccionar={(variante) => {
                        setModalVariantesAbierto(false);
                        handleAgregarAlCarritoUI(variante, productoAgrupadoSeleccionado);
                    }}
                />
            )}

            <ModalDirectorioClientes
                isOpen={modalClientes} onClose={() => setModalClientes(false)}
                onSelect={(cliente) => { setClienteSeleccionado(cliente); setNombreManual(''); setModalClientes(false); }}
            />

            <ModalVentaExitosa
                venta={ventaExitosa}
                onVerPDF={() => manejarTicketPDF('VER')} onDescargarPDF={() => manejarTicketPDF('DESCARGAR')}
                onCerrar={limpiarVentaExitosa}
            />

            {pdfGeneradoUrl && (
                <ModalVisorPDF isOpen={!!pdfGeneradoUrl} onClose={cerrarVisorPDF} pdfUrl={pdfGeneradoUrl} />
            )}
        </>
    );
}
// src/hooks/useBodega.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { InventarioService } from '../services/inventario_service';
import { MaestrosService } from '../services/maestros_service';
import { useDebounce } from './useDebounce';
import { normalizeError } from '../utils/errors';
import type { Categoria, Marca, BodegaItemVista } from '../types';
import type { ProductoBodega, VarianteBodega } from '../types';

// ============================================================
// TIPOS EXPORTADOS — consumidos por Bodega.tsx y sub-componentes
// ============================================================

export type FilaTabla =
    | { tipo: 'producto'; producto: ProductoBodega }
    | { tipo: 'subheader'; productoId: string; cantidad: number; nombre: string }
    | { tipo: 'variante'; variante: VarianteBodega; padre: ProductoBodega };

export const ITEMS_POR_PAGINA = 25;

// Alturas de fila por tipo — constante estable para estimateSize del virtualizer
export const ALTURA_FILA: Record<FilaTabla['tipo'], number> = {
    producto: 64,
    subheader: 32,
    variante: 52,
};

// ============================================================
// HELPERS — fuera del hook, referencia estable garantizada
// ============================================================

/**
 * Obtiene la variante con la fecha más reciente sin sort() ni IIFE.
 * reduce() es O(n) sobre variantes (2-10 items normalmente).
 */
export function obtenerVarianteMasReciente(variantes: VarianteBodega[]): VarianteBodega | null {
    return variantes.reduce<VarianteBodega | null>((acc, v) => {
        if (!v.fecha_ultima_modificacion) return acc;
        if (!acc || v.fecha_ultima_modificacion > (acc.fecha_ultima_modificacion ?? '')) return v;
        return acc;
    }, null);
}

/**
 * Construye un BodegaItemVista desde una VarianteBodega y su ProductoBodega padre.
 * Sin useMemo — el costo de construir el objeto es O(1) y trivial.
 */
export function varianteALote(v: VarianteBodega, p: ProductoBodega): BodegaItemVista {
    return {
        lote_id: v.lote_id,
        color: v.color,
        cantidad: v.cantidad,
        ubicacion: v.ubicacion,
        producto_nombre: p.producto_nombre,
        sku: p.sku,
        es_vehiculo: p.es_vehiculo,
        stock_minimo: p.stock_minimo,
        categoria_nombre: p.categoria_nombre,
        marca_nombre: p.marca_nombre,
        ultimo_ingreso: v.ultimo_ingreso,
        stock_anterior: v.stock_anterior,
        fecha_ultima_modificacion: v.fecha_ultima_modificacion,
    };
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export interface UseBodegaReturn {
    // ── Datos ────────────────────────────────────────────────
    productos: ProductoBodega[];
    filasAplanadas: FilaTabla[];
    categorias: Categoria[];
    marcas: Marca[];
    totalItems: number;
    // ── Estado de UI ─────────────────────────────────────────
    cargando: boolean;
    errorVista: string | null;
    expandidos: Set<string>;
    // ── Filtros y paginación ─────────────────────────────────
    busquedaInput: string;
    categoriaFiltro: string;
    marcaFiltro: string;
    pagina: number;
    totalPaginas: number;
    desde: number;
    hasta: number;
    // ── Estado de modales ────────────────────────────────────
    modalIngresoNuevoAbierto: boolean;
    modalRecargaAbierto: boolean;
    loteParaRecargar: BodegaItemVista | null;
    // ── Flags derivados ──────────────────────────────────────
    categoriaSeleccionada: boolean;
    sinMarcasEnCategoria: boolean;
    // ── Handlers ────────────────────────────────────────────
    cargarStock: () => Promise<void>;
    toggleExpandido: (productoId: string) => void;
    abrirModalRecarga: (lote: BodegaItemVista) => void;
    setBusquedaInput: (v: string) => void;
    setCategoriaFiltro: (v: string) => void;
    setMarcaFiltro: (v: string) => void;
    setPagina: (v: number | ((p: number) => number)) => void;
    setModalIngresoNuevoAbierto: (v: boolean) => void;
    setModalRecargaAbierto: (v: boolean) => void;
}

export function useBodega(): UseBodegaReturn {

    // ── 1. Datos ──────────────────────────────────────────────────────────────
    const [productos, setProductos] = useState<ProductoBodega[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [totalItems, setTotalItems] = useState(0);

    // ── 2. Estado de UI ───────────────────────────────────────────────────────
    const [cargando, setCargando] = useState(true);
    const [errorVista, setErrorVista] = useState<string | null>(null);
    // O(1) lookup con Set — toggle sin indexOf ni filter
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

    // ── 3. Filtros y paginación ───────────────────────────────────────────────
    const [busquedaInput, setBusquedaInput] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [marcaFiltro, setMarcaFiltro] = useState('');
    const [pagina, setPagina] = useState(1);

    // ── 4. Modales ────────────────────────────────────────────────────────────
    const [modalIngresoNuevoAbierto, setModalIngresoNuevoAbierto] = useState(false);
    const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);
    const [loteParaRecargar, setLoteParaRecargar] = useState<BodegaItemVista | null>(null);

    const busquedaActiva = useDebounce(busquedaInput, 400);

    // ── Flags derivados ───────────────────────────────────────────────────────
    const categoriaSeleccionada = !!categoriaFiltro;
    const sinMarcasEnCategoria = categoriaSeleccionada && marcas.length === 0;

    // ── 5. Efectos ────────────────────────────────────────────────────────────

    // Cargar categorías al montar — solo una vez
    useEffect(() => {
        MaestrosService.obtenerCategorias()
            .then(setCategorias)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar categorías')));
    }, []);

    // Cargar marcas cuando cambia la categoría — reset de marca al cambiar
    useEffect(() => {
        setMarcaFiltro('');
        if (!categoriaFiltro) { setMarcas([]); return; }
        MaestrosService.obtenerMarcasPorCategoria(categoriaFiltro)
            .then(setMarcas)
            .catch(e => toast.error(normalizeError(e, 'Error al cargar marcas')));
    }, [categoriaFiltro]);

    // Volver a página 1 cuando cambia la búsqueda — evita página vacía
    useEffect(() => { setPagina(1); }, [busquedaActiva]);

    // ── 6. Carga de datos ─────────────────────────────────────────────────────
    const cargarStock = useCallback(async () => {
        setCargando(true);
        setErrorVista(null);
        try {
            const data = await InventarioService.obtenerStockAgrupado(
                busquedaActiva, categoriaFiltro, marcaFiltro, pagina, ITEMS_POR_PAGINA
            );
            setProductos(data.items);
            setTotalItems(data.total);
            // Colapsar todas las variantes al recargar — evita estado stale
            setExpandidos(new Set());
        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al cargar el stock');
            setErrorVista(msg);
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    }, [busquedaActiva, categoriaFiltro, marcaFiltro, pagina]);

    useEffect(() => { cargarStock(); }, [cargarStock]);

    // ── 7. Handlers ───────────────────────────────────────────────────────────

    const toggleExpandido = useCallback((productoId: string) => {
        setExpandidos(prev => {
            const next = new Set(prev);
            next.has(productoId) ? next.delete(productoId) : next.add(productoId);
            return next;
        });
    }, []);

    const abrirModalRecarga = useCallback((lote: BodegaItemVista) => {
        setLoteParaRecargar(lote);
        setModalRecargaAbierto(true);
    }, []);

    // ── 8. Lista aplanada para el virtualizador ───────────────────────────────
    // Producto expandido → [producto, subheader, variante×N]
    // Producto colapsado → [producto]
    // Solo recalcula cuando cambian productos o el set de expandidos
    const filasAplanadas = useMemo((): FilaTabla[] => {
        const filas: FilaTabla[] = [];
        for (const producto of productos) {
            filas.push({ tipo: 'producto', producto });
            if (expandidos.has(producto.producto_id) && producto.variantes.length > 1) {
                filas.push({
                    tipo: 'subheader',
                    productoId: producto.producto_id,
                    cantidad: producto.variantes.length,
                    nombre: producto.producto_nombre,
                });
                for (const variante of producto.variantes) {
                    filas.push({ tipo: 'variante', variante, padre: producto });
                }
            }
        }
        return filas;
    }, [productos, expandidos]);

    // ── 9. Cálculos derivados de paginación ───────────────────────────────────
    const { totalPaginas, desde, hasta } = useMemo(() => ({
        totalPaginas: Math.max(1, Math.ceil(totalItems / ITEMS_POR_PAGINA)),
        desde: totalItems === 0 ? 0 : (pagina - 1) * ITEMS_POR_PAGINA + 1,
        hasta: Math.min(pagina * ITEMS_POR_PAGINA, totalItems),
    }), [totalItems, pagina]);

    // ── 10. Retorno estructurado ──────────────────────────────────────────────
    return {
        // Datos
        productos,
        filasAplanadas,
        categorias,
        marcas,
        totalItems,
        // UI
        cargando,
        errorVista,
        expandidos,
        // Filtros y paginación
        busquedaInput,
        categoriaFiltro,
        marcaFiltro,
        pagina,
        totalPaginas,
        desde,
        hasta,
        // Modales
        modalIngresoNuevoAbierto,
        modalRecargaAbierto,
        loteParaRecargar,
        // Flags
        categoriaSeleccionada,
        sinMarcasEnCategoria,
        // Handlers
        cargarStock,
        toggleExpandido,
        abrirModalRecarga,
        setBusquedaInput,
        setCategoriaFiltro,
        setMarcaFiltro,
        setPagina,
        setModalIngresoNuevoAbierto,
        setModalRecargaAbierto,
    };
}
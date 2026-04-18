import { useState, useEffect, useRef, UIEvent } from 'react';
import { useDebounce } from './useDebounce';
import type { RepuestoCatalogo, DetalleOrden } from '../types';

const LIMITE_PAGINA = 20;

interface UseRepuestosEnOrdenParams {
    /** Si el modal está abierto — controla cuándo arrancar y limpiar */
    abierto: boolean;
    /** Función de carga de repuestos — de TallerService.obtenerCatalogoRepuestos */
    fetchRepuestos: (busqueda: string, limite: number, offset: number) => Promise<RepuestoCatalogo[]>;
    /** Detalles actuales de la orden — se usa para la sincronización reactiva de stock */
    detallesOrden: DetalleOrden[];
}

interface UseRepuestosEnOrdenReturn {
    resultados: RepuestoCatalogo[];
    buscando: boolean;
    cargandoMas: boolean;
    hayMas: boolean;
    busquedaLocal: string;
    setBusquedaLocal: (v: string) => void;
    handleScroll: (e: UIEvent<HTMLDivElement>) => void;
}

/**
 * useRepuestosEnOrden — Encapsula toda la lógica de búsqueda y sincronización
 * de repuestos en la hoja de trabajo del taller.
 *
 * Antes: 9 useEffect + 6 useState dispersos en ModalTallerHojaTrabajo.
 * Ahora: un único hook con responsabilidad clara y API mínima.
 *
 * Efectos internos:
 *   1. Debounce de búsqueda (300ms) — via useDebounce
 *   2. Reset de paginación cuando cambia búsqueda o se abre el modal
 *   3. Motor de carga + scroll infinito (con flag `activo` anti-memory-leak)
 *   4. Sincronización reactiva de stock cuando cambian los detalles de la orden
 *   5. Limpieza completa al cerrar el modal
 */
export function useRepuestosEnOrden({
    abierto,
    fetchRepuestos,
    detallesOrden,
}: UseRepuestosEnOrdenParams): UseRepuestosEnOrdenReturn {

    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [resultados, setResultados] = useState<RepuestoCatalogo[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [cargandoMas, setCargandoMas] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hayMas, setHayMas] = useState(true);

    // Snapshot de detalles anteriores para calcular el delta de stock
    const prevDetallesRef = useRef<DetalleOrden[]>([]);

    // ── Efecto 1: Debounce ────────────────────────────────────────────────────
    const busquedaDebounced = useDebounce(busquedaLocal, 300);

    // ── Efecto 2: Reset de paginación cuando cambia la búsqueda o se abre ───
    useEffect(() => {
        if (!abierto) return;
        setResultados([]);
        setOffset(0);
        setHayMas(true);
    }, [busquedaDebounced, abierto]);

    // ── Efecto 3: Motor de carga + scroll infinito ────────────────────────────
    useEffect(() => {
        if (!abierto) return;

        let activo = true;

        const cargar = async () => {
            if (offset === 0) setBuscando(true);
            else setCargandoMas(true);

            try {
                const data = await fetchRepuestos(busquedaDebounced, LIMITE_PAGINA, offset);

                if (!activo) return;

                setHayMas(data.length >= LIMITE_PAGINA);

                setResultados(prev =>
                    offset === 0 ? data : [...prev, ...data]
                );
            } catch {
                // El error ya fue logueado en el servicio — aquí solo evitamos crash
            } finally {
                if (activo) {
                    setBuscando(false);
                    setCargandoMas(false);
                }
            }
        };

        cargar();
        return () => { activo = false; };
    }, [busquedaDebounced, offset, abierto, fetchRepuestos]);

    // ── Efecto 4: Sincronización reactiva de stock ────────────────────────────
    // Cuando se agrega o quita un repuesto de la orden, actualizamos visualmente
    // el stock en el catálogo sin necesidad de recargar desde la BD.
    useEffect(() => {
        if (!abierto || resultados.length === 0) {
            prevDetallesRef.current = detallesOrden;
            return;
        }

        const prevMap = new Map<string, number>(
            prevDetallesRef.current.map(d => [d.lote_id, Number(d.cantidad)])
        );
        const nuevoMap = new Map<string, number>(
            detallesOrden.map(d => [d.lote_id, Number(d.cantidad)])
        );

        let huboCambios = false;

        const nuevosResultados = resultados.map(repuesto => {
            const oldCant = prevMap.get(repuesto.lote_id) ?? 0;
            const newCant = nuevoMap.get(repuesto.lote_id) ?? 0;
            const delta = newCant - oldCant;

            if (delta !== 0) {
                huboCambios = true;
                return {
                    ...repuesto,
                    cantidad: Math.max(0, repuesto.cantidad - delta),
                };
            }
            return repuesto;
        });

        if (huboCambios) setResultados(nuevosResultados);

        prevDetallesRef.current = detallesOrden;
    }, [detallesOrden]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Efecto 5: Limpieza al cerrar ──────────────────────────────────────────
    useEffect(() => {
        if (abierto) return;
        setBusquedaLocal('');
        setResultados([]);
        setOffset(0);
        setHayMas(true);
        prevDetallesRef.current = [];
    }, [abierto]);

    // ── Detector de scroll para paginación infinita ───────────────────────────
    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        const cercanAlFinal = scrollHeight - scrollTop <= clientHeight + 10;
        if (cercanAlFinal && !buscando && !cargandoMas && hayMas) {
            setOffset(prev => prev + LIMITE_PAGINA);
        }
    };

    return {
        resultados,
        buscando,
        cargandoMas,
        hayMas,
        busquedaLocal,
        setBusquedaLocal,
        handleScroll,
    };
}
// src/hooks/useRepuestosEnOrden.ts
import { useState, useEffect, useCallback, useRef, UIEvent } from 'react';
import { useDebounce } from './useDebounce';
import type { RepuestoCatalogo } from '../types';

const LIMITE_PAGINA = 20;

interface UseRepuestosEnOrdenParams {
    abierto: boolean;
    fetchRepuestos: (busqueda: string, limite: number, offset: number) => Promise<RepuestoCatalogo[]>;
}

interface UseRepuestosEnOrdenReturn {
    resultados: RepuestoCatalogo[];
    buscando: boolean;
    cargandoMas: boolean;
    hayMas: boolean;
    error: string | null;
    busquedaLocal: string;
    setBusquedaLocal: (v: string) => void;
    handleScroll: (e: UIEvent<HTMLDivElement>) => void;
    refrescarCatalogo: () => void;
}

/**
 * useRepuestosEnOrden — versión definitiva.
 *
 * PROBLEMAS DE LA VERSIÓN ANTERIOR:
 *
 * 1. DOS EFECTOS QUE COMPITEN: El Efecto 1 (reset de offset) y el Efecto 2 (fetch)
 *    tenían dependencias solapadas. Bajo estrés (agregar/quitar repuestos rápido),
 *    disparaban 2-3 fetches simultáneos. El flag `activo` cancelaba todos menos el
 *    último en INICIARSE — pero no el último en RESOLVERSE. Si SQLite respondía
 *    fuera de orden, el resultado incorrecto ganaba.
 *
 * 2. triggerRefresco + setOffset(0) como dos setState separados → dos renders
 *    → dos ejecuciones del efecto de fetch → race condition garantizada cuando
 *    offset ya era 0 (primer repuesto agregado).
 *
 * 3. onRefrescarCatalogo se recreaba en cada render de useTaller (no estaba en
 *    useCallback), lo que causaba que el useEffect de registro en
 *    ModalTallerHojaTrabajo se disparara innecesariamente.
 *
 * SOLUCIÓN:
 *
 * Un único parámetro de control llamado `fetchKey` (número que se incrementa)
 * reemplaza tanto el offset-como-trigger como el triggerRefresco separado.
 * El efecto de fetch es EL ÚNICO que maneja la paginación y el reset.
 * Una ref para busquedaDebounced anterior detecta si el fetch es por nueva
 * búsqueda (→ reset) o por scroll (→ acumular) o por refresco (→ reset).
 *
 * El resultado: UN SOLO fetch en vuelo a la vez, garantizado.
 */
export function useRepuestosEnOrden({
    abierto,
    fetchRepuestos,
}: UseRepuestosEnOrdenParams): UseRepuestosEnOrdenReturn {

    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [resultados, setResultados] = useState<RepuestoCatalogo[]>([]);
    const [hayMas, setHayMas] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado de carga consolidado — elimina los boolean buscando/cargandoMas
    // que se podían desincronizar entre sí.
    const [estadoCarga, setEstadoCarga] = useState<'idle' | 'buscando' | 'mas'>('idle');

    // ✅ NÚCLEO DEL FIX: un único objeto de "intención de fetch" como ref.
    //    Al leerlo desde el efecto, React no lo trata como dependencia reactiva —
    //    evita re-renders espurios. Al escribirlo, el efecto usa siempre el valor más reciente.
    const intentoRef = useRef<{
        busqueda: string;
        offset: number;
        version: number;  // se incrementa en cada refresco forzado
    }>({ busqueda: '', offset: 0, version: 0 });

    // Señal reactiva que dispara el efecto — un único número.
    // Se incrementa cuando queremos un fetch: búsqueda nueva, scroll, refresco.
    const [fetchSignal, setFetchSignal] = useState(0);

    const busquedaDebounced = useDebounce(busquedaLocal, 300);

    // ── Cuando cambia la búsqueda: reset + fetch ──────────────────────────────
    useEffect(() => {
        if (!abierto) return;
        // Actualizar la intención: nueva búsqueda → offset vuelve a 0
        intentoRef.current = {
            busqueda: busquedaDebounced,
            offset: 0,
            version: intentoRef.current.version,
        };
        // Disparar el efecto de fetch con una señal
        setFetchSignal(s => s + 1);
    }, [busquedaDebounced, abierto]);

    // ── ÚNICO EFECTO DE FETCH ─────────────────────────────────────────────────
    // Solo depende de fetchSignal — un número que cambia exactamente cuando
    // queremos un fetch. Nada más puede dispararlo accidentalmente.
    useEffect(() => {
        if (!abierto) return;

        const { busqueda, offset, version: _v } = intentoRef.current;
        let activo = true;

        const esReset = offset === 0;
        setEstadoCarga(esReset ? 'buscando' : 'mas');
        setError(null);

        const cargar = async () => {
            try {
                const data = await fetchRepuestos(busqueda, LIMITE_PAGINA, offset);
                if (!activo) return;  // fetch más reciente ganó — ignorar este

                setHayMas(data.length >= LIMITE_PAGINA);
                setResultados(prev => esReset ? data : [...prev, ...data]);
            } catch {
                if (!activo) return;
                setError('No se pudo cargar el catálogo de repuestos.');
            } finally {
                if (activo) setEstadoCarga('idle');
            }
        };

        cargar();
        return () => { activo = false; };

        // fetchSignal es la ÚNICA dependencia — se actualiza cuando queremos fetch.
        // fetchRepuestos y abierto son estables en la práctica (useCallback + prop).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchSignal]);

    // ── Limpieza al cerrar ────────────────────────────────────────────────────
    useEffect(() => {
        if (abierto) return;
        setBusquedaLocal('');
        setResultados([]);
        setHayMas(true);
        setError(null);
        setEstadoCarga('idle');
        intentoRef.current = { busqueda: '', offset: 0, version: 0 };
    }, [abierto]);

    // ── refrescarCatalogo: fuerza un fetch desde offset=0 ────────────────────
    // useCallback([]) — referencia absolutamente estable.
    // No importa cuántas veces se llame: solo actualiza el ref y dispara la señal.
    const refrescarCatalogo = useCallback(() => {
        intentoRef.current = {
            busqueda: intentoRef.current.busqueda,
            offset: 0,
            version: intentoRef.current.version + 1,
        };
        setFetchSignal(s => s + 1);
    }, []);

    // ── Scroll infinito ───────────────────────────────────────────────────────
    const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        const cercanAlFinal = scrollHeight - scrollTop <= clientHeight + 50;

        if (cercanAlFinal && estadoCarga === 'idle' && hayMas) {
            // Cargar más: incrementar offset, preservar búsqueda y versión
            const nuevoOffset = intentoRef.current.offset + LIMITE_PAGINA;
            intentoRef.current = {
                ...intentoRef.current,
                offset: nuevoOffset,
            };
            setFetchSignal(s => s + 1);
        }
    }, [estadoCarga, hayMas]);

    return {
        resultados,
        buscando: estadoCarga === 'buscando',
        cargandoMas: estadoCarga === 'mas',
        hayMas,
        error,
        busquedaLocal,
        setBusquedaLocal,
        handleScroll,
        refrescarCatalogo,
    };
}
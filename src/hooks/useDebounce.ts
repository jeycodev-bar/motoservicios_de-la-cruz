import { useState, useEffect } from 'react';

/**
 * useDebounce — Retarda la actualización de un valor hasta que el usuario
 * deja de cambiar la entrada por `delay` milisegundos.
 *
 * Reemplaza el patrón manual de setTimeout/clearTimeout repetido en 8 archivos:
 *   useEffect(() => {
 *     const t = setTimeout(() => setDebounced(value), 300);
 *     return () => clearTimeout(t);
 *   }, [value]);
 *
 * Uso:
 *   const busquedaDebounced = useDebounce(busquedaLocal, 300);
 *
 * @param value  Valor a debouncear (normalmente el valor de un input)
 * @param delay  Milisegundos de espera (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
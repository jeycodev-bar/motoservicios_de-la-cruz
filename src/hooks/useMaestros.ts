// import { useState, useEffect, useMemo, useCallback } from 'react';
// import { MaestrosService } from '../services/maestros_service';
// import { Categoria, Marca } from '../types/database';

// export type TipoNotificacion = 'success' | 'error';

// export function useMaestros() {
//     const [categorias, setCategorias] = useState<Categoria[]>([]);
//     const [marcas, setMarcas] = useState<Marca[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [notification, setNotification] = useState<{ tipo: TipoNotificacion; mensaje: string } | null>(null);

//     // Memorizamos la función para mostrar notificaciones y limpiar timeouts
//     const mostrarNotificacion = useCallback((tipo: TipoNotificacion, mensaje: string) => {
//         setNotification({ tipo, mensaje });
//         setTimeout(() => setNotification(null), 5000);
//     }, []);

//     const cargarDatos = useCallback(async () => {
//         setIsLoading(true);
//         try {
//             const [dataCategorias, dataMarcas] = await Promise.all([
//                 MaestrosService.obtenerCategorias(),
//                 MaestrosService.obtenerMarcas()
//             ]);
//             setCategorias(dataCategorias);
//             setMarcas(dataMarcas);
//         } catch (error) {
//             console.error("Error al cargar maestros:", error);
//             mostrarNotificacion('error', "No se pudieron cargar los datos de la base de datos.");
//         } finally {
//             setIsLoading(false);
//         }
//     }, [mostrarNotificacion]);

//     useEffect(() => {
//         cargarDatos();
//     }, [cargarDatos]);

//     const categoriasMap = useMemo(() => {
//         return categorias.reduce((acc, cat) => {
//             acc[cat.id] = cat.nombre;
//             return acc;
//         }, {} as Record<string, string>);
//     }, [categorias]);

//     // Operaciones (Retornan promesas para que el componente maneje sus propios estados de 'submitting')
//     const crearCategoria = async (nombre: string, descripcion: string) => {
//         await MaestrosService.crearCategoria(nombre.trim().toUpperCase(), descripcion);
//         mostrarNotificacion('success', 'Categoría creada exitosamente.');
//         await cargarDatos();
//     };

//     const eliminarCategoria = async (id: string) => {
//         await MaestrosService.eliminarCategoria(id);
//         mostrarNotificacion('success', 'Categoría eliminada.');
//         await cargarDatos();
//     };

//     const crearMarca = async (nombre: string, categoriaId: string) => {
//         await MaestrosService.crearMarca(nombre.trim().toUpperCase(), categoriaId);
//         mostrarNotificacion('success', 'Marca registrada exitosamente.');
//         await cargarDatos();
//     };

//     const eliminarMarca = async (id: string) => {
//         await MaestrosService.eliminarMarca(id);
//         mostrarNotificacion('success', 'Marca eliminada.');
//         await cargarDatos();
//     };

//     return {
//         categorias,
//         marcas,
//         categoriasMap,
//         isLoading,
//         notification,
//         setNotification,
//         mostrarNotificacion,
//         operaciones: {
//             crearCategoria,
//             eliminarCategoria,
//             crearMarca,
//             eliminarMarca
//         }
//     };
// }


import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { MaestrosService } from '../services/maestros_service';
import { normalizeError } from '../utils/errors';

// ✅ Tipos desde @/types — no desde '../types/database'
import type { Categoria, Marca } from '../types';

export function useMaestros() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ✅ useCallback — referencia estable para usar en useEffect sin stale closure
    const cargarDatos = useCallback(async () => {
        setIsLoading(true);
        try {
            // Ejecución en paralelo para optimizar tiempo de carga
            const [dataCategorias, dataMarcas] = await Promise.all([
                MaestrosService.obtenerCategorias(),
                MaestrosService.obtenerMarcas(),
            ]);
            setCategorias(dataCategorias);
            setMarcas(dataMarcas);
        } catch (e: unknown) {
            // ✅ catch(e: unknown) tipado — sin catch(error) implícito any
            toast.error('Fallo al sincronizar', {
                description: normalizeError(e, 'No se pudieron cargar los datos de la base de datos.'),
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Mapa id → nombre para lookups O(1) en ConfiguracionMaestros
    const categoriasMap = useMemo(() =>
        categorias.reduce<Record<string, string>>((acc, cat) => {
            acc[cat.id] = cat.nombre;
            return acc;
        }, {}),
        [categorias]);

    // ── Operaciones ──────────────────────────────────────────────────────────
    // Sin toast aquí — ConfiguracionMaestros maneja las notificaciones
    // en sus propios bloques try/catch para tener contexto de la acción.

    const crearCategoria = async (nombre: string, descripcion: string) => {
        await MaestrosService.crearCategoria(nombre.trim().toUpperCase(), descripcion);
        await cargarDatos();
    };

    const eliminarCategoria = async (id: string) => {
        await MaestrosService.eliminarCategoria(id);
        await cargarDatos();
    };

    const crearMarca = async (nombre: string, categoriaId: string) => {
        await MaestrosService.crearMarca(nombre.trim().toUpperCase(), categoriaId);
        await cargarDatos();
    };

    const eliminarMarca = async (id: string) => {
        await MaestrosService.eliminarMarca(id);
        await cargarDatos();
    };

    return {
        categorias,
        marcas,
        categoriasMap,
        isLoading,
        /** Recarga manual — úsalo con <ErrorBanner onReintentar={refrescarDatos} /> */
        refrescarDatos: cargarDatos,
        operaciones: {
            crearCategoria,
            eliminarCategoria,
            crearMarca,
            eliminarMarca,
        },
    };
}
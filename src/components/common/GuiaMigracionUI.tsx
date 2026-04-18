/**
 * GUÍA DE MIGRACIÓN — cómo reemplazar los bloques inline por los componentes UI.
 *
 * Este archivo muestra las 3 sustituciones en Bodega.tsx como referencia.
 * El patrón es idéntico para Catalogo, DirectorioClientes e HistorialVentas.
 */

// ─── IMPORTS A AÑADIR ────────────────────────────────────────────────────────

// import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../components/ui';
import { BuscadorInput, PaginacionTabla, ErrorBanner } from '../common';

// ─── 1. BUSCADOR ─────────────────────────────────────────────────────────────
//
// ANTES (bloque inline en Bodega.tsx ~20 líneas):
//
//   <div className="relative flex-1 min-w-[300px]">
//     <Search className={`absolute left-4 top-1/2 ...`} size={20} />
//     <input
//       type="text"
//       placeholder="Buscar por SKU..."
//       value={busquedaInput}
//       onChange={e => setBusquedaInput(e.target.value)}
//       className="w-full pl-12 pr-12 py-2.5 ..."
//     />
//     {busquedaInput && (
//       <button onClick={() => setBusquedaInput('')} ...>
//         <X size={14} />
//       </button>
//     )}
//   </div>
//
// DESPUÉS (1 línea):

const _EjemploBuscador = (
    <BuscadorInput
        value={/* busquedaInput */ ''}
        onChange={e => { /* setBusquedaInput(e.target.value) */ void e; }}
        onLimpiar={() => { /* setBusquedaInput('') */ }}
        placeholder="Buscar por SKU, nombre del producto o clasificación..."
        cargando={/* cargando */ false}
        rounded="2xl"
        className="flex-1 min-w-[300px]"
    />
);

// ─── 2. ERROR BANNER ─────────────────────────────────────────────────────────
//
// ANTES (bloque inline en cada vista ~8 líneas):
//
//   {errorVista && (
//     <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl
//                     text-red-700 text-sm font-medium flex justify-between items-center">
//       <span>{errorVista}</span>
//       <button onClick={cargarStock} className="ml-4 px-3 py-1 ...">
//         Reintentar
//       </button>
//     </div>
//   )}
//
// DESPUÉS (1 línea):

const _errorVista: string | null = null;
const _EjemploError = _errorVista && (
    <ErrorBanner
        mensaje={_errorVista}
        onReintentar={() => { /* cargarStock() */ }}
        className="mb-6"
    />
);

// ─── 3. PAGINACIÓN ───────────────────────────────────────────────────────────
//
// ANTES (bloque inline en Bodega.tsx ~30 líneas):
//
//   <div className="bg-slate-50/80 border-t border-slate-200 px-6 py-4
//                   flex flex-col sm:flex-row items-center justify-between gap-4">
//     <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
//       <span>Mostrando</span>
//       <span className="bg-white px-2 ...">{desde}</span>
//       <span>al</span>
//       <span className="bg-white px-2 ...">{hasta}</span>
//       ...
//     </div>
//     <div className="flex items-center gap-2">
//       <button onClick={() => setPagina(p => Math.max(1, p - 1))} ...>
//         <ChevronLeft /> Anterior
//       </button>
//       <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} ...>
//         Siguiente <ChevronRight />
//       </button>
//     </div>
//   </div>
//
// DESPUÉS — variante Bodega (contador rico con "Mostrando X al Y de Z"):

const _desde = 0; const _hasta = 0; const _totalItems = 0;
const _pagina = 1; const _totalPaginas = 1; const _cargando = false;

const _EjemploPaginacionBodega = (
    <PaginacionTabla
        paginaActual={_pagina}
        totalPaginas={_totalPaginas}
        onAnterior={() => { /* setPagina(p => Math.max(1, p - 1)) */ }}
        onSiguiente={() => { /* setPagina(p => Math.min(totalPaginas, p + 1)) */ }}
        cargando={_cargando}
        contador={
            <span className="text-sm text-slate-500 font-medium flex items-center gap-2">
                Mostrando{' '}
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">{_desde}</span>
                {' '}al{' '}
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-800">{_hasta}</span>
                {' '}de{' '}
                <span className="font-black text-slate-800">{_totalItems}</span>
            </span>
        }
    />
);

// DESPUÉS — variante Catalogo (simple):

const _EjemploPaginacionCatalogo = (
    <PaginacionTabla
        paginaActual={_pagina}
        totalPaginas={_totalPaginas}
        onAnterior={() => { /* setPaginaActual(p => Math.max(1, p - 1)) */ }}
        onSiguiente={() => { /* setPaginaActual(p => Math.min(totalPaginas, p + 1)) */ }}
        cargando={_cargando}
        // Sin `contador` → muestra "Página X de Y" por defecto
    />
);

// DESPUÉS — variante DirectorioClientes ("Mostrando X de Z clientes"):

const _clientes: unknown[] = []; const _totalClientes = 0;
const _EjemploPaginacionDirectorio = (
    <PaginacionTabla
        paginaActual={_pagina}
        totalPaginas={_totalPaginas}
        onAnterior={() => { /* setPaginaActual(p => p - 1) */ }}
        onSiguiente={() => { /* setPaginaActual(p => p + 1) */ }}
        cargando={_cargando}
        contador={`Mostrando ${_clientes.length} de ${_totalClientes} clientes`}
    />
);

// Evitar errores de "declarado pero no usado" en este archivo de documentación
export { _EjemploBuscador, _EjemploError, _EjemploPaginacionBodega, _EjemploPaginacionCatalogo, _EjemploPaginacionDirectorio };
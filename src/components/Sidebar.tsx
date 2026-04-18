// // src/components/Sidebar.tsx
// import React, { useState, useEffect, useMemo } from 'react';
// import { useAuth } from '../context/AuthContext';
// import {
//     LogOut, FileCog, PackageSearch, Boxes,
//     FileSpreadsheet, ShoppingCart, History, Users,
//     Wrench, UserCog, ChevronDown, Store, Motorbike,
//     Briefcase, Blocks, ShieldCheck, Ban, ListFilterPlus,
//     PanelLeftClose, PanelLeftOpen // Restaurados los iconos correctos
// } from 'lucide-react';
// import ModalConfirmacion from '../modales/ModalConfirmacion';

// type CategoriaMenu = 'Ventas y Taller' | 'Inventario y Flota' | 'Administración';

// const CATEGORIA_ICONOS: Record<CategoriaMenu, React.ElementType> = {
//     'Ventas y Taller': Briefcase,
//     'Inventario y Flota': Blocks,
//     'Administración': ShieldCheck,
// };

// interface MenuItem {
//     id: string;
//     label: string;
//     icon: React.ElementType;
//     roles: string[];
//     categoria: CategoriaMenu;
// }

// export const MENU_ITEMS: MenuItem[] = [
//     { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Ventas y Taller' },
//     { id: 'historial', label: 'Historial Ventas', icon: History, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Ventas y Taller' },
//     { id: 'taller', label: 'Taller Mecánico', icon: Wrench, roles: ['ADMINISTRADOR', 'MECANICO'], categoria: 'Ventas y Taller' },
//     { id: 'maestros', label: 'Config. Maestros', icon: FileCog, roles: ['ADMINISTRADOR'], categoria: 'Inventario y Flota' },
//     { id: 'catalogo', label: 'Catálogo Central', icon: PackageSearch, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
//     { id: 'bodega', label: 'Bodega y Stock', icon: Boxes, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
//     { id: 'vehiculos', label: 'Control de Flota', icon: Motorbike, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
//     { id: 'clientes', label: 'Directorio Clientes', icon: Users, roles: ['ADMINISTRADOR', 'VENDEDOR', 'MECANICO'], categoria: 'Administración' },
//     { id: 'kardex', label: 'Auditoría Kardex', icon: FileSpreadsheet, roles: ['ADMINISTRADOR'], categoria: 'Administración' },
//     { id: 'usuarios', label: 'Gestión de Personal', icon: UserCog, roles: ['ADMINISTRADOR'], categoria: 'Administración' },
// ];

// interface SidebarProps {
//     vistaActual: string;
//     setVistaActual: (vista: string) => void;
// }

// export default function Sidebar({ vistaActual, setVistaActual }: SidebarProps) {
//     const { usuario, logout } = useAuth();

//     const [logoError, setLogoError] = useState(false);
//     const [mostrarConfirmacionLogout, setMostrarConfirmacionLogout] = useState(false);

//     // Control de Sidebar Mini/Expandido
//     const [isCollapsed, setIsCollapsed] = useState(false);

//     // Control de Acordeones
//     const [categoriasAbiertas, setCategoriasAbiertas] = useState<Record<string, boolean>>(() => {
//         const estadoInicial: Record<string, boolean> = {};
//         const itemActual = MENU_ITEMS.find(i => i.id === vistaActual);
//         if (itemActual) estadoInicial[itemActual.categoria] = true;
//         return estadoInicial;
//     });

//     useEffect(() => {
//         const itemActual = MENU_ITEMS.find(i => i.id === vistaActual);
//         if (itemActual) {
//             setCategoriasAbiertas(prev => ({ ...prev, [itemActual.categoria]: true }));
//         }
//     }, [vistaActual]);

//     const menuAgrupado = useMemo(() => {
//         if (!usuario) return {};
//         const permitidos = MENU_ITEMS.filter(item => item.roles.includes(usuario.rol));
//         return permitidos.reduce((acc, item) => {
//             if (!acc[item.categoria]) acc[item.categoria] = [];
//             acc[item.categoria].push(item);
//             return acc;
//         }, {} as Record<string, MenuItem[]>);
//     }, [usuario?.rol]);

//     if (!usuario) return null;

//     const toggleCategoria = (categoria: string) => {
//         if (!isCollapsed) {
//             setCategoriasAbiertas(prev => ({ ...prev, [categoria]: !prev[categoria] }));
//         }
//     };

//     return (
//         <>
//             <aside 
//                 className={`relative bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-40 transition-[width] duration-300 ease-in-out border-r border-slate-800 h-screen shrink-0 whitespace-nowrap
//                 ${isCollapsed ? 'w-20' : 'w-72'}`}
//             >
//                 {/* ✨ BOTÓN PARA EXPANDIR (Solo visible cuando está colapsado, en el límite derecho) */}
//                 {isCollapsed && (
//                     <button
//                         onClick={() => setIsCollapsed(false)}
//                         className="absolute -right-3.5 top-8 w-7 h-7 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-50 outline-none group"
//                         title="Expandir Menú"
//                     >
//                         <PanelLeftOpen className="w-4 h-4 text-slate-400 group-hover:text-white" />
//                     </button>
//                 )}

//                 {/* CABECERA Y LOGO */}
//                 <div className="h-20 flex items-center justify-between px-5 bg-slate-950/80 border-b border-slate-800 shrink-0 overflow-hidden shadow-sm">
//                     <div className="flex items-center gap-3">
//                         <div className="shrink-0 flex items-center justify-center">
//                             {!logoError ? (
//                                 <img
//                                     src="/logo.webp"
//                                     alt="MotoSystem Logo"
//                                     className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
//                                     onError={() => setLogoError(true)}
//                                 />
//                             ) : (
//                                 <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
//                                     <Store className="w-6 h-6 text-white" />
//                                 </div>
//                             )}
//                         </div>

//                         {/* Textos del logo - Se ocultan con opacidad al colapsar */}
//                         <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
//                             <h1 className="text-xl font-black text-white tracking-wide leading-tight">
//                                 De La <span className="text-blue-500">Cruz</span>
//                             </h1>
//                             <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Moto Servicios</span>
//                         </div>
//                     </div>

//                     {/* ✨ BOTÓN PARA COLAPSAR (Dentro del panel, solo visible cuando está expandido) */}
//                     {!isCollapsed && (
//                         <button
//                             onClick={() => setIsCollapsed(true)}
//                             className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-colors outline-none shrink-0"
//                             title="Colapsar Menú"
//                         >
//                             <PanelLeftClose className="w-5 h-5" />
//                         </button>
//                     )}
//                 </div>

//                 {/* MENÚ DE NAVEGACIÓN */}
//                 <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-4 custom-scrollbar px-4">
//                     {Object.entries(menuAgrupado).map(([categoria, items]) => {
//                         const estaAbierto = categoriasAbiertas[categoria];
//                         const IconCategoria = CATEGORIA_ICONOS[categoria as CategoriaMenu] ?? Ban;

//                         return (
//                             <div key={categoria} className="flex flex-col space-y-1">

//                                 {/* HEADER DE CATEGORÍA */}
//                                 {isCollapsed ? (
//                                     // ✨ MODO MINI: Un sutil divisor en lugar del texto
//                                     <div className="flex justify-center mb-2 mt-4">
//                                         <div className="w-6 h-[2px] bg-slate-800 rounded-full"></div>
//                                     </div>
//                                 ) : (
//                                     // ✨ MODO EXPANDIDO: Restaurados tus colores violeta y esmeralda
//                                     <button
//                                         onClick={() => toggleCategoria(categoria)}
//                                         className="flex items-center justify-between w-full px-2 py-2 mb-1 group outline-none"
//                                     >
//                                         <div className="flex items-center gap-2">
//                                             <IconCategoria className="w-4 h-4 text-violet-400 group-hover:text-red-500 transition-colors" />
//                                             <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest group-hover:text-red-200 transition-colors">
//                                                 {categoria}
//                                             </span>
//                                         </div>
//                                         {estaAbierto ? (
//                                             <ChevronDown className="w-4 h-4 text-violet-400 group-hover:text-red-500 transition-colors" />
//                                         ) : (
//                                             <ListFilterPlus className="w-4 h-4 text-slate-500 group-hover:text-red-500 transition-colors" />
//                                         )}
//                                     </button>
//                                 )}

//                                 {/* LISTA DE SUB-ITEMS */}
//                                 <div className={`flex flex-col space-y-1 transition-all duration-300 overflow-hidden
//                                     ${isCollapsed 
//                                         ? 'max-h-[1000px] opacity-100' // En modo mini, siempre se ven
//                                         : (estaAbierto ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0') // En expandido, respeta el acordeón
//                                     }`}
//                                 >
//                                     {items.map((item) => {
//                                         const Icon = item.icon;
//                                         const activo = vistaActual === item.id;

//                                         return (
//                                             <div key={item.id} className="relative group/tooltip flex justify-center">
//                                                 <button
//                                                     onClick={() => setVistaActual(item.id)}
//                                                     // ✨ RESTAURADOS tus colores cyan y la barra verde lateral
//                                                     className={`w-full flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden outline-none
//                                                         ${isCollapsed ? 'justify-center px-0' : 'px-3'}
//                                                         ${activo
//                                                             ? 'bg-cyan-600/15 text-cyan-300 font-semibold'
//                                                             : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
//                                                         }`}
//                                                 >
//                                                     {/* Barra verde iluminada a la izquierda (visible en ambos modos) */}
//                                                     {activo && (
//                                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-300 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
//                                                     )}

//                                                     <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${activo ? 'scale-110 text-blue-500' : 'group-hover:scale-110'}`} />

//                                                     {!isCollapsed && (
//                                                         <span className="text-sm truncate">{item.label}</span>
//                                                     )}
//                                                 </button>

//                                                 {/* ✨ TOOLTIP NATIVO (Solo visible en modo Mini) */}
//                                                 {isCollapsed && (
//                                                     <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 text-emerald-300 text-xs font-bold tracking-wide rounded-md shadow-lg border border-slate-700 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 whitespace-nowrap">
//                                                         {item.label}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         );
//                                     })}
//                                 </div>
//                             </div>
//                         );
//                     })}
//                 </nav>

//                 {/* TARJETA DE PERFIL Y SALIDA */}
//                 <div className={`p-4 bg-slate-950/40 border-t border-slate-800 shrink-0 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
//                     <div className={`flex items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors
//                         ${isCollapsed ? 'flex-col gap-3 py-3 px-1' : 'justify-between'}`}>

//                         <div className="flex items-center gap-3 overflow-hidden">
//                             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-900 to-purple-300 flex items-center justify-center shrink-0 shadow-lg" title={usuario.username}>
//                                 <span className="text-white font-bold text-sm">
//                                     {usuario.username.charAt(0).toUpperCase()}
//                                 </span>
//                             </div>

//                             {/* ✨ RESTAURADOS los colores yellow y emerald del usuario */}
//                             {!isCollapsed && (
//                                 <div className="flex flex-col truncate">
//                                     <span className="text-sm text-yellow-300 font-bold uppercase truncate">{usuario.username}</span>
//                                     <span className="text-[10px] font-semibold tracking-wider text-emerald-400 truncate flex items-center gap-1">
//                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
//                                         {usuario.rol}
//                                     </span>
//                                 </div>
//                             )}
//                         </div>

//                         <button
//                             onClick={() => setMostrarConfirmacionLogout(true)}
//                             className={`text-slate-400 hover:text-white hover:bg-red-500/90 rounded-lg transition-all shadow-sm hover:shadow-red-500/20 group shrink-0 outline-none
//                                 ${isCollapsed ? 'w-9 h-9 flex items-center justify-center' : 'p-2.5 ml-2'}`}
//                             title="Cerrar Sesión"
//                         >
//                             <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
//                         </button>
//                     </div>
//                 </div>
//             </aside>

//             <ModalConfirmacion
//                 isOpen={mostrarConfirmacionLogout}
//                 onClose={() => setMostrarConfirmacionLogout(false)}
//                 onConfirm={() => {
//                     setMostrarConfirmacionLogout(false);
//                     logout();
//                 }}
//                 titulo="Cerrar Sesión"
//                 mensaje="¿Estás seguro de que deseas salir del sistema? Cualquier cambio no guardado podría perderse."
//                 textoConfirmar="Sí, salir"
//                 textoCancelar="Quiero quedarme"
//                 tipo="salir"
//             />
//         </>
//     );
// }



// src/components/Sidebar.tsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LogOut, FileCog, PackageSearch, Boxes,
    FileSpreadsheet, ShoppingCart, History, Users,
    Wrench, UserCog, ChevronDown, Store, Motorbike,
    Briefcase, Blocks, ShieldCheck, Ban, ListFilterPlus,
    PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import ModalConfirmacion from '../modales/ModalConfirmacion';

type CategoriaMenu = 'Ventas y Taller' | 'Inventario y Flota' | 'Administración';

const CATEGORIA_ICONOS: Record<CategoriaMenu, React.ElementType> = {
    'Ventas y Taller': Briefcase,
    'Inventario y Flota': Blocks,
    'Administración': ShieldCheck,
};

interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    roles: string[];
    categoria: CategoriaMenu;
}

export const MENU_ITEMS: MenuItem[] = [
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Ventas y Taller' },
    { id: 'historial', label: 'Historial Ventas', icon: History, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Ventas y Taller' },
    { id: 'taller', label: 'Taller Mecánico', icon: Wrench, roles: ['ADMINISTRADOR', 'MECANICO'], categoria: 'Ventas y Taller' },
    { id: 'maestros', label: 'Config. Maestros', icon: FileCog, roles: ['ADMINISTRADOR'], categoria: 'Inventario y Flota' },
    { id: 'catalogo', label: 'Catálogo Central', icon: PackageSearch, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
    { id: 'bodega', label: 'Bodega y Stock', icon: Boxes, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
    { id: 'vehiculos', label: 'Control de Flota', icon: Motorbike, roles: ['ADMINISTRADOR', 'VENDEDOR'], categoria: 'Inventario y Flota' },
    { id: 'clientes', label: 'Directorio Clientes', icon: Users, roles: ['ADMINISTRADOR', 'VENDEDOR', 'MECANICO'], categoria: 'Administración' },
    { id: 'kardex', label: 'Auditoría Kardex', icon: FileSpreadsheet, roles: ['ADMINISTRADOR'], categoria: 'Administración' },
    { id: 'usuarios', label: 'Gestión de Personal', icon: UserCog, roles: ['ADMINISTRADOR'], categoria: 'Administración' },
];

interface SidebarProps {
    vistaActual: string;
    setVistaActual: (vista: string) => void;
}

// Envolvemos en React.memo para evitar re-renders si el padre cambia estados ajenos a este componente
const Sidebar = memo(function Sidebar({ vistaActual, setVistaActual }: SidebarProps) {
    const { usuario, logout } = useAuth();

    const [logoError, setLogoError] = useState(false);
    const [mostrarConfirmacionLogout, setMostrarConfirmacionLogout] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const [categoriasAbiertas, setCategoriasAbiertas] = useState<Record<string, boolean>>(() => {
        const estadoInicial: Record<string, boolean> = {};
        const itemActual = MENU_ITEMS.find(i => i.id === vistaActual);
        if (itemActual) estadoInicial[itemActual.categoria] = true;
        return estadoInicial;
    });

    // Sincroniza la apertura del acordeón si se cambia la vista programáticamente
    useEffect(() => {
        const itemActual = MENU_ITEMS.find(i => i.id === vistaActual);
        if (itemActual) {
            setCategoriasAbiertas(prev => {
                // Prevenir actualización de estado si ya está abierto (evita renders en cascada)
                if (prev[itemActual.categoria]) return prev;
                return { ...prev, [itemActual.categoria]: true };
            });
        }
    }, [vistaActual]);

    const menuAgrupado = useMemo(() => {
        if (!usuario) return {};
        const permitidos = MENU_ITEMS.filter(item => item.roles.includes(usuario.rol));
        return permitidos.reduce((acc, item) => {
            if (!acc[item.categoria]) acc[item.categoria] = [];
            acc[item.categoria].push(item);
            return acc;
        }, {} as Record<string, MenuItem[]>);
    }, [usuario?.rol]);

    if (!usuario) return null;

    const toggleCategoria = (categoria: string) => {
        if (!isCollapsed) {
            setCategoriasAbiertas(prev => ({ ...prev, [categoria]: !prev[categoria] }));
        }
    };

    return (
        <>
            <aside
                className={`relative bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-40 transition-[width] duration-300 ease-in-out border-r border-slate-800 h-screen shrink-0 whitespace-nowrap
                ${isCollapsed ? 'w-20' : 'w-72'}`}
                aria-label="Barra lateral principal"
            >
                {/* BOTÓN PARA EXPANDIR */}
                {isCollapsed && (
                    <button
                        onClick={() => setIsCollapsed(false)}
                        className="absolute -right-3.5 top-8 w-7 h-7 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-50 outline-none group focus:ring-2 focus:ring-blue-500"
                        title="Expandir Menú"
                        aria-label="Expandir Menú"
                    >
                        <PanelLeftOpen className="w-4 h-4 text-slate-400 group-hover:text-white" aria-hidden="true" />
                    </button>
                )}

                {/* CABECERA Y LOGO */}
                <div className="h-20 flex items-center justify-between px-5 bg-slate-950/80 border-b border-slate-800 shrink-0 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="shrink-0 flex items-center justify-center">
                            {!logoError ? (
                                <img
                                    src="/logo.webp"
                                    alt="MotoSystem Logo"
                                    className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20" aria-hidden="true">
                                    <Store className="w-6 h-6 text-white" />
                                </div>
                            )}
                        </div>

                        <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}`}>
                            <h1 className="text-xl font-black text-white tracking-wide leading-tight">
                                De La <span className="text-blue-500">Cruz</span>
                            </h1>
                            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Moto Servicios</span>
                        </div>
                    </div>

                    {/* BOTÓN PARA COLAPSAR */}
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsCollapsed(true)}
                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-md transition-colors outline-none shrink-0 focus:ring-2 focus:ring-blue-500"
                            title="Colapsar Menú"
                            aria-label="Colapsar Menú"
                        >
                            <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* MENÚ DE NAVEGACIÓN - Semántica HTML Corregida */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-4 custom-scrollbar px-4" aria-label="Navegación principal">
                    <ul className="space-y-4">
                        {Object.entries(menuAgrupado).map(([categoria, items]) => {
                            const estaAbierto = categoriasAbiertas[categoria];
                            const IconCategoria = CATEGORIA_ICONOS[categoria as CategoriaMenu] ?? Ban;

                            return (
                                <li key={categoria} className="flex flex-col space-y-1">

                                    {/* HEADER DE CATEGORÍA */}
                                    {isCollapsed ? (
                                        <div className="flex justify-center mb-2 mt-4" aria-hidden="true">
                                            <div className="w-6 h-[2px] bg-slate-800 rounded-full"></div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleCategoria(categoria)}
                                            aria-expanded={estaAbierto}
                                            aria-controls={`submenu-${categoria.replace(/\s+/g, '-')}`}
                                            className="flex items-center justify-between w-full px-2 py-2 mb-1 group outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
                                        >
                                            <div className="flex items-center gap-2">
                                                <IconCategoria className="w-4 h-4 text-violet-400 group-hover:text-red-500 transition-colors" aria-hidden="true" />
                                                <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest group-hover:text-red-200 transition-colors">
                                                    {categoria}
                                                </span>
                                            </div>
                                            {estaAbierto ? (
                                                <ChevronDown className="w-4 h-4 text-violet-400 group-hover:text-red-500 transition-colors" aria-hidden="true" />
                                            ) : (
                                                <ListFilterPlus className="w-4 h-4 text-slate-500 group-hover:text-red-500 transition-colors" aria-hidden="true" />
                                            )}
                                        </button>
                                    )}

                                    {/* LISTA DE SUB-ITEMS */}
                                    <ul
                                        id={`submenu-${categoria.replace(/\s+/g, '-')}`}
                                        className={`flex flex-col space-y-1 transition-all duration-300 overflow-hidden
                                        ${isCollapsed
                                                ? 'max-h-[1000px] opacity-100'
                                                : (estaAbierto ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0')
                                            }`}
                                    >
                                        {items.map((item) => {
                                            const Icon = item.icon;
                                            const activo = vistaActual === item.id;

                                            return (
                                                <li key={item.id} className="relative group/tooltip flex justify-center">
                                                    <button
                                                        onClick={() => setVistaActual(item.id)}
                                                        aria-current={activo ? 'page' : undefined}
                                                        className={`w-full flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
                                                        ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                                                        ${activo
                                                                ? 'bg-cyan-600/15 text-cyan-300 font-semibold'
                                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                                            }`}
                                                    >
                                                        {activo && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-300 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" aria-hidden="true"></div>
                                                        )}

                                                        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${activo ? 'scale-110 text-blue-500' : 'group-hover:scale-110'}`} aria-hidden="true" />

                                                        {!isCollapsed && (
                                                            <span className="text-sm truncate">{item.label}</span>
                                                        )}
                                                    </button>

                                                    {/* TOOLTIP NATIVO */}
                                                    {isCollapsed && (
                                                        <div role="tooltip" className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 text-emerald-300 text-xs font-bold tracking-wide rounded-md shadow-lg border border-slate-700 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 whitespace-nowrap pointer-events-none">
                                                            {item.label}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* TARJETA DE PERFIL Y SALIDA */}
                <div className={`p-4 bg-slate-950/40 border-t border-slate-800 shrink-0 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    <div className={`flex items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors
                        ${isCollapsed ? 'flex-col gap-3 py-3 px-1' : 'justify-between'}`}>

                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-900 to-purple-300 flex items-center justify-center shrink-0 shadow-lg" aria-hidden="true">
                                <span className="text-white font-bold text-sm">
                                    {usuario.username.charAt(0).toUpperCase()}
                                </span>
                            </div>

                            {!isCollapsed && (
                                <div className="flex flex-col truncate">
                                    <span className="text-sm text-yellow-300 font-bold uppercase truncate" title={usuario.username}>{usuario.username}</span>
                                    <span className="text-[10px] font-semibold tracking-wider text-emerald-400 truncate flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></div>
                                        {usuario.rol}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setMostrarConfirmacionLogout(true)}
                            className={`text-slate-400 hover:text-white hover:bg-red-500/90 rounded-lg transition-all shadow-sm hover:shadow-red-500/20 group shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-red-500
                                ${isCollapsed ? 'w-9 h-9 flex items-center justify-center' : 'p-2.5 ml-2'}`}
                            title="Cerrar Sesión"
                            aria-label="Cerrar Sesión"
                        >
                            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </aside>

            <ModalConfirmacion
                isOpen={mostrarConfirmacionLogout}
                onClose={() => setMostrarConfirmacionLogout(false)}
                onConfirm={() => {
                    setMostrarConfirmacionLogout(false);
                    logout();
                }}
                titulo="Cerrar Sesión"
                mensaje="¿Estás seguro de que deseas salir del sistema? Cualquier cambio no guardado podría perderse."
                textoConfirmar="Sí, salir"
                textoCancelar="Quiero quedarme"
                tipo="salir"
            />
        </>
    );
});

export default Sidebar;
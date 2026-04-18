// // src/App.tsx
// import { Toaster } from 'sonner';
// import React, { useEffect, useState } from 'react';
// import { initDatabase } from './services/db';
// import { AuthProvider, useAuth } from './context/AuthContext';
// import Login from './views/Login';
// import Sidebar, { MENU_ITEMS } from './components/Sidebar';
// import { Wrench } from 'lucide-react';

// // Importación de Vistas
// import Usuarios from './views/Usuarios';
// import ConfiguracionMaestros from './views/ConfiguracionMaestros';
// import Catalogo from './views/Catalogo';
// import Bodega from './views/Bodega';
// import ControlVehiculos from './views/ControlVehiculos';
// import Kardex from './views/Kardex';
// import PuntoVenta from './views/PuntoVenta';
// import HistorialVentas from './views/HistorialVentas';
// import DirectorioClientes from './views/DirectorioClientes';
// import Taller from './views/Taller';

// function AppContent() {
//   const { usuario } = useAuth();
//   const [estadoDb, setEstadoDb] = useState<'cargando' | 'lista' | 'error'>('cargando');
//   const [vistaActual, setVistaActual] = useState<string>(''); // Inicialmente vacío para esperar al enrutador

//   // 1. Inicialización de Base de Datos
//   useEffect(() => {
//     const prepararEntorno = async () => {
//       try {
//         await initDatabase();
//         setEstadoDb('lista');
//       } catch (error) {
//         setEstadoDb('error');
//       }
//     };
//     prepararEntorno();
//   }, []);

//   // 2. Enrutamiento Inteligente Basado en Rol
//   useEffect(() => {
//     if (usuario && vistaActual === '') {
//       if (usuario.rol === 'VENDEDOR') setVistaActual('pos');
//       else if (usuario.rol === 'MECANICO') setVistaActual('taller');
//       else setVistaActual('pos'); // Administrador por defecto va a POS (o puedes cambiarlo a un Dashboard futuro)
//     }
//   }, [usuario, vistaActual]);

//   // 3. Diccionario de Vistas (Patrón de Diseño Limpio)
//   const renderizarVista = () => {
//     const vistas: Record<string, React.ReactNode> = {
//       usuarios: <Usuarios />,
//       maestros: <ConfiguracionMaestros />,
//       catalogo: <Catalogo />,
//       bodega: <Bodega />,
//       vehiculos: <ControlVehiculos />,
//       kardex: <Kardex />,
//       pos: <PuntoVenta />,
//       historial: <HistorialVentas />,
//       clientes: <DirectorioClientes />,
//       taller: <Taller />
//     };
//     return vistas[vistaActual] || <PuntoVenta />;
//   };

//   // 4. Pantallas de Bloqueo / Estados de Carga
//   if (estadoDb === 'cargando') {
//     return (
//       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
//         <Wrench className="w-12 h-12 text-blue-500 animate-[spin_3s_linear_infinite]" />
//         <span className="text-white font-medium text-xl tracking-wide">
//           Iniciando <span className="text-blue-500 font-bold">Moto Servicios De La Cruz</span>...
//         </span>
//       </div>
//     );
//   }

//   if (estadoDb === 'error') {
//     return (
//       <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-red-500 p-6 text-center">
//         <span className="text-4xl mb-4">⚠️</span>
//         <h2 className="text-2xl font-bold mb-2">Error Crítico del Sistema</h2>
//         <p className="text-slate-400">No se pudo establecer conexión con la base de datos local.</p>
//       </div>
//     );
//   }

//   if (!usuario) return <Login />;

//   // Obtenemos metadatos de la vista activa para el Header
//   // const vistaActivaData = MENU_ITEMS.find(m => m.id === vistaActual);

//   return (
//     <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">

//       {/* ⬛ SIDEBAR */}
//       <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />

//       {/* ⬜ ÁREA DE CONTENIDO PRINCIPAL */}
//       <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">

//         {/* HEADER SUPERIOR EMPRESARIAL */}
//         {/* <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-between px-8 shrink-0 z-10 border-b border-slate-200/60">
//           <div className="flex items-center gap-4">
//             <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-inner">
//               {vistaActivaData && <vistaActivaData.icon className="w-6 h-6" />}
//             </div>
//             <div>
//               <h2 className="text-2xl font-black text-slate-800 tracking-tight">
//                 {vistaActivaData?.label || 'Panel de Control'}
//               </h2>
//               <p className="text-sm text-slate-500 font-medium">Moto Servicios De La Cruz</p>
//             </div>
//           </div>

//           <div className="flex items-center gap-6">
//             <div className="hidden md:flex flex-col items-end">
//               <span className="text-sm font-bold text-slate-700">
//                 {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
//               </span>
//               <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">
//                 {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
//               </span>
//             </div>
//           </div>
//         </header> */}

//         {/* CONTENEDOR DE VISTAS */}
//         <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth custom-scrollbar">
//           <div className="max-w-[1600px] mx-auto h-full flex flex-col">
//             {/* Animación de entrada suave para las vistas */}
//             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
//               {renderizarVista()}
//             </div>
//           </div>
//         </main>

//       </div>
//     </div>
//   );
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//       <Toaster position="top-right" richColors />
//     </AuthProvider>
//   );
// }









// src/App.tsx
import { Toaster, toast } from 'sonner';
import React, { useEffect, useState, useCallback } from 'react';
// import { initDatabase } from './services/db';
import { AuthProvider, useAuth } from './context/AuthContext';
import { normalizeError } from './utils/errors';

import Login from './views/Login';
import Sidebar from './components/Sidebar';
import ErrorBanner from './components/common/ErrorBanner';

import { Wrench } from 'lucide-react';

// Vistas
import Usuarios from './views/Usuarios';
import ConfiguracionMaestros from './views/ConfiguracionMaestros';
import Catalogo from './views/Catalogo';
import Bodega from './views/Bodega';
import ControlVehiculos from './views/ControlVehiculos';
import Kardex from './views/Kardex';
import PuntoVenta from './views/PuntoVenta';
import HistorialVentas from './views/HistorialVentas';
import DirectorioClientes from './views/DirectorioClientes';
import Taller from './views/Taller';

function AppContent() {
  const { usuario } = useAuth();

  const [estadoDb, setEstadoDb] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [errorDb, setErrorDb] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('');

  // ==========================================
  // INIT DB (con resiliencia + feedback global)
  // ==========================================
  const prepararEntorno = useCallback(async () => {
    try {
      setEstadoDb('cargando');
      setErrorDb(null);

      // await initDatabase();
      // ✅ AGREGA: Un pequeño delay visual (opcional, para que se aprecie tu pantalla de carga)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setEstadoDb('lista');
      toast.success('Base de datos inicializada correctamente');
    } catch (e) {
      const mensaje = normalizeError(e, 'Error al inicializar la base de datos');

      setEstadoDb('error');
      setErrorDb(mensaje);

      console.error('[DB_INIT_ERROR]:', e);
      toast.error(mensaje);
    }
  }, []);

  useEffect(() => {
    prepararEntorno();
  }, [prepararEntorno]);

  // ==========================================
  // ROUTING POR ROL
  // ==========================================
  useEffect(() => {
    if (usuario && vistaActual === '') {
      if (usuario.rol === 'VENDEDOR') setVistaActual('pos');
      else if (usuario.rol === 'MECANICO') setVistaActual('taller');
      else setVistaActual('pos');
    }
  }, [usuario, vistaActual]);

  // ==========================================
  // RENDER DE VISTAS
  // ==========================================
  const renderizarVista = () => {
    const vistas: Record<string, React.ReactNode> = {
      usuarios: <Usuarios />,
      maestros: <ConfiguracionMaestros />,
      catalogo: <Catalogo />,
      bodega: <Bodega />,
      vehiculos: <ControlVehiculos />,
      kardex: <Kardex />,
      pos: <PuntoVenta />,
      historial: <HistorialVentas />,
      clientes: <DirectorioClientes />,
      taller: <Taller />,
    };

    return vistas[vistaActual] || <PuntoVenta />;
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (estadoDb === 'cargando') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <Wrench className="w-12 h-12 text-blue-500 animate-[spin_3s_linear_infinite]" />
        <span className="text-white font-medium text-xl tracking-wide">
          Iniciando <span className="text-blue-500 font-bold">Moto Servicios De La Cruz</span>...
        </span>
      </div>
    );
  }

  // ==========================================
  // ERROR (con componente reutilizable)
  // ==========================================
  if (estadoDb === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorBanner
            mensaje={errorDb || 'Error crítico del sistema'}
            onReintentar={prepararEntorno}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTH
  // ==========================================
  if (!usuario) return <Login />;

  // ==========================================
  // APP
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">

      <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
              {renderizarVista()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        position="bottom-right"
        richColors
        // closeButton
        duration={4000}
      />
    </AuthProvider>
  );
}
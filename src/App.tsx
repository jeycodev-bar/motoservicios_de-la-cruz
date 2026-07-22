// App.tsx 
import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Toaster, toast } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { normalizeError } from './utils/errors';

import Login from './views/Login';
import Sidebar from './components/Sidebar';
import ErrorBanner from './components/common/ErrorBanner';
import { Wrench, Loader2 } from 'lucide-react';

// ==========================================
// CODE SPLITTING (Lazy Loading)
// ==========================================
// Solo se cargan en RAM cuando el usuario navega hacia ellas
const Usuarios = lazy(() => import('./views/Usuarios'));
const ConfiguracionMaestros = lazy(() => import('./views/ConfiguracionMaestros'));
const Catalogo = lazy(() => import('./views/Catalogo'));
const Bodega = lazy(() => import('./views/Bodega'));
const ControlVehiculos = lazy(() => import('./views/ControlVehiculos'));
const Kardex = lazy(() => import('./views/Kardex'));
const PuntoVenta = lazy(() => import('./views/PuntoVenta'));
const HistorialVentas = lazy(() => import('./views/HistorialVentas'));
const DirectorioClientes = lazy(() => import('./views/DirectorioClientes'));
const Taller = lazy(() => import('./views/Taller'));
const Dashboard = lazy(() => import('./views/Dashboard'));

// Componente ligero para feedback mientras se descarga/carga la vista
const SuspenseLoader = () => (
  <div className="flex-1 flex items-center justify-center h-full">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  </div>
);

function AppContent() {
  const { usuario } = useAuth();
  const [estadoDb, setEstadoDb] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [errorDb, setErrorDb] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('');

  // ==========================================
  // INIT DB
  // ==========================================
  const prepararEntorno = useCallback(async () => {
    try {
      setEstadoDb('cargando');
      setErrorDb(null);

      // Tiempo de inicio exacto
      const start = Date.now();

      // await initDatabase();

      // UX Optimizada: Solo esperamos si la BD cargó muy rápido (ej. menos de 500ms)
      // para evitar un parpadeo molesto, pero no penalizamos si ya tardó lo suyo.
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
      }

      setEstadoDb('lista');
      toast.success('Base de datos inicializada');
    } catch (e) {
      const mensaje = normalizeError(e, 'Error al inicializar la base de datos');
      setEstadoDb('error');
      setErrorDb(mensaje);
      console.error('[DB_INIT_ERROR]:', e);
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
      const vistaInicial = usuario.rol === 'MECANICO' ? 'taller' : 'pos';
      setVistaActual(vistaInicial);
    }
  }, [usuario, vistaActual]);

  // ==========================================
  // RENDER DE VISTAS (Optimizado O(1))
  // ==========================================
  // Ya no instanciamos TODOS los componentes. Solo retornamos el JSX que necesitamos.
  const renderizarVista = () => {
    switch (vistaActual) {
      case 'usuarios': return <Usuarios />;
      case 'maestros': return <ConfiguracionMaestros />;
      case 'catalogo': return <Catalogo />;
      case 'bodega': return <Bodega />;
      case 'vehiculos': return <ControlVehiculos />;
      case 'kardex': return <Kardex />;
      case 'pos': return <PuntoVenta />;
      case 'historial': return <HistorialVentas />;
      case 'clientes': return <DirectorioClientes />;
      case 'taller': return <Taller />;
      case 'dashboard': return <Dashboard />;
      default: return <Dashboard />;
    }
  };

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

  if (estadoDb === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorBanner mensaje={errorDb || 'Error crítico del sistema'} onReintentar={prepararEntorno} />
        </div>
      </div>
    );
  }

  if (!usuario) return <Login />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <Sidebar vistaActual={vistaActual} setVistaActual={setVistaActual} />

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-200">
        {/* <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg-root)]"> */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth custom-scrollbar">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
              {/* Suspense es obligatorio al usar React.lazy */}
              <Suspense fallback={<SuspenseLoader />}>
                {renderizarVista()}
              </Suspense>
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
      <Toaster position="top-right" richColors duration={4000} />
    </AuthProvider>
  );
}
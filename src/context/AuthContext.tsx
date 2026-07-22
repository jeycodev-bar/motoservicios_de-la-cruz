// src/context/AuthContext.tsx
import { createContext, useState, useContext, ReactNode, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { AuthService } from '../services/auth';
import { Usuario } from '../types/database';

interface AuthContextType {
    usuario: Usuario | null;
    login: (username: string, passwordPlana: string) => Promise<void>;
    logout: () => void;
    cargando: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Iniciamos sin usuario. Al cerrar la app de escritorio, la sesión se pierde 
    // (práctica recomendada para sistemas POS/Cajas por seguridad).
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [cargando, setCargando] = useState<boolean>(false);

    // useCallback garantiza que la función tenga la misma firma en memoria
    // a menos que cambien sus dependencias (en este caso, ninguna).
    const login = useCallback(async (username: string, passwordPlana: string) => {
        setCargando(true);
        try {
            const user = await AuthService.login(username, passwordPlana);
            setUsuario(user);
        } catch (error) {
            // El error se lanza para que la vista lo atrape y muestre el Toast/Aviso,
            // pero delegamos el setCargando(false) al bloque finally.
            throw error;
        } finally {
            // finally siempre se ejecuta, falle o tenga éxito la promesa.
            setCargando(false);
        }
    }, []);

    // const logout = useCallback(() => {
    //     setUsuario(null);
    //     // Si más adelante usas sessionStorage o localStorage, 
    //     // aquí deberías llamar a un AuthService.limpiarSesion()
    // }, []);
    // ✅ LOGOUT OPTIMIZADO
    const logout = useCallback(() => {
        // 1. Limpieza de estado en memoria
        setUsuario(null);

        // 2. Limpieza de persistencia local (Preparado para el futuro)
        // Si en el futuro decides guardar el estado en localStorage para no perder 
        // la sesión al refrescar (F5), aquí es donde debes destruirlo:
        // localStorage.removeItem('user_session');

        // 3. Feedback visual (Toast)
        // Usamos toast.info en lugar de success porque es una acción neutral de salida.
        toast.info('Sesión cerrada', {
            description: 'Has salido del sistema de forma segura.'
        });

        // NOTA ARQUITECTÓNICA: Si más adelante implementas una librería de caché global 
        // como React Query (TanStack Query) o SWR, aquí DEBES llamar a:
        // queryClient.clear() 
        // Para evitar que el próximo usuario que inicie sesión vea datos cacheados del usuario anterior.
    }, []);

    // useMemo es CRÍTICO aquí. Previene que todos los componentes que consumen 
    // este contexto se re-rendericen si el componente padre de AuthProvider se actualiza,
    // a menos que el estado de 'usuario' o 'cargando' cambien realmente.
    const contextValue = useMemo(() => ({
        usuario,
        login,
        logout,
        cargando
    }), [usuario, login, logout, cargando]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};
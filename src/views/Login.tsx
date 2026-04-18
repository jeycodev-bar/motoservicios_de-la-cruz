// import React, { useState } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { Lock, User, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

// export default function Login() {
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [error, setError] = useState('');

//     // Nuestro estado React (100% predecible)
//     const [showPassword, setShowPassword] = useState(false);

//     const { login, cargando } = useAuth();

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setError('');

//         if (!username || !password) {
//             setError('Por favor, ingresa tu usuario y contraseña.');
//             return;
//         }

//         try {
//             await login(username, password);
//         } catch (err: any) {
//             setError('Credenciales incorrectas o usuario inactivo.');
//         }
//     };
//     // <div className="max-w-[420px] w-full bg-slate-900/80 backdrop-blur-x3 rounded-[2rem] shadow-2xl p-8 sm:p-10 border border-slate-700/50 relative overflow-hidden">

//     return (
//         <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">

//             <div className="max-w-[420px] w-full bg-deep-core backdrop-blur-x3 rounded-[2rem] shadow-2xl p-8 sm:p-10 border border-slate-700/50 relative overflow-hidden">

//                 {/*Logo del Sistema (Ubicado en /public/logo.png) */}
//                 <div className="text-center mb-6">
//                     <img
//                         src="/logo_fit.png"
//                         alt="Moto Servicios De La Cruz Logo"
//                         className="w-64 h-64 object-contain mx-auto mb-2 drop-shadow-xl"
//                         onError={(e) => {
//                             // Oculta la imagen rota si no encuentra el archivo
//                             (e.target as HTMLImageElement).style.display = 'none';
//                         }}
//                     />
//                     {/* <h1 className="text-3xl font-black text-white tracking-tight mb-2">
//                         MotoSystem <span className="text-blue-500">De La Cruz</span>
//                     </h1> */}
//                     <p className="text-yellow-200 text-sm font-medium">Ingrese sus credenciales para iniciar sesión.</p>
//                 </div>

//                 {error && (
//                     <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400 animate-in shake duration-300">
//                         <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
//                         <p className="text-sm font-medium leading-relaxed">{error}</p>
//                     </div>
//                 )}

//                 <form onSubmit={handleSubmit} className="space-y-5 relative z-10">

//                     {/* Input: Usuario */}
//                     <div className="space-y-2">
//                         <label htmlFor="username" className="text-sm font-semibold text-slate-300 ml-1">
//                             Usuario
//                         </label>
//                         <div className="relative group">
//                             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
//                                 <User className="h-5 w-5" />
//                             </div>
//                             <input
//                                 id="username"
//                                 type="text"
//                                 value={username}
//                                 onChange={(e) => setUsername(e.target.value)}
//                                 disabled={cargando}
//                                 className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                                 placeholder="Ingrese su usuario"
//                                 autoFocus
//                             />
//                         </div>
//                     </div>

//                     {/* Input: Contraseña */}
//                     <div className="space-y-2">
//                         <label htmlFor="password" className="text-sm font-semibold text-slate-300 ml-1">
//                             Contraseña
//                         </label>
//                         <div className="relative group">
//                             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
//                                 <Lock className="h-5 w-5" />
//                             </div>

//                             <input
//                                 id="password"
//                                 type={showPassword ? 'text' : 'password'}
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 disabled={cargando}
//                                 /* ✨ MAGIA APLICADA: 
//                                    [&::-ms-reveal]:hidden oculta el ojo nativo de Edge/Windows
//                                    [&::-ms-clear]:hidden oculta la 'X' de limpiar texto nativa
//                                    [&::-webkit-contacts-auto-fill-button]:hidden evita iconos raros en Chrome/WebKit
//                                 */
//                                 className="block w-full pl-11 pr-12 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-contacts-auto-fill-button]:hidden"
//                                 placeholder="Ingrese su contraseña"
//                             />

//                             {/* Nuestro botón personalizado */}
//                             <button
//                                 type="button"
//                                 onClick={() => setShowPassword(!showPassword)}
//                                 disabled={cargando}
//                                 className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-400 transition-colors focus:outline-none disabled:opacity-50"
//                                 title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
//                             >
//                                 {showPassword ? (
//                                     <EyeOff className="h-5 w-5 animate-in zoom-in duration-200" />
//                                 ) : (
//                                     <Eye className="h-5 w-5 animate-in zoom-in duration-200" />
//                                 )}
//                             </button>
//                         </div>
//                     </div>

//                     <button
//                         type="submit"
//                         disabled={cargando}
//                         className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-8"
//                     >
//                         <span className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-blue-400 to-blue-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></span>
//                         <div className="relative flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
//                             {cargando ? (
//                                 <>
//                                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                                     <span>Verificando credenciales...</span>
//                                 </>
//                             ) : (
//                                 <span>Entrar al Sistema</span>
//                             )}
//                         </div>
//                     </button>
//                 </form>
//             </div>

//             <div className="fixed bottom-6 text-slate-500 text-xs font-medium tracking-wide">
//                 &copy; {new Date().getFullYear()} Powered by <span className="text-green-300">Jacobs</span>. Todos los derechos reservados.
//             </div>
//         </div>
//     );
// }







// src/views/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { normalizeError } from '../utils/errors'; // Utilidad de normalización
import { Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const { login, cargando } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.warning('Validación requerida', {
                description: 'Por favor, ingresa tu usuario y contraseña.'
            });
            return;
        }

        try {
            await login(username, password);
            toast.success('Acceso autorizado', {
                description: 'Iniciando sesión en el sistema...'
            });
        } catch (err: unknown) {
            // Delegamos el mensaje exacto a nuestra capa de normalización de errores
            const mensajeError = normalizeError(err, 'Credenciales incorrectas o usuario inactivo.');
            toast.error('Error de Autenticación', {
                description: mensajeError
            });
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
            <div className="max-w-[420px] w-full bg-deep-core backdrop-blur-x3 rounded-[2rem] shadow-2xl p-8 sm:p-10 border border-slate-700/50 relative overflow-hidden">

                {/* Logo del Sistema */}
                <div className="text-center mb-8">
                    <img
                        src="/logo_fit.png"
                        alt="Moto Servicios De La Cruz Logo"
                        className="w-64 h-64 object-contain mx-auto mb-2 drop-shadow-xl"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <p className="text-yellow-200 text-sm font-medium">
                        Ingrese sus credenciales para iniciar sesión.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">

                    {/* Input: Usuario */}
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-semibold text-slate-300 ml-1">
                            Usuario
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
                                <User className="h-5 w-5" />
                            </div>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={cargando}
                                autoComplete="username"
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Ingrese su usuario"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Input: Contraseña */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-semibold text-slate-300 ml-1">
                            Contraseña
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-slate-500">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={cargando}
                                autoComplete="current-password"
                                className="block w-full pl-11 pr-12 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-contacts-auto-fill-button]:hidden"
                                placeholder="Ingrese su contraseña"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={cargando}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-blue-400 transition-colors focus:outline-none disabled:opacity-50"
                                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 animate-in zoom-in duration-200" />
                                ) : (
                                    <Eye className="h-5 w-5 animate-in zoom-in duration-200" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={cargando}
                        className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-8"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-blue-400 to-blue-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></span>
                        <div className="relative flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                            {cargando ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    <span>Verificando credenciales...</span>
                                </>
                            ) : (
                                <span>Entrar al Sistema</span>
                            )}
                        </div>
                    </button>
                </form>
            </div>

            <div className="fixed bottom-6 text-slate-500 text-xs font-medium tracking-wide">
                &copy; {new Date().getFullYear()} Powered by <span className="text-green-300">Jacobs</span>. Todos los derechos reservados.
            </div>
        </div>
    );
}
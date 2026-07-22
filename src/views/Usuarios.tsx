// src/views/Usuarios.tsx
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { toast } from 'sonner';
import { AuthService } from '../services/auth';
import { Usuario, RolUsuario } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { normalizeError } from '../utils/errors';
import {
    UserPlus, ShieldAlert, ShieldUser, Edit,
    Power, PowerOff, X, UserPen, KeyRound, Lock
} from 'lucide-react';

// ==========================================
// CONSTANTES Y DICCIONARIOS
// ==========================================
const ROLES_PERMITIDOS: RolUsuario[] = ['VENDEDOR', 'MECANICO', 'ADMINISTRADOR'];

const ESTADO_USUARIO = {
    INACTIVO: 0,
    ACTIVO: 1
} as const;

const INITIAL_FORM_STATE = {
    id: '', dni: '', nombre_completo: '', username: '',
    rol: 'VENDEDOR' as RolUsuario, password: '', nuevaPassword: ''
};

// ==========================================
// COMPONENTES PUROS (Vista)
// ==========================================
const FilaUsuario = memo(({
    u, onEdit, onToggleEstado
}: {
    u: Usuario;
    onEdit: (u: Usuario) => void;
    onToggleEstado: (id: string, estado: number) => void;
}) => {
    const esActivo = u.estado === ESTADO_USUARIO.ACTIVO;

    return (
        <tr className={`hover:bg-slate-50 transition-colors ${!esActivo ? 'bg-slate-50/50 opacity-75' : ''}`}>
            <td className="px-6 py-4">
                <div className="font-semibold text-slate-800">{u.nombre_completo}</div>
                <div className="text-xs text-slate-500">DNI: {u.dni}</div>
            </td>
            <td className="px-6 py-4">
                <div className="text-slate-800 font-medium">@{u.username}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md
                    ${u.rol === 'ADMINISTRADOR' ? 'bg-purple-100 text-purple-700' : ''}
                    ${u.rol === 'VENDEDOR' ? 'bg-blue-100 text-blue-700' : ''}
                    ${u.rol === 'MECANICO' ? 'bg-orange-100 text-orange-700' : ''}
                `}>
                    {u.rol}
                </span>
            </td>
            <td className="px-6 py-4">
                {esActivo
                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true"></div> Activo</span>
                    : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-200"><div className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true"></div> Inactivo</span>
                }
            </td>
            <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none"
                        title="Editar Datos"
                        aria-label={`Editar usuario ${u.nombre_completo}`}
                    >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => onToggleEstado(u.id, u.estado)}
                        className={`p-1.5 rounded-lg transition-colors outline-none ${esActivo ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        title={esActivo ? "Desactivar Acceso" : "Reactivar Acceso"}
                        aria-label={esActivo ? `Desactivar usuario ${u.nombre_completo}` : `Reactivar usuario ${u.nombre_completo}`}
                    >
                        {esActivo ? <PowerOff className="w-4 h-4" aria-hidden="true" /> : <Power className="w-4 h-4" aria-hidden="true" />}
                    </button>
                </div>
            </td>
        </tr>
    );
});
FilaUsuario.displayName = 'FilaUsuario';

// ==========================================
// CUSTOM HOOK (Lógica de Negocio / Controlador)
// ==========================================
function useUsuariosLogic() {
    const { usuario: adminActivo } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [cargando, setCargando] = useState(false);
    const [sudo, setSudo] = useState({ show: false, password: '', error: '' });

    const modoEdicion = useMemo(() => Boolean(formData.id), [formData.id]);

    const manejarErrores = useCallback((err: unknown, esSudo: boolean = false) => {
        const mensajeError = normalizeError(err, 'Ocurrió un error al procesar la solicitud.');
        if (mensajeError === 'USUARIO_O_DNI_EXISTENTE') {
            toast.warning('El Nombre de Usuario o DNI ya está registrado en el sistema.');
            setSudo(prev => ({ ...prev, show: false }));
        } else if (mensajeError === 'PASSWORD_ADMIN_INCORRECTA') {
            setSudo(prev => ({ ...prev, error: 'Tu contraseña de administrador es incorrecta.', password: '' }));
        } else {
            toast.error(mensajeError);
            if (!esSudo) setSudo(prev => ({ ...prev, show: false }));
        }
    }, []);

    const cargarUsuarios = useCallback(async (signal?: AbortSignal) => {
        try {
            const data = await AuthService.obtenerUsuarios();

            // Si el componente se desmontó, cancelamos la actualización del estado
            if (signal?.aborted) return;

            setUsuarios(data);
        } catch (err) {
            if (signal?.aborted) return;
            toast.error(normalizeError(err, "Error al cargar la lista de usuarios"));
        }
    }, []);

    useEffect(() => {
        // 1. Instanciamos el controlador nativo
        const abortController = new AbortController();

        // 2. Pasamos la señal a nuestra función
        cargarUsuarios(abortController.signal);

        // 3. Cleanup function: React ejecuta esto al desmontar el componente
        return () => {
            abortController.abort();
        };
    }, [cargarUsuarios]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && sudo.show) {
                setSudo({ show: false, password: '', error: '' });
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [sudo.show]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const resetForm = useCallback(() => {
        setFormData(INITIAL_FORM_STATE);
        setCargando(false);
        setSudo({ show: false, password: '', error: '' });
    }, []);

    const ejecutarActualizacionAdmin = useCallback(async () => {
        if (!adminActivo) return;
        if (!sudo.password) return setSudo(prev => ({ ...prev, error: 'Debes ingresar tu contraseña.' }));

        setCargando(true);
        try {
            await AuthService.actualizarUsuarioPorAdmin({
                id: formData.id, dni: formData.dni, nombre_completo: formData.nombre_completo,
                username: formData.username, rol: formData.rol, admin_id: adminActivo.id,
                admin_password_sudo: sudo.password, nueva_password: formData.nuevaPassword || undefined
            });
            toast.success(`Usuario ${formData.nombre_completo} actualizado correctamente.`);
            resetForm();
            cargarUsuarios();
        } catch (err) {
            manejarErrores(err, true);
        } finally {
            setCargando(false);
        }
    }, [adminActivo, sudo.password, formData, cargarUsuarios, resetForm, manejarErrores]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminActivo) return;

        if (modoEdicion) {
            if (formData.nuevaPassword && formData.nuevaPassword.length < 6) {
                return toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
            }
            setSudo({ show: true, password: '', error: '' });
        } else {
            if (formData.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres.');

            setCargando(true);
            try {
                await AuthService.crearUsuario({
                    dni: formData.dni, nombre_completo: formData.nombre_completo, username: formData.username,
                    password_plana: formData.password, rol: formData.rol, admin_id: adminActivo.id
                });
                toast.success(`Usuario ${formData.nombre_completo} creado exitosamente.`);
                resetForm();
                cargarUsuarios();
            } catch (err) {
                manejarErrores(err);
            } finally {
                setCargando(false);
            }
        }
    }, [adminActivo, modoEdicion, formData, cargarUsuarios, resetForm, manejarErrores]);

    const handleEdit = useCallback((user: Usuario) => {
        setFormData({
            id: user.id, dni: user.dni, nombre_completo: user.nombre_completo,
            username: user.username, rol: user.rol, password: '', nuevaPassword: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleToggleEstado = useCallback(async (id: string, estadoActual: number) => {
        if (!adminActivo) return;
        if (id === adminActivo.id) return toast.error('No puedes desactivar tu propia cuenta activa.');

        try {
            const nuevoEstado = estadoActual === ESTADO_USUARIO.ACTIVO ? ESTADO_USUARIO.INACTIVO : ESTADO_USUARIO.ACTIVO;
            await AuthService.cambiarEstadoUsuario(id, nuevoEstado, adminActivo.id);
            toast.success('Estado del usuario actualizado.');
            cargarUsuarios();
        } catch (err) {
            manejarErrores(err);
        }
    }, [adminActivo, cargarUsuarios, manejarErrores]);

    return {
        usuarios, formData, cargando, sudo, modoEdicion,
        setSudo, handleInputChange, resetForm, handleSubmit,
        ejecutarActualizacionAdmin, handleEdit, handleToggleEstado
    };
}

// ==========================================
// COMPONENTE PRINCIPAL (Solo Presentación)
// ==========================================
export default function Usuarios() {
    const {
        usuarios, formData, cargando, sudo, modoEdicion,
        setSudo, handleInputChange, resetForm, handleSubmit,
        ejecutarActualizacionAdmin, handleEdit, handleToggleEstado
    } = useUsuariosLogic();

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative">

            {/* MODAL SUDO */}
            {sudo.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-purple-600 p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2 font-semibold">
                                <Lock className="w-5 h-5" aria-hidden="true" />
                                <span>Autorización Requerida</span>
                            </div>
                            <button onClick={() => setSudo({ show: false, password: '', error: '' })} className="text-purple-200 hover:text-white transition-colors outline-none">
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                Estás a punto de modificar los datos de <strong>{formData.nombre_completo}</strong>. Ingresa <span className="font-semibold text-purple-700">tu contraseña de Administrador</span>.
                            </p>
                            {sudo.error && (
                                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex gap-2">
                                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" /> {sudo.error}
                                </div>
                            )}
                            <input
                                type="password" autoFocus value={sudo.password}
                                onChange={(e) => setSudo(prev => ({ ...prev, password: e.target.value, error: '' }))}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Contraseña de Administrador"
                                onKeyDown={(e) => e.key === 'Enter' && ejecutarActualizacionAdmin()}
                            />
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setSudo({ show: false, password: '', error: '' })} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors outline-none" disabled={cargando}>
                                    Cancelar
                                </button>
                                <button onClick={ejecutarActualizacionAdmin} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors outline-none disabled:opacity-50" disabled={cargando || !sudo.password}>
                                    {cargando ? 'Verificando...' : 'Confirmar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FORMULARIO */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 xl:col-span-1 h-fit relative">
                {modoEdicion && (
                    <button onClick={resetForm} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors outline-none" title="Cancelar Edición">
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                )}
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                    {modoEdicion ? <UserPen className="w-6 h-6 text-purple-600" aria-hidden="true" /> : <UserPlus className="w-6 h-6 text-blue-600" aria-hidden="true" />}
                    <h3 className="text-lg font-bold text-slate-800">{modoEdicion ? 'Editar Usuario' : 'Registrar Personal'}</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label htmlFor="nombre_completo" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                            <input id="nombre_completo" type="text" name="nombre_completo" required value={formData.nombre_completo} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label htmlFor="dni" className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                            <input id="dni" type="text" name="dni" required maxLength={15} value={formData.dni} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Usuario (Login)</label>
                            <input id="username" type="text" name="username" required value={formData.username} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="rol" className="block text-sm font-medium text-slate-700 mb-1">Rol en el Sistema</label>
                        <select id="rol" name="rol" value={formData.rol} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            {ROLES_PERMITIDOS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {!modoEdicion ? (
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña Inicial</label>
                            <input id="password" type="password" name="password" required minLength={6} value={formData.password} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mt-4 space-y-3">
                            <div className="flex items-center gap-2 mb-2 text-slate-600 font-medium text-sm">
                                <KeyRound className="w-4 h-4" aria-hidden="true" />
                                <label htmlFor="nuevaPassword">Cambiar Contraseña (Opcional)</label>
                            </div>
                            <input id="nuevaPassword" type="password" name="nuevaPassword" minLength={6} value={formData.nuevaPassword} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none text-sm" placeholder="Dejar en blanco para mantener la actual" />
                        </div>
                    )}

                    <button type="submit" disabled={cargando} className={`w-full font-medium py-2.5 rounded-lg transition-colors outline-none disabled:opacity-50 mt-4 text-white ${modoEdicion ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {cargando && !sudo.show ? 'Procesando...' : (modoEdicion ? 'Guardar Cambios' : 'Registrar Usuario')}
                    </button>
                </form>
            </div>

            {/* TABLA DE USUARIOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 xl:col-span-2 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
                <div className="p-6 border-b border-slate-500 bg-slate-500/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldUser className="w-6 h-6 text-blue-600" aria-hidden="true" />
                        <h3 className="text-lg font-bold text-slate-800">Directorio de Personal</h3>
                    </div>
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">{usuarios.length} registros</span>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-primary text-cyan-400 font-medium border-b border-primary sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-3">Personal</th>
                                <th scope="col" className="px-6 py-3">Credenciales</th>
                                <th scope="col" className="px-6 py-3">Estado</th>
                                <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usuarios.map((u) => (
                                <FilaUsuario key={u.id} u={u} onEdit={handleEdit} onToggleEstado={handleToggleEstado} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
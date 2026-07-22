// src/services/auth.ts
import { Usuario, RolUsuario } from '../types/database';
import { invoke } from '@tauri-apps/api/core';

// ==========================================
// INTERFACES Y DTOs (Data Transfer Objects)
// ==========================================

interface UsuarioSesion {
    id: string;
    dni: string;
    nombre_completo: string;
    username: string;
    rol: string;
}

export interface CrearUsuarioDTO {
    dni: string;
    nombre_completo: string;
    username: string;
    password_plana: string;
    rol: RolUsuario;
    admin_id: string;
}

export interface ActualizarUsuarioDTO {
    id: string;
    dni: string;
    nombre_completo: string;
    username: string;
    rol: RolUsuario;
    admin_id: string;
    password_actual?: string;
    nueva_password?: string;
}

export interface ActualizarAdminSudoDTO {
    id: string;
    dni: string;
    nombre_completo: string;
    username: string;
    rol: RolUsuario; // Tipado estricto corregido
    admin_id: string;
    admin_password_sudo: string;
    nueva_password?: string;
}

// ==========================================
// SERVICIO DE AUTENTICACIÓN
// ==========================================

export const AuthService = {
    // ✅ Login end-to-end en Rust
    login: async (username: string, password_plana: string): Promise<Usuario> => {
        const sesion = await invoke<UsuarioSesion>('login_seguro', {
            username,
            passwordPlana: password_plana,
        });

        return {
            id: sesion.id,
            dni: sesion.dni,
            nombre_completo: sesion.nombre_completo,
            username: sesion.username,
            rol: sesion.rol as RolUsuario,
            estado: 1,
        };
    },

    // ✅ Totalmente migrado a Rust. Adiós acceso directo.
    obtenerUsuarios: async (): Promise<Usuario[]> => {
        try {
            return await invoke<Usuario[]>('obtener_usuarios_seguro');
        } catch (e: unknown) {
            console.error('Error al obtener usuarios:', e);
            throw e;
        }
    },

    // 🔒 Delegado a Rust usando DTO
    crearUsuario: async (dto: CrearUsuarioDTO): Promise<void> => {
        await invoke('crear_usuario_seguro', {
            dni: dto.dni,
            nombreCompleto: dto.nombre_completo,
            username: dto.username,
            password: dto.password_plana,
            rol: dto.rol,
            adminId: dto.admin_id,
        });
    },

    // 🔒 Delegado a Rust usando DTO
    actualizarUsuario: async (dto: ActualizarUsuarioDTO): Promise<void> => {
        if (dto.nueva_password?.trim() && !dto.password_actual) {
            throw new Error('PASSWORD_ACTUAL_REQUERIDA');
        }

        await invoke('actualizar_usuario_seguro', {
            id: dto.id,
            dni: dto.dni,
            nombreCompleto: dto.nombre_completo,
            username: dto.username,
            rol: dto.rol,
            adminId: dto.admin_id,
            passwordActual: dto.password_actual?.trim() || null,
            nuevaPassword: dto.nueva_password?.trim() || null,
        });
    },

    // 🔒 Delegado a Rust (Modo Sudo Admin) usando DTO
    actualizarUsuarioPorAdmin: async (dto: ActualizarAdminSudoDTO): Promise<void> => {
        await invoke('actualizar_usuario_por_admin', {
            id: dto.id,
            dni: dto.dni,
            nombreCompleto: dto.nombre_completo,
            username: dto.username,
            rol: dto.rol,
            adminId: dto.admin_id,
            adminPasswordSudo: dto.admin_password_sudo,
            nuevaPassword: dto.nueva_password?.trim() || null,
        });
    },

    // 🔒 Delegado a Rust
    cambiarEstadoUsuario: async (
        id: string,
        nuevoEstado: number,
        adminId: string
    ): Promise<void> => {
        await invoke('cambiar_estado_usuario_seguro', {
            id,
            nuevoEstado,
            adminId,
        });
    },
};
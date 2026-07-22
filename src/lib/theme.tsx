// src/lib/theme.tsx
// =============================================================================
// Sistema de temas — Claro / Oscuro
// =============================================================================
//
// DISEÑO:
//   - CSS custom properties en :root para todos los tokens visuales.
//   - El tema se aplica añadiendo/quitando el atributo data-theme="light"
//     en <html>. El modo oscuro es el default (sin atributo).
//   - ThemeProvider inicializa desde localStorage y sincroniza.
//   - useTheme() expone el estado y el toggle desde cualquier componente.
//   - Sin dependencias externas (ni zustand, ni context pesado).
//
// PALETA:
//   Oscuro  → #0d0f14 fondo / #13151c cards / tokens existentes del dashboard
//   Claro   → #f1f5f9 fondo (slate-100) / #ffffff cards / inversión de tokens
//             Compatible con bg-slate-200 de App.tsx en ambos bordes.
// =============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
}

// =============================================================================
// CONTEXTO
// =============================================================================

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => { },
    isDark: true,
});

// =============================================================================
// CSS VARIABLES — inyectadas en <head> una sola vez
// =============================================================================

const CSS_VARIABLES = `
:root {
    /* ── Modo oscuro (default) ────────────────────────────────────────────── */
    --bg-root:          #0d0f14;
    --bg-card:          #13151c;
    --bg-inner:         #1a1d27;
    --bg-hover:         #22263a;
    --bg-subtle:        rgba(255,255,255,0.025);

    --border-card:      rgba(255,255,255,0.07);
    --border-hover:     rgba(255,255,255,0.14);
    --border-subtle:    rgba(255,255,255,0.05);

    --text-primary:     #eef0f6;
    --text-secondary:   #8a8fa8;
    --text-tertiary:    #565b73;
    --text-muted:       #3a3f52;

    --accent-blue:      #00b4d8;
    --accent-green:     #06d6a0;
    --accent-yellow:    #ffd166;
    --accent-red:       #e94560;
    --accent-orange:    #fb923c;

    --shadow-card:      0 4px 24px rgba(0,0,0,0.4);
    --shadow-popover:   0 8px 40px rgba(0,0,0,0.6);

    /* Chart.js defaults sincronizados */
    --chart-grid:       rgba(255,255,255,0.06);
    --chart-border:     rgba(255,255,255,0.07);
    --chart-tick:       #565b73;
}

[data-theme="light"] {
    /* ── Modo claro ───────────────────────────────────────────────────────── */
    --bg-root:          #f1f5f9;
    --bg-card:          #ffffff;
    --bg-inner:         #f8fafc;
    --bg-hover:         #f1f5f9;
    --bg-subtle:        rgba(0,0,0,0.025);

    --border-card:      rgba(0,0,0,0.08);
    --border-hover:     rgba(0,0,0,0.16);
    --border-subtle:    rgba(0,0,0,0.05);

    --text-primary:     #0f172a;
    --text-secondary:   #475569;
    --text-tertiary:    #94a3b8;
    --text-muted:       #cbd5e1;

    --accent-blue:      #0284c7;
    --accent-green:     #059669;
    --accent-yellow:    #d97706;
    --accent-red:       #dc2626;
    --accent-orange:    #ea580c;

    --shadow-card:      0 1px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04);
    --shadow-popover:   0 8px 32px rgba(0,0,0,0.16);

    --chart-grid:       rgba(0,0,0,0.06);
    --chart-border:     rgba(0,0,0,0.08);
    --chart-tick:       #94a3b8;
}

/* ── Transición suave al cambiar tema ─────────────────────────────────────── */
*, *::before, *::after {
    transition:
        background-color 180ms ease,
        border-color     180ms ease,
        color            120ms ease,
        box-shadow       180ms ease;
}

/* Excluir elementos donde la transición causa parpadeo */
canvas, svg, img, video {
    transition: none !important;
}
`;

// =============================================================================
// INYECTOR DE ESTILOS — ejecutado una sola vez
// =============================================================================

let stylesInjected = false;
function injectThemeStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'theme-variables';
    style.textContent = CSS_VARIABLES;
    document.head.appendChild(style);
}

// =============================================================================
// PROVIDER
// =============================================================================

interface ThemeProviderProps {
    children: React.ReactNode;
    /** Tema inicial si no hay preferencia guardada (default: 'dark') */
    defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        injectThemeStyles();

        // 1. Preferencia guardada por el usuario
        const saved = localStorage.getItem('dashboard-theme') as Theme | null;
        if (saved === 'dark' || saved === 'light') return saved;

        // 2. Preferencia del sistema operativo
        if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';

        // 3. Default de la aplicación
        return defaultTheme;
    });

    // Sincronizar data-theme en <html> y localStorage
    useEffect(() => {
        const html = document.documentElement;
        if (theme === 'light') {
            html.setAttribute('data-theme', 'light');
        } else {
            html.removeAttribute('data-theme');
        }
        localStorage.setItem('dashboard-theme', theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

// =============================================================================
// HOOK
// =============================================================================

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

// =============================================================================
// BOTÓN DE TOGGLE — reutilizable
// =============================================================================

interface ThemeToggleButtonProps {
    className?: string;
    size?: 'sm' | 'md';
}

export function ThemeToggleButton({ className = '', size = 'md' }: ThemeToggleButtonProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const sizeClasses = size === 'sm'
        ? 'w-7 h-7 text-[11px]'
        : 'w-8 h-8 text-xs';

    return (
        <button
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
            className={`
                ${sizeClasses}
                flex items-center justify-center rounded-lg
                border transition-colors duration-150
                ${isDark
                    ? 'bg-[var(--bg-inner)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                    : 'bg-[var(--bg-inner)] border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
                }
                ${className}
            `}
        >
            {isDark ? (
                <Sun
                    size={16}
                    className="transition-transform duration-200"
                />
            ) : (
                <Moon
                    size={16}
                    className="transition-transform duration-200"
                />
            )}
        </button>
    );
}
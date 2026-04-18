/**
 * components/common/index.ts
 *
 * Barrel de exportaciones de los componentes UI compartidos.
 *
 * Estos componentes son agnósticos al dominio — no importan tipos de negocio
 * ni servicios. Son bloques visuales puros configurables por props.
 *
 * Uso en cualquier vista o modal:
 *   import { BuscadorInput, PaginacionTabla, ErrorBanner } from '@/components/ui';
 */

export { default as BuscadorInput   } from './BuscadorInput';
export { default as PaginacionTabla } from './PaginacionTabla';
export { default as ErrorBanner     } from './ErrorBanner';
// src/hooks/useRecargarStock.ts
import { useState } from 'react';
import { toast } from 'sonner';
import { InventarioService } from '../services/inventario_service';
import { normalizeError } from '../utils/errors';

export function useRecargarStock() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ejecutar = async (
        loteId: string,
        cantidad: number,
        usuarioId: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            await InventarioService.recargarStockExistente(
                loteId,
                cantidad,
                usuarioId
            );

            toast.success(`Stock actualizado: +${cantidad} unidades`);
            return true;

        } catch (e: unknown) {
            const msg = normalizeError(e, 'Error al actualizar stock');

            setError(msg);
            toast.error(msg);

            return false;
        } finally {
            setLoading(false);
        }
    };

    return { ejecutar, loading, error, setError };
}
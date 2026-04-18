// src/components/CarritoVentas.tsx
import React, { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, Search, X, Trash2, CheckCircle } from 'lucide-react';

// ✅Tipos desde ../types — ItemCarrito y ClienteVenta son los canónicos
import type { ItemCarrito, ClienteVenta } from '../types';
import ModalConfirmacion from '../modales/ModalConfirmacion';

// ==========================================
// COMPONENTE: Fila del Carrito (MEMORIZADO)
// Renombrado de ItemCarrito → FilaCarrito para evitar colisión con el tipo importado
// ==========================================

const FilaCarrito = memo(({
    item,
    index,
    onActualizarCantidad,
    onEliminarItem,
}: {
    item: ItemCarrito;
    index: number;
    onActualizarCantidad: (idx: number, valorStr: string) => void;
    onEliminarItem: (idx: number) => void;
}) => {
    const subtotalLinea = Number(item.precio) * (item.cantidad || 0);

    return (
        <div className="py-3 group">
            <div className="flex justify-between items-start mb-1 group/eliminar">
                <p className="font-bold text-slate-700 text-sm w-5/6 leading-tight transition-all duration-200 group-hover/eliminar:text-red-500 group-hover/eliminar:line-through cursor-default">
                    {item.producto_nombre}
                </p>
                <button
                    type="button"
                    onClick={() => onEliminarItem(index)}
                    className="text-slate-300 group-hover/eliminar:text-red-600 group-hover/eliminar:bg-red-50 rounded-md transition-all duration-200 p-1 focus:outline-none focus:ring-2 focus:ring-red-200"
                    title="Eliminar producto"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {item.chasis_str && (
                <p className="text-[11px] text-amber-600 font-mono font-bold mb-2 bg-amber-50 inline-block px-1.5 py-0.5 rounded">
                    VIN: {item.chasis_str}
                </p>
            )}

            <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 ml-1">CANT:</span>
                    <input
                        type="number"
                        min="1"
                        max={item.stock_maximo}
                        value={item.cantidad === 0 ? '' : item.cantidad}
                        disabled={item.es_vehiculo === 1}
                        onChange={e => onActualizarCantidad(index, e.target.value)}
                        onFocus={e => e.target.select()}
                        onBlur={e => {
                            if (!e.target.value || Number(e.target.value) < 1) {
                                onActualizarCantidad(index, '1');
                            }
                        }}
                        className="w-12 p-1 text-center bg-white border border-slate-200 rounded text-sm font-bold outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-400">S/</span>
                    <span className="w-20 p-1 text-right text-sm font-black text-green-600">
                        {subtotalLinea.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
});

FilaCarrito.displayName = 'FilaCarrito';

// ==========================================
// PROPS DEL COMPONENTE PRINCIPAL
// ==========================================

interface Props {
    carrito: ItemCarrito[];
    setCarrito: React.Dispatch<React.SetStateAction<ItemCarrito[]>>;
    clienteSeleccionado: ClienteVenta | null;
    setClienteSeleccionado: (cliente: ClienteVenta | null) => void;
    nombreManual: string;
    setNombreManual: (nombre: string) => void;
    setModalClientes: (isOpen: boolean) => void;
    totalCarrito: number;
    handleProcesarVenta: () => void;
    procesando: boolean;
}

// ==========================================
// COMPONENTE PRINCIPAL (MEMORIZADO)
// ==========================================

const CarritoVentas = memo(({
    carrito,
    setCarrito,
    clienteSeleccionado,
    setClienteSeleccionado,
    nombreManual,
    setNombreManual,
    setModalClientes,
    totalCarrito,
    handleProcesarVenta,
    procesando,
}: Props) => {
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

    const actualizarCantidad = useCallback((idx: number, valorStr: string) => {
        setCarrito(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            if (valorStr === '') return { ...item, cantidad: 0 };

            const valor = parseInt(valorStr, 10);
            if (isNaN(valor)) return item;

            if (valor > item.stock_maximo) {
                // ✅ toast.warning en lugar de setTimeout(() => alert(), 0)
                toast.warning(`Solo hay ${item.stock_maximo} unidades disponibles.`);
                return { ...item, cantidad: item.stock_maximo };
            }
            return { ...item, cantidad: valor };
        }));
    }, [setCarrito]);

    const eliminarItem = useCallback((idx: number) => {
        setCarrito(prev => prev.filter((_, i) => i !== idx));
    }, [setCarrito]);

    const handleNombreManualChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setNombreManual(e.target.value.toUpperCase()),
        [setNombreManual]
    );

    const handleRemoverOSeleccionarCliente = useCallback(() => {
        if (clienteSeleccionado) {
            setClienteSeleccionado(null);
        } else {
            setModalClientes(true);
        }
    }, [clienteSeleccionado, setClienteSeleccionado, setModalClientes]);

    const handleConfirmarVenta = useCallback(() => {
        handleProcesarVenta();
        setMostrarConfirmacion(false);
    }, [handleProcesarVenta]);

    return (
        <div className="w-96 flex flex-col bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">

            {/* Cabecera y sección del cliente */}
            <div className="p-4 bg-radial-soft text-white shrink-0 space-y-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingCart /> Ticket de Venta
                </h2>
                <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-primary shadow-inner">
                    {clienteSeleccionado ? (
                        <div className="flex-1 truncate pr-2">
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                                {clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}
                            </p>
                            <p
                                className="font-bold text-secondary text-sm truncate"
                                title={clienteSeleccionado.nombre_completo.toUpperCase()}
                            >
                                {clienteSeleccionado.nombre_completo}
                            </p>
                        </div>
                    ) : (
                        <div className="relative w-full">
                            <input
                                type="text"
                                value={nombreManual}
                                onChange={handleNombreManualChange}
                                className="w-full bg-transparent text-black placeholder-slate-400 outline-none font-bold text-sm pr-8"
                                placeholder="Escribe un nombre..."
                            />

                            {nombreManual && (
                                <button
                                    type="button"
                                    onClick={() => setNombreManual('')}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-red-200"
                                    aria-label="Limpiar campo"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleRemoverOSeleccionarCliente}
                        className={`p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${clienteSeleccionado
                            ? 'bg-red-900 hover:bg-red-400 shadow-md focus:ring-red-400'
                            : 'bg-blue-900 hover:bg-blue-400 focus:ring-blue-400'
                            }`}
                        title={clienteSeleccionado ? 'Remover cliente' : 'Buscar en Directorio'}
                    >
                        {clienteSeleccionado ? <X size={16} /> : <Search size={16} />}
                    </button>
                </div>
            </div>

            {/* Lista de productos en el carrito */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-200 bg-white">
                {carrito.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                        <ShoppingCart size={48} className="opacity-20" />
                        <p className="font-medium">El carrito está vacío</p>
                    </div>
                ) : (
                    carrito.map((item, idx) => (
                        <FilaCarrito
                            key={`${item.lote_id}-${item.vehiculo_id ?? 'gen'}`}
                            item={item}
                            index={idx}
                            onActualizarCantidad={actualizarCantidad}
                            onEliminarItem={eliminarItem}
                        />
                    ))
                )}
            </div>

            {/* Total y botón de procesar */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="flex justify-between items-end mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-sm font-bold text-slate-500">TOTAL A PAGAR</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                        S/ {totalCarrito.toFixed(2)}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setMostrarConfirmacion(true)}
                    disabled={carrito.length === 0 || procesando}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:shadow-none flex justify-center items-center gap-2 transition-all text-lg focus:outline-none focus:ring-4 focus:ring-green-200"
                >
                    <CheckCircle size={22} />
                    {procesando ? 'Procesando...' : 'Procesar Venta'}
                </button>
            </div>

            {/* Modal de confirmación antes de procesar */}
            <ModalConfirmacion
                isOpen={mostrarConfirmacion}
                onClose={() => setMostrarConfirmacion(false)}
                onConfirm={handleConfirmarVenta}
                titulo="Confirmar Venta"
                mensaje={
                    <p>
                        ¿Estás seguro de registrar esta venta por un total de{' '}
                        <strong className="text-green-700">S/ {totalCarrito.toFixed(2)}</strong>?
                        {clienteSeleccionado && (
                            <span className="block mt-2 text-xs">
                                Cliente: <strong>{clienteSeleccionado.nombre_completo}</strong>
                            </span>
                        )}
                    </p>
                }
                textoConfirmar="Sí, procesar venta"
                textoCancelar="Revisar carrito"
                tipo="exito"
                procesando={procesando}
            />
        </div>
    );
});

CarritoVentas.displayName = 'CarritoVentas';

export default CarritoVentas;
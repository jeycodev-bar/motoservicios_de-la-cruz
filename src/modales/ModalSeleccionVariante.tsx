// // src/modales/ModalSeleccionVariante.tsx
// import { X, Bike } from 'lucide-react';
// import { obtenerHexPorColor } from '../utils/colores';
// import type { ProductoCatalogoUI, VarianteProducto } from '../services/ventas_service';

// // ==========================================
// // PROPS
// // ==========================================

// interface Props {
//     isOpen: boolean;
//     onClose: () => void;
//     /** ✅ ProductoCatalogoUI en lugar de any — contiene nombre, precio y variantes */
//     productoAgrupado: ProductoCatalogoUI;
//     /** ✅ VarianteProducto en lugar de any */
//     onSeleccionar: (variante: VarianteProducto) => void;
// }

// // ==========================================
// // COMPONENTE
// // ==========================================

// export default function ModalSeleccionVariante({
//     isOpen,
//     onClose,
//     productoAgrupado,
//     onSeleccionar,
// }: Props) {
//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

//                 {/* Cabecera */}
//                 <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
//                     <div>
//                         <h3 className="font-bold text-lg text-slate-800">
//                             {productoAgrupado.producto_nombre}
//                         </h3>
//                         <p className="text-sm text-slate-500">
//                             Selecciona el color a vender (Stock Total: {productoAgrupado.cantidad_total})
//                         </p>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
//                     >
//                         <X size={20} />
//                     </button>
//                 </div>

//                 {/* Lista de variantes */}
//                 <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
//                     {/* ✅ variante tipado como VarianteProducto — sin (variante: any) */}
//                     {productoAgrupado.variantes.map(variante => (
//                         <div
//                             key={variante.lote_id}
//                             onClick={() => onSeleccionar(variante)}
//                             className="flex items-center justify-between p-3 border-2 border-slate-100 rounded-xl hover:border-blue-500 cursor-pointer transition-all group"
//                         >
//                             <div className="flex items-center gap-4">
//                                 {/* Círculo de color */}
//                                 <div
//                                     className="w-10 h-10 rounded-full border-2 border-slate-200 shadow-sm flex items-center justify-center"
//                                     style={{ backgroundColor: obtenerHexPorColor(variante.color) ?? '#e2e8f0' }}
//                                 >
//                                     {/* ✅ es_vehiculo viene del productoPadre, no de la variante */}
//                                     {productoAgrupado.es_vehiculo === 1 && (
//                                         <Bike size={20} className="text-white drop-shadow-md mix-blend-difference" />
//                                     )}
//                                 </div>

//                                 <div>
//                                     <p className="font-bold text-slate-800 uppercase">
//                                         {variante.color ?? 'SIN COLOR'}
//                                     </p>
//                                     {/* ✅ SKU del productoPadre — no de la variante (que no lo tiene) */}
//                                     {productoAgrupado.sku && (
//                                         <p className="text-xs text-slate-500 font-mono">
//                                             SKU: {productoAgrupado.sku}
//                                         </p>
//                                     )}
//                                 </div>
//                             </div>

//                             <div className="flex flex-col items-end">
//                                 {/* ✅ Precio del productoPadre — VarianteProducto no tiene precio */}
//                                 <span className="font-bold text-blue-600">
//                                     S/ {productoAgrupado.precio_venta_referencial?.toFixed(2)}
//                                 </span>
//                                 <span className={`text-xs font-bold px-2 py-1 rounded-md mt-1 ${variante.cantidad > 0
//                                     ? 'bg-green-100 text-green-700'
//                                     : 'bg-red-100 text-red-700'
//                                     }`}>
//                                     Stk: {variante.cantidad}
//                                 </span>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// }




// src/modales/ModalSeleccionVariante.tsx
import { X, Bike } from 'lucide-react';

// ✅ Ruta corregida: '../utils/colors' (nombre adaptado por el equipo)
//    Firma actualizada: obtenerHexPorColor(color, fallback?) — sin ?? en el llamador
import { obtenerHexPorColor } from '../utils/colors';

import type { ProductoCatalogoUI, VarianteProducto } from '../services/ventas_service';

// ==========================================
// PROPS
// ==========================================

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** ProductoCatalogoUI en lugar de any — contiene nombre, precio y variantes */
    productoAgrupado: ProductoCatalogoUI;
    /** VarianteProducto en lugar de any */
    onSeleccionar: (variante: VarianteProducto) => void;
}

// ==========================================
// COMPONENTE
// ==========================================

export default function ModalSeleccionVariante({
    isOpen,
    onClose,
    productoAgrupado,
    onSeleccionar,
}: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Cabecera */}
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">
                            {productoAgrupado.producto_nombre}
                        </h3>
                        <p className="text-sm text-slate-500">
                            Selecciona el color a vender (Stock Total: {productoAgrupado.cantidad_total})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Lista de variantes */}
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                    {productoAgrupado.variantes.map(variante => (
                        <div
                            key={variante.lote_id}
                            onClick={() => onSeleccionar(variante)}
                            className="flex items-center justify-between p-3 border-2 border-slate-100 rounded-xl hover:border-blue-500 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                {/* Círculo de color */}
                                <div
                                    className="w-10 h-10 rounded-full border-2 border-slate-200 shadow-sm flex items-center justify-center"
                                    style={{
                                        // ✅ Fallback como segundo argumento — nueva firma de obtenerHexPorColor
                                        //    Antes: obtenerHexPorColor(variante.color) ?? '#e2e8f0'
                                        //    Ahora: obtenerHexPorColor(variante.color, '#e2e8f0')
                                        backgroundColor: obtenerHexPorColor(variante.color, '#ffffff'),
                                    }}
                                >
                                    {/* es_vehiculo viene del productoPadre, no de la variante */}
                                    {productoAgrupado.es_vehiculo === 1 && (
                                        <Bike
                                            size={20}
                                            className="text-white drop-shadow-md mix-blend-difference"
                                        />
                                    )}
                                </div>

                                <div>
                                    <p className="font-bold text-slate-800 uppercase">
                                        {variante.color ?? 'SIN COLOR'}
                                    </p>
                                    {/* SKU del productoPadre — VarianteProducto no lo tiene */}
                                    {productoAgrupado.sku && (
                                        <p className="text-xs text-slate-500 font-mono">
                                            SKU: {productoAgrupado.sku}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                {/* Precio del productoPadre — VarianteProducto no tiene precio */}
                                <span className="font-bold text-blue-600">
                                    S/ {productoAgrupado.precio_venta_referencial?.toFixed(2)}
                                </span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-md mt-1 ${variante.cantidad > 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                    Stk: {variante.cantidad}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
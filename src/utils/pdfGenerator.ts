// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { formatearFechaLocal } from '../utils/fechas';
// import type { OrdenActiva, DetalleOrden } from '../types';

// // ==========================================
// // TIPOS
// // ==========================================

// /**
//  * VentaPDF — cabecera de venta para el ticket.
//  * Acepta tanto VentaHistorialDTO (historial) como el objeto inline de PuntoVenta.
//  */
// interface VentaPDF {
//     id: string;
//     cliente_nombre?: string | null;
//     cliente?: string | null;
//     vendedor_nombre?: string | null;
//     fecha: string;
//     total: number | string;
// }

// /**
//  * DetalleTicket — tipo union que acepta tanto ItemCarrito (POS) como VentaDetalle (historial).
//  *
//  * ItemCarrito usa:   precio: number,   chasis_str: string | null
//  * VentaDetalle usa:  precio_unitario: number, numero_chasis: string | null
//  *
//  * Ambos comparten: cantidad, producto_nombre, color.
//  * El generador normaliza internamente con el helper `resolverDetalle`.
//  */
// export interface DetalleTicket {
//     cantidad: number;
//     producto_nombre: string;
//     color?: string | null;
//     // ItemCarrito
//     precio?: number;
//     chasis_str?: string | null;
//     // VentaDetalle
//     precio_unitario?: number;
//     subtotal?: number;
//     numero_chasis?: string | null;
// }

// // ==========================================
// // HELPERS INTERNOS
// // ==========================================

// const COLOR_TALLER: [number, number, number] = [234, 88, 12];
// const COLOR_VENTAS: [number, number, number] = [37, 99, 235];
// const COLOR_TEXTO: [number, number, number] = [51, 65, 85];
// const COLOR_FONDO: [number, number, number] = [248, 250, 252];

// function getFinalY(doc: jsPDF, fallback: number): number {
//     const ext = doc as jsPDF & { lastAutoTable: { finalY: number } };
//     return ext.lastAutoTable?.finalY ?? fallback;
// }

// /**
//  * Normaliza un DetalleTicket a los valores que usa el PDF,
//  * independientemente de si viene del POS (ItemCarrito) o del historial (VentaDetalle).
//  */
// function resolverDetalle(d: DetalleTicket): {
//     precioUnitario: number;
//     subtotal: number;
//     chasis: string | null;
// } {
//     const precioUnitario = d.precio_unitario ?? d.precio ?? 0;
//     const subtotal = d.subtotal ?? d.cantidad * precioUnitario;
//     const chasis = d.numero_chasis ?? d.chasis_str ?? null;
//     return { precioUnitario, subtotal, chasis };
// }

// // ==========================================
// // COMPROBANTE DE TALLER
// // ==========================================

// /**
//  * Recibe OrdenActiva directamente — sin interfaz local duplicada.
//  * cliente_nombre es string | null — se usa ?? para el fallback en el PDF.
//  */
// export const generarComprobantePDF = (
//     orden: OrdenActiva,
//     detalles: DetalleOrden[],
//     accion: 'DESCARGAR' | 'VER'
// ): string | null => {
//     const doc = new jsPDF('p', 'mm', 'a4');

//     // Cabecera
//     doc.setFontSize(22);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_TALLER);
//     doc.text('TALLER MECÁNICO V2', 14, 20);

//     doc.setFontSize(10);
//     doc.setFont('helvetica', 'normal');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('Av. Principal 123, Zona Industrial', 14, 26);
//     doc.text('Teléfono: +51 987 654 321', 14, 31);
//     doc.text('Soporte: contacto@tallerv2.com', 14, 36);

//     doc.setFillColor(...COLOR_FONDO);
//     doc.setDrawColor(226, 232, 240);
//     doc.rect(130, 15, 65, 25, 'FD');
//     doc.setFontSize(12);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('COMPROBANTE SERVICIO', 162.5, 24, { align: 'center' });
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.setTextColor(...COLOR_TALLER);
//     doc.text(`ORD-${orden.id.substring(0, 8).toUpperCase()}`, 162.5, 32, { align: 'center' });

//     // Datos del cliente
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.setFontSize(10);
//     doc.setFont('helvetica', 'bold');
//     doc.text('DATOS DEL CLIENTE', 14, 50);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Cliente: ${orden.cliente_nombre ?? 'Sin nombre'}`, 14, 57);
//     doc.text(`Vehículo: ${orden.vehiculo_info}`, 14, 63);
//     doc.text(`Ingreso: ${formatearFechaLocal(orden.fecha_ingreso)}`, 130, 57);
//     if (orden.fecha_entrega) {
//         doc.text(`Entrega: ${formatearFechaLocal(orden.fecha_entrega)}`, 130, 63);
//     } else {
//         doc.text('Estado: Finalizado', 130, 63);
//     }

//     // Tabla de detalles
//     const manoDeObra = Number(orden.costo_mano_obra ?? 0);
//     const tableData = detalles.map(d => [
//         d.cantidad.toString(),
//         d.producto_nombre,
//         `S/ ${d.precio_unitario.toFixed(2)}`,
//         `S/ ${d.subtotal.toFixed(2)}`,
//     ]);
//     if (manoDeObra > 0) {
//         tableData.push([
//             '1',
//             'Mano de Obra (Servicio de Taller)',
//             `S/ ${manoDeObra.toFixed(2)}`,
//             `S/ ${manoDeObra.toFixed(2)}`,
//         ]);
//     }

//     autoTable(doc, {
//         startY: 75,
//         head: [['Cant.', 'Descripción / Ítem', 'P. Unitario', 'Subtotal']],
//         body: tableData,
//         theme: 'grid',
//         headStyles: { fillColor: COLOR_TALLER, textColor: 255, fontStyle: 'bold' },
//         columnStyles: {
//             0: { halign: 'center', cellWidth: 20 },
//             2: { halign: 'right', cellWidth: 35 },
//             3: { halign: 'right', cellWidth: 35 },
//         },
//         styles: { fontSize: 9, textColor: COLOR_TEXTO, cellPadding: 4 },
//         alternateRowStyles: { fillColor: COLOR_FONDO },
//     });

//     const finalY = getFinalY(doc, 75);
//     const totalRep = detalles.reduce((acc, d) => acc + d.subtotal, 0);
//     const granTotal = totalRep + manoDeObra;

//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('TOTAL A COBRAR:', 170, finalY + 12, { align: 'right' });
//     doc.setTextColor(...COLOR_TALLER);
//     doc.text(`S/ ${granTotal.toFixed(2)}`, 195, finalY + 12, { align: 'right' });

//     doc.setFontSize(9);
//     doc.setFont('helvetica', 'italic');
//     doc.setTextColor(148, 163, 184);
//     doc.text(
//         '¡Gracias por confiar en nuestro servicio! Revisiones garantizadas por 30 días.',
//         105, finalY + 35, { align: 'center' }
//     );

//     if (accion === 'DESCARGAR') {
//         doc.save(`Comprobante_ORD-${orden.id.substring(0, 8)}.pdf`);
//         return null;
//     }
//     return URL.createObjectURL(doc.output('blob'));
// };

// // ==========================================
// // TICKET DE VENTA
// // ==========================================

// /**
//  * Genera el ticket PDF de una venta.
//  *
//  * ✅ Acepta DetalleTicket[] — union de ItemCarrito (POS) y VentaDetalle (historial).
//  *    El helper resolverDetalle normaliza los campos distintos internamente.
//  *    No se necesita cast en el llamador ni sobrecargas.
//  */
// export const generarTicketVentaPDF = (
//     venta: VentaPDF,
//     detalles: DetalleTicket[],
//     accion: 'DESCARGAR' | 'VER'
// ): string | null => {
//     const doc = new jsPDF('p', 'mm', 'a4');

//     // Cabecera
//     doc.setFontSize(22);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_VENTAS);
//     doc.text('PUNTO DE VENTA V2', 14, 20);

//     doc.setFontSize(10);
//     doc.setFont('helvetica', 'normal');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('Av. Principal 123, Zona Comercial', 14, 26);
//     doc.text('Teléfono: +51 987 654 321', 14, 31);
//     doc.text('Ventas: ventas@sistemav2.com', 14, 36);

//     doc.setFillColor(...COLOR_FONDO);
//     doc.setDrawColor(226, 232, 240);
//     doc.rect(130, 15, 65, 25, 'FD');
//     doc.setFontSize(12);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('TICKET DE VENTA', 162.5, 24, { align: 'center' });
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.setTextColor(...COLOR_VENTAS);
//     doc.text(`TCK-${venta.id.substring(0, 8).toUpperCase()}`, 162.5, 32, { align: 'center' });

//     // Datos de la venta
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.setFontSize(10);
//     doc.setFont('helvetica', 'bold');
//     doc.text('DATOS DE LA VENTA', 14, 50);
//     doc.setFont('helvetica', 'normal');

//     const nombreCliente = venta.cliente_nombre ?? venta.cliente ?? 'Público en General';
//     doc.text(`Cliente: ${nombreCliente}`, 14, 57);
//     doc.text(`Vendedor: ${venta.vendedor_nombre ?? 'Sistema'}`, 14, 63);
//     doc.text(`Fecha Emisión: ${formatearFechaLocal(venta.fecha)}`, 130, 57);
//     doc.text('Estado: Pagado', 130, 63);

//     // Tabla de detalles — normalizada vía resolverDetalle
//     const tableData = detalles.map(d => {
//         const { precioUnitario, subtotal, chasis } = resolverDetalle(d);

//         let descripcion = d.producto_nombre;
//         if (d.color) descripcion += ` (Color: ${d.color})`;
//         if (chasis) descripcion += `\nVIN: ${chasis}`;

//         return [
//             d.cantidad.toString(),
//             descripcion,
//             `S/ ${precioUnitario.toFixed(2)}`,
//             `S/ ${subtotal.toFixed(2)}`,
//         ];
//     });

//     autoTable(doc, {
//         startY: 75,
//         head: [['Cant.', 'Descripción del Producto', 'P. Unitario', 'Subtotal']],
//         body: tableData,
//         theme: 'grid',
//         headStyles: { fillColor: COLOR_VENTAS, textColor: 255, fontStyle: 'bold' },
//         columnStyles: {
//             0: { halign: 'center', cellWidth: 20 },
//             2: { halign: 'right', cellWidth: 35 },
//             3: { halign: 'right', cellWidth: 35 },
//         },
//         styles: { fontSize: 9, textColor: COLOR_TEXTO, cellPadding: 4 },
//         alternateRowStyles: { fillColor: COLOR_FONDO },
//     });

//     const finalY = getFinalY(doc, 75);

//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.setTextColor(...COLOR_TEXTO);
//     doc.text('TOTAL PAGADO:', 170, finalY + 12, { align: 'right' });
//     doc.setTextColor(...COLOR_VENTAS);
//     doc.text(`S/ ${Number(venta.total).toFixed(2)}`, 195, finalY + 12, { align: 'right' });

//     doc.setFontSize(9);
//     doc.setFont('helvetica', 'italic');
//     doc.setTextColor(148, 163, 184);
//     doc.text(
//         '¡Gracias por su preferencia! Conserve este comprobante para cualquier reclamo.',
//         105, finalY + 35, { align: 'center' }
//     );

//     if (accion === 'DESCARGAR') {
//         doc.save(`Ticket_Venta_${venta.id.substring(0, 8)}.pdf`);
//         return null;
//     }
//     return URL.createObjectURL(doc.output('blob'));
// };



// src/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearFechaLocal } from '../utils/fechas';
import type { OrdenActiva, DetalleOrden } from '../types';

// ==========================================
// CONFIGURACIÓN DE ASSETS (SOLUCIÓN TAURI)
// ==========================================
// Al importar el logo en Base64 directamente, evitamos bloqueos de red (CORS),
// rutas no encontradas en el WebView de Tauri y la necesidad de usar async/await.
// import { LOGO_EMPRESA_BASE64 } from '../assets/logos';

// ==========================================
// CONFIGURACIÓN GLOBAL (SINGLE SOURCE OF TRUTH)
// ==========================================
const INFO_EMPRESA = {
    nombre: 'EMPRESA AUTOMOTRIZ V2 S.A.C.',
    direccion: 'Av. Puente Chirahoca 123, Zona Industrial',
    telefono: '+51 987 654 321',
    emailSoporte: 'contacto@tallerv2.com',
    emailVentas: 'ventas@sistemav2.com',
} as const;

const COLOR_TEXTO: [number, number, number] = [51, 65, 85];
const COLOR_FONDO: [number, number, number] = [248, 250, 252];

// ==========================================
// TIPOS E INTERFACES
// ==========================================
interface VentaPDF { id: string; cliente_nombre?: string | null; cliente?: string | null; vendedor_nombre?: string | null; fecha: string; total: number | string; }
export interface DetalleTicket { cantidad: number; producto_nombre: string; color?: string | null; precio?: number; chasis_str?: string | null; precio_unitario?: number; subtotal?: number; numero_chasis?: string | null; }

interface ConfiguracionDocumento {
    temaGlobal: {
        colorPrimario: [number, number, number];
        emailContacto: string;
    };
    cajaDocumento: { tipo: string; codigo: string; };
    metadatos: Array<{ label: string; value: string }>;
    tabla: { cabeceras: string[]; filas: string[][]; anchosColumnas: any; };
    totales: { label: string; valor: number; };
    piePagina: string;
    archivoSalida: string;
    accion: 'DESCARGAR' | 'VER';
}

function resolverDetalle(d: DetalleTicket) {
    const precioUnitario = d.precio_unitario ?? d.precio ?? 0;
    const subtotal = d.subtotal ?? d.cantidad * precioUnitario;
    const chasis = d.numero_chasis ?? d.chasis_str ?? null;
    return { precioUnitario, subtotal, chasis };
}

// ==========================================
// MOTOR DE RENDERIZADO (TEMPLATE PATTERN)
// ==========================================

/**
 * Función centralizada que construye la estructura del PDF.
 * Al usar Base64, recuperamos la sincronía completa (no más async/await).
 */
function generarPlantillaBase(config: ConfiguracionDocumento): string | null {
    const doc = new jsPDF('p', 'mm', 'a4');
    const { temaGlobal, cajaDocumento, metadatos, tabla, totales, piePagina, accion, archivoSalida } = config;

    // 1. Inyectar Logo Síncrono
    // if (LOGO_EMPRESA_BASE64) {
    //     doc.addImage(LOGO_EMPRESA_BASE64, 'PNG', 14, 15, 20, 20);
    // }

    // 2. Cabecera Izquierda (Desplazada a X=38 para respetar el logo)
    const startXTexto = 38;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...temaGlobal.colorPrimario);
    doc.text(INFO_EMPRESA.nombre, startXTexto, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(INFO_EMPRESA.direccion, startXTexto, 26);
    doc.text(`Teléfono: ${INFO_EMPRESA.telefono}`, startXTexto, 31);
    doc.text(`Contacto: ${temaGlobal.emailContacto}`, startXTexto, 36);

    // 3. Caja Derecha (Tipo de Documento)
    doc.setFillColor(...COLOR_FONDO);
    doc.setDrawColor(226, 232, 240);
    doc.rect(130, 15, 65, 25, 'FD');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(cajaDocumento.tipo, 162.5, 24, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...temaGlobal.colorPrimario);
    doc.text(cajaDocumento.codigo, 162.5, 32, { align: 'center' });

    // 4. Metadatos
    doc.setTextColor(...COLOR_TEXTO);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL DOCUMENTO', 14, 50);
    doc.setFont('helvetica', 'normal');

    metadatos.forEach((meta, index) => {
        const xPos = index % 2 === 0 ? 14 : 130;
        const yPos = 57 + Math.floor(index / 2) * 6;
        doc.text(`${meta.label}: ${meta.value}`, xPos, yPos);
    });

    // 5. Tabla Principal
    autoTable(doc, {
        startY: 75,
        head: [tabla.cabeceras],
        body: tabla.filas,
        theme: 'grid',
        headStyles: { fillColor: temaGlobal.colorPrimario, textColor: 255, fontStyle: 'bold' },
        columnStyles: tabla.anchosColumnas,
        styles: { fontSize: 9, textColor: COLOR_TEXTO, cellPadding: 4 },
        alternateRowStyles: { fillColor: COLOR_FONDO },
    });

    const finalY = (doc as any).lastAutoTable?.finalY ?? 75;

    // ==============================================================
    // 6. TOTALES (ALGORITMO DINÁMICO ANTI-SUPERPOSICIÓN)
    // ==============================================================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    const valorFormateado = `S/ ${totales.valor.toFixed(2)}`;
    const anchoMonto = doc.getTextWidth(valorFormateado);
    const posXDerechaAbsoluta = 195;
    const paddingEtiqueta = 5;

    // Dibujamos primero el monto anclado a la derecha
    doc.setTextColor(...temaGlobal.colorPrimario);
    doc.text(valorFormateado, posXDerechaAbsoluta, finalY + 12, { align: 'right' });

    // Dibujamos la etiqueta desplazada dinámicamente hacia la izquierda
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(
        totales.label,
        posXDerechaAbsoluta - anchoMonto - paddingEtiqueta,
        finalY + 12,
        { align: 'right' }
    );
    // ==============================================================

    // 7. Pie de página
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(piePagina, 105, finalY + 35, { align: 'center' });

    // 8. Retorno (Solución para el Router/WebView de Tauri)
    if (accion === 'DESCARGAR') {
        doc.save(`${archivoSalida}.pdf`);
        return null;
    }

    // Usamos Data URI en lugar de Blob para evitar que el router de la SPA
    // lo interprete como una redirección y te mande a la pantalla de Login.
    return doc.output('datauristring');
}

// ==========================================
// CASOS DE USO (Totalmente Síncronos)
// ==========================================

export const generarComprobantePDF = (orden: OrdenActiva, detalles: DetalleOrden[], accion: 'DESCARGAR' | 'VER'): string | null => {
    const manoDeObra = Number(orden.costo_mano_obra ?? 0);
    const tableData = detalles.map(d => [d.cantidad.toString(), d.producto_nombre, `S/ ${d.precio_unitario.toFixed(2)}`, `S/ ${d.subtotal.toFixed(2)}`]);
    if (manoDeObra > 0) tableData.push(['1', 'Mano de Obra (Servicio de Taller)', `S/ ${manoDeObra.toFixed(2)}`, `S/ ${manoDeObra.toFixed(2)}`]);
    const granTotal = detalles.reduce((acc, d) => acc + d.subtotal, 0) + manoDeObra;

    return generarPlantillaBase({
        temaGlobal: { colorPrimario: [234, 88, 12], emailContacto: INFO_EMPRESA.emailSoporte },
        cajaDocumento: { tipo: 'COMPROBANTE SERVICIO', codigo: `ORD-${orden.id.substring(0, 8).toUpperCase()}` },
        metadatos: [
            { label: 'Cliente', value: orden.cliente_nombre ?? 'Sin nombre' },
            { label: 'Ingreso', value: formatearFechaLocal(orden.fecha_ingreso) },
            { label: 'Vehículo', value: orden.vehiculo_info },
            { label: 'Estado', value: orden.fecha_entrega ? formatearFechaLocal(orden.fecha_entrega) : 'Finalizado' }
        ],
        tabla: {
            cabeceras: ['Cant.', 'Descripción / Ítem', 'P. Unitario', 'Subtotal'],
            filas: tableData,
            anchosColumnas: { 0: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 35 } }
        },
        totales: { label: 'TOTAL A COBRAR:', valor: granTotal },
        piePagina: '¡Gracias por confiar en nuestro servicio! Revisiones garantizadas por 30 días.',
        archivoSalida: `Comprobante_ORD-${orden.id.substring(0, 8)}`,
        accion
    });
};

export const generarTicketVentaPDF = (venta: VentaPDF, detalles: DetalleTicket[], accion: 'DESCARGAR' | 'VER'): string | null => {
    const tableData = detalles.map(d => {
        const { precioUnitario, subtotal, chasis } = resolverDetalle(d);
        let descripcion = d.producto_nombre;
        if (d.color) descripcion += ` (Color: ${d.color})`;
        if (chasis) descripcion += `\nVIN: ${chasis}`;
        return [d.cantidad.toString(), descripcion, `S/ ${precioUnitario.toFixed(2)}`, `S/ ${subtotal.toFixed(2)}`];
    });

    return generarPlantillaBase({
        temaGlobal: { colorPrimario: [37, 99, 235], emailContacto: INFO_EMPRESA.emailVentas },
        cajaDocumento: { tipo: 'TICKET DE VENTA', codigo: `TCK-${venta.id.substring(0, 8).toUpperCase()}` },
        metadatos: [
            { label: 'Cliente', value: venta.cliente_nombre ?? venta.cliente ?? 'Público en General' },
            { label: 'Emisión', value: formatearFechaLocal(venta.fecha) },
            { label: 'Vendedor', value: venta.vendedor_nombre ?? 'Sistema' },
            { label: 'Estado', value: 'Pagado' }
        ],
        tabla: {
            cabeceras: ['Cant.', 'Descripción del Producto', 'P. Unitario', 'Subtotal'],
            filas: tableData,
            anchosColumnas: { 0: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 35 } }
        },
        totales: { label: 'TOTAL PAGADO:', valor: Number(venta.total) },
        piePagina: '¡Gracias por su preferencia! Conserve este comprobante para cualquier reclamo.',
        archivoSalida: `Ticket_Venta_${venta.id.substring(0, 8)}`,
        accion
    });
};
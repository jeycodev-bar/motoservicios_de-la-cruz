// src/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearFechaLocal } from '../utils/fechas';
import type { OrdenActiva, DetalleOrden } from '../types';

// ==========================================
// CONFIGURACIÓN GLOBAL (SINGLE SOURCE OF TRUTH)
// ==========================================
const INFO_EMPRESA = {
    nombre: 'Moto Servicios De La Cruz',
    direccion: 'Av. Carlos Hirahoka 619, Huanta',
    telefono: '+51 987 654 321',
    emailSoporte: 'motoservicios_dlc@gmail.com',
    emailVentas: 'ventas_ms-dlc@gmail.com',
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

function generarPlantillaBase(config: ConfiguracionDocumento): string | null {
    const doc = new jsPDF('p', 'mm', 'a4');
    const { temaGlobal, cajaDocumento, metadatos, tabla, totales, piePagina, accion, archivoSalida } = config;

    // 1. Cabecera Izquierda (Alineada al margen izquierdo limpio)
    const startXTexto = 14;

    // Tamaño de fuente ligeramente ajustado (18) para verse elegante sin el logo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...temaGlobal.colorPrimario);
    doc.text(INFO_EMPRESA.nombre, startXTexto, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR_TEXTO);
    doc.text(INFO_EMPRESA.direccion, startXTexto, 26);
    doc.text(`Teléfono: ${INFO_EMPRESA.telefono}`, startXTexto, 31);
    doc.text(`Contacto: ${temaGlobal.emailContacto}`, startXTexto, 36);

    // 2. Caja Derecha (Tipo de Documento)
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

    // 3. Metadatos
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

    // 4. Tabla Principal
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
    // 5. TOTALES (ALGORITMO DINÁMICO ANTI-SUPERPOSICIÓN)
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

    // 6. Pie de página
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(piePagina, 105, finalY + 35, { align: 'center' });

    // 7. Retorno (Solución Router/WebView de Tauri)
    if (accion === 'DESCARGAR') {
        doc.save(`${archivoSalida}.pdf`);
        return null;
    }

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
            { label: 'F. Ingreso', value: formatearFechaLocal(orden.fecha_ingreso) },
            { label: 'Vehículo', value: orden.vehiculo_info },
            { label: 'F. Entrega', value: orden.fecha_entrega ? formatearFechaLocal(orden.fecha_entrega) : 'Finalizado' }
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
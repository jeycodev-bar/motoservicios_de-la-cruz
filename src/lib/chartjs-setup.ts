// // src/lib/chartjs-setup.ts
// import {
//     Chart, CategoryScale, LinearScale, BarElement,
//     ArcElement, PointElement, LineElement, Tooltip, Legend, Filler,
// } from 'chart.js';

// Chart.register(
//     CategoryScale, LinearScale, BarElement, ArcElement,
//     PointElement, LineElement, Tooltip, Legend, Filler
// );









// // src/lib/chartjs-setup.ts
// // =============================================================================
// // Chart.js — registro global centralizado
// // =============================================================================
// // Importar UNA SOLA VEZ en el entry point de la aplicación (main.tsx).
// // Usar chart.js named imports (no /auto) garantiza tree-shaking:
// // el bundle final solo incluye los módulos realmente usados en el proyecto.
// //
// // Módulos registrados:
// //   - CategoryScale / LinearScale → ejes X/Y de gráficos cartesianos (bar, line)
// //   - BarElement                  → gráfico de barras (ventas diarias)
// //   - ArcElement                  → gráfico de dona/pie (categorías)
// //   - PointElement / LineElement  → gráfico de línea (futuro)
// //   - Tooltip                     → tooltips interactivos
// //   - Legend                      → leyenda (deshabilitada en el dashboard, registrada igual)
// //   - Filler                      → relleno bajo líneas (futuro area chart)
// // =============================================================================

// import {
//     Chart,
//     CategoryScale,
//     LinearScale,
//     BarElement,
//     ArcElement,
//     PointElement,
//     LineElement,
//     Tooltip,
//     Legend,
//     Filler,
// } from 'chart.js';

// Chart.register(
//     CategoryScale,
//     LinearScale,
//     BarElement,
//     ArcElement,
//     PointElement,
//     LineElement,
//     Tooltip,
//     Legend,
//     Filler,
// );

// // Defaults globales — aplicados a todos los charts del sistema
// Chart.defaults.font.family = "'JetBrains Mono', 'Fira Code', 'Consolas', monospace";
// Chart.defaults.color = 'rgb(139 143 168)'; // --color-text-tertiary del tema oscuro
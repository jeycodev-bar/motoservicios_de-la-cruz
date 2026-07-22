// 👇 Importas el setup AQUÍ, solo para que se ejecute al iniciar la app
// import './lib/chartjs-setup';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { ThemeProvider } from './lib/theme';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* <App /> */}
    <ThemeProvider defaultTheme="light">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

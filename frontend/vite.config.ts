import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // amazon-cognito-identity-js (vía el paquete "buffer") asume el "global"
  // de Node, que no existe en el navegador — Vite no lo polyfillea solo.
  // Hace falta en los dos lados: "define" para el código propio y
  // "optimizeDeps.esbuildOptions.define" para el pre-bundling de la
  // dependencia (son pasos distintos, uno no cubre al otro).
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    port: 5173,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/Guerras_Egipcias/",
  plugins: [react()],
  // O teste de integração do servidor (server/*.mjs) roda via `node`, não pelo
  // vitest — ele sobe um processo real e abre WebSockets. Fora da varredura.
  test: { include: ["src/**/*.{test,spec}.{js,jsx}"], exclude: ["server/**", "node_modules/**", "dist/**"] },
});

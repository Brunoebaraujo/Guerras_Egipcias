import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Site do projeto no GitHub Pages: https://brunoebaraujo.github.io/Guerras_Egipcias/
export default defineConfig({
  base: "/Guerras_Egipcias/",
  plugins: [react()],
});

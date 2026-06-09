import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base auf relativen Pfad setzen, damit ein statischer Export (z.B. GitHub Pages
// oder ein Unterverzeichnis) ohne Anpassung funktioniert.
export default defineConfig({
  base: "./",
  plugins: [react()],
});

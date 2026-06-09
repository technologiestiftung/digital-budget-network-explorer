import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Base auf "/" setzen fuer korrekte HTML5 History API (URL-Routing)
export default defineConfig({
    base: "/",
    plugins: [react()],
});

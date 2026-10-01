import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The demo consumes the library exactly like an application would, resolved to the sources
export default defineConfig({
  root: here("."),
  base: process.env.DEMO_BASE ?? "/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "liquid-glass-components/styles.css", replacement: here("../src/styles.css") },
      { find: "liquid-glass-components", replacement: here("../src/index.ts") },
    ],
  },
  build: { outDir: here("../demo-dist"), emptyOutDir: true },
});

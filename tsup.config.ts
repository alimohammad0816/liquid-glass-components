import { defineConfig } from "tsup";

// Post processing (the "use client" directive and the stylesheet declaration) lives in
// scripts/postbuild.mjs, which npm runs automatically after `npm run build`.
export default defineConfig({
  entry: { index: "src/index.ts", styles: "src/styles.css" },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts" } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "motion", "react/jsx-runtime"],
});

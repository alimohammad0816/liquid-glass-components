import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "tsup";

const DIRECTIVE = '"use client";';

export default defineConfig({
  entry: { index: "src/index.ts", styles: "src/styles.css" },
  format: ["esm", "cjs"],
  dts: { entry: { index: "src/index.ts" } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "motion", "react/jsx-runtime"],
  // The bundler drops module level directives, so the one the components need is added
  // afterwards. They use hooks and browser APIs, so React Server Component frameworks must
  // treat the package as client code. It is prepended without a newline to keep line numbers
  // in the source maps intact.
  async onSuccess() {
    for (const file of ["dist/index.js", "dist/index.cjs"]) {
      const source = await readFile(file, "utf8");
      if (!source.startsWith(DIRECTIVE)) await writeFile(file, DIRECTIVE + source);
    }
  },
});

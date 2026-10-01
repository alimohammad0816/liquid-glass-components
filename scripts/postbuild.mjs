import { readFile, writeFile } from "node:fs/promises";

const DIRECTIVE = '"use client";';

// The bundler drops module level directives, so the one the components need is added
// afterwards. They use hooks and browser APIs, so React Server Component frameworks must
// treat the package as client code. It is prepended without a newline to keep line numbers
// in the source maps intact.
for (const file of ["dist/index.js", "dist/index.cjs"]) {
  const source = await readFile(file, "utf8");
  if (!source.startsWith(DIRECTIVE)) await writeFile(file, DIRECTIVE + source);
}

// TypeScript checks side effect imports such as `import "pkg/styles.css"` and needs a
// declaration to resolve them, otherwise the import is reported as an unknown module.
await writeFile("dist/styles.d.ts", "export {};\n");

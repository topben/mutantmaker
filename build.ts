/**
 * Build script to bundle the React app for browser
 * Run with: deno run --allow-read --allow-write --allow-env --allow-run build.ts
 */

import * as esbuild from "https://deno.land/x/esbuild@v0.20.2/mod.js";

const result = await esbuild.build({
  entryPoints: ["./static/main.tsx"],
  bundle: true,
  outfile: "./static/main.js",
  format: "esm",
  target: ["chrome100", "firefox100", "safari15"],
  jsx: "automatic",
  jsxImportSource: "https://esm.sh/react@19.0.0",
  minify: false,
  sourcemap: true,
  external: [],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
});

console.log("✅ Build complete!", result);

esbuild.stop();

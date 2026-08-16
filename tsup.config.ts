import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/hooks/**/*", "src/commands/**/*"],
  format: ["esm"],
  outDir: "dist",
  dts: true,
  minifyWhitespace: true,
  minifySyntax: true,
});

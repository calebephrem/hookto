import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/app/**/*"],
  format: ["esm"],
  outDir: "dist",
  dts: false,
  minifyWhitespace: true,
  minifySyntax: true,
  external: ["dotenv"],
});

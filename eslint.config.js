// eslint.config.mjs
// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  files: ["**/*.{ts,tsx}"],
  extends: [js.configs.recommended, tseslint.configs.recommended],
});

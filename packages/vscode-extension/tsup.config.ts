import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts"],
  format: ["cjs"], // VS Code extensions must use CommonJS
  dts: false,
  sourcemap: true,
  clean: true,
  external: ["vscode"],
  platform: "node",
  target: "node18",
});

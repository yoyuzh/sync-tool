import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["electron/main.ts", "electron/preload.ts"],
  format: ["cjs"],
  platform: "node",
  external: ["electron"],
  outDir: "dist-electron",
  clean: true,
  splitting: false,
  outExtension: () => ({ js: ".cjs" })
});

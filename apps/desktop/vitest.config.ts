import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js", ".json"]
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"]
  }
});

import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["test/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/**/*.ts"],
            exclude: ["src/config.ts", "src/index.ts", "src/serverTypes.ts", "src/types/**/*.d.ts"],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 85,
                statements: 85
            }
        }
    }
});

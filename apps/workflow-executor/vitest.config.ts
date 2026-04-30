import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        deps: {
            interopDefault: true,   // handles ESM/CJS interop
        }
    },
    resolve: {
        conditions: ["import", "module", "default"]
    }
})
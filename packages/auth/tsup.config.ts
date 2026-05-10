import { defineConfig } from "tsup"

export default defineConfig({
    // Entry point — your barrel file that exports everything
    entry: ["src/index.ts"],

    // Output both formats so any consumer works regardless of their module type
    format: ["esm", "cjs"],

    // Generate TypeScript declaration files (.d.ts)
    // Both formats share the same types
    dts: true,

    // Wipe dist/ before each build so stale files don't linger
    clean: true,

    // Generate sourcemaps for debugging
    sourcemap: true,

    // Don't bundle your dependencies — consumers bring their own
    // mongoose, etc. stay as external imports
    splitting: false,
    bundle: true,
    external: ["mongoose"],
})
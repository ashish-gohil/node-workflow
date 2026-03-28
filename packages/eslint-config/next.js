import { globalIgnores } from "eslint/config";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * 🚀 Optimized Next.js ESLint Config
 */
export const nextJsConfig = [
  // ✅ Base config (already includes JS + TS + prettier base)
  ...baseConfig,

  // ✅ Ignore build files
  globalIgnores([".next/**", "out/**", "build/**", "dist/**", "node_modules/**", "next-env.d.ts"]),

  // -----------------------------
  // ⚛️ React
  // -----------------------------
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // React 17+ JSX transform
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",

      // Better defaults
      "react/prop-types": "off", // using TS
    },
  },

  // -----------------------------
  // ⚡ React Hooks
  // -----------------------------
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,

      // Optional stricter rules
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // -----------------------------
  // 🚀 Next.js
  // -----------------------------
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,

      // Optional relaxations
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // -----------------------------
  // 🧠 TypeScript (Strong Mode)
  // -----------------------------
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

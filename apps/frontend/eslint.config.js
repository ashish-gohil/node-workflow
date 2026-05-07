import { nextJsConfig } from "@repo/eslint-config/next";

import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

const eslintconfig = [
  {
    ignores: [
      "eslint.config.js",
      "next.config.js",
      "postcss.config.mjs",
      "tailwind.config.ts",
    ],
  },

  ...nextJsConfig,

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: {
      import: importPlugin,
      unicorn,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,

      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-array-callback-reference": "error",

      "@typescript-eslint/no-explicit-any": "warn",

      "prefer-const": "error",
      "no-var": "error",
    },
  },
];

export default eslintconfig;

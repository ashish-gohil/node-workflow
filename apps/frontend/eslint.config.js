import { nextJsConfig } from "@repo/eslint-config/next";

export default [
  ...nextJsConfig,
  {
    ignores: [
      "eslint.config.js",
      "next.config.js",
      "postcss.config.mjs",
      "tailwind.config.ts",
    ],
  },
];

import { nextJsConfig } from "@repo/eslint-config/next-js";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  ...nextJsConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
];

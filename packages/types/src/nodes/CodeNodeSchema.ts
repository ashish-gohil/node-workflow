import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

export const CodeNodeSchema = z.object({
  code: z
    .string()
    .describe("JavaScript snippet executed in a sandboxed runtime"),
});

export type CodeNode = z.infer<typeof CodeNodeSchema>;

export const CodeNodeUIMeta: NodeUIMeta = {
  nodeType: "code",
  displayName: "Code",
  icon: "Braces",
  category: "action",
  description: "Run custom JavaScript on the input items",
  fields: {
    code: {
      label: "Code",
      widget: "textArea",
      placeholder: "return items;",
    },
  },
};

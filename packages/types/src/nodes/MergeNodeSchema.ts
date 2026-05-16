import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

export const MergeNodeSchema = z.object({
  mode: z
    .enum(["append", "byIndex", "byKey"])
    .describe("How to merge items from multiple input branches"),
  // Required when mode === "byKey". Validated at form level; left optional in
  // the schema so the discriminated UI can render the field conditionally.
  key: z.string().optional().describe("Field name to merge by"),
  inputs: z
    .number()
    .min(2)
    .optional()
    .describe("Number of input branches feeding this node"),
});

export type MergeNode = z.infer<typeof MergeNodeSchema>;

export const MergeNodeUIMeta: NodeUIMeta = {
  nodeType: "merge",
  displayName: "Merge",
  icon: "Merge",
  category: "action",
  description: "Combine items from multiple input branches into one stream",
  fields: {
    mode: {
      label: "Merge mode",
      widget: "select",
      default: "append",
      options: [
        { label: "Append", value: "append" },
        { label: "Merge by index", value: "byIndex" },
        { label: "Merge by key", value: "byKey" },
      ],
    },
    key: {
      label: "Merge key",
      widget: "text",
      placeholder: "id",
      showWhen: { field: "mode", in: ["byKey"] },
    },
    inputs: {
      label: "Number of inputs",
      widget: "number",
      default: 2,
    },
  },
};

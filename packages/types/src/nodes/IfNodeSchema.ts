import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

/* ------------------------------------------------------------------ */
/*  Operator + condition sub-schemas                                   */
/* ------------------------------------------------------------------ */

export const IfOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "exists",
  "contains",
]);

export const IfConditionSchema = z.object({
  left: z.string().describe("Left-hand side value or expression"),
  operator: IfOperatorSchema,
  // Optional — unary operators (`exists`) don't need a right-hand value.
  right: z
    .unknown()
    .optional()
    .describe("Right-hand side value — omit for unary operators"),
});

/* ------------------------------------------------------------------ */
/*  Root schema — list of conditions (AND-combined at runtime)         */
/* ------------------------------------------------------------------ */

export const IfSchema = z.object({
  conditions: z
    .array(IfConditionSchema)
    .min(1, "At least one condition is required"),
});

export type IfOperator = z.infer<typeof IfOperatorSchema>;
export type IfCondition = z.infer<typeof IfConditionSchema>;
export type If = z.infer<typeof IfSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata                                                        */
/*                                                                    */
/*  The frontend uses a bespoke editor for the conditions list (see   */
/*  if-condition-action-node config). Fields below describe the row   */
/*  shape for schema-driven preview/inspection contexts.              */
/* ------------------------------------------------------------------ */

export const IfUIMeta: NodeUIMeta = {
  nodeType: "if",
  displayName: "IF",
  icon: "GitBranch",
  category: "logic",
  description: "Split the workflow into two branches based on conditions",
  fields: {
    conditions: {
      widget: "fieldArray",
      label: "Conditions",
      addLabel: "Add condition",
      itemFields: {
        left: {
          label: "Left value",
          widget: "text",
          placeholder: "{{Trigger.output.body.status}}",
        },
        operator: {
          label: "Operator",
          widget: "select",
          default: "equals",
          options: [
            { label: "Equals", value: "equals" },
            { label: "Does not equal", value: "notEquals" },
            { label: "Greater than", value: "greaterThan" },
            { label: "Less than", value: "lessThan" },
            { label: "Exists", value: "exists" },
            { label: "Contains", value: "contains" },
          ],
        },
        right: {
          label: "Right value",
          widget: "text",
          placeholder: "premium",
          showWhen: {
            field: "operator",
            notIn: ["exists"],
          },
        },
      },
    },
  },
};

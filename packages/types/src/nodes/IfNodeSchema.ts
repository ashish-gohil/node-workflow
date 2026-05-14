import * as z from "zod";

export const IfSchema = z.object({
  leftValue: z
    .union([z.string(), z.number(), z.boolean()])
    .describe("Left-hand side value or expression"),
  operator: z.enum([
    "equals",
    "not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "is_empty",
    "is_not_empty",
  ]),
  // Optional — unary operators (is_empty, is_not_empty) don't need a right-hand value.
  // UI hides this field via showWhen; validation is handled at the form level.
  rightValue: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("Right-hand side value — omit for unary operators"),
});

export type If = z.infer<typeof IfSchema>;

// IfNode produces two output branches: "true" and "false".
// ExecutionEngine routes downstream nodes based on which branch resolves.
export const IfUIMeta = {
  nodeType: "if",
  displayName: "IF",
  icon: "GitBranch",
  category: "logic",
  description: "Split the workflow into two branches based on a condition",
  fields: {
    leftValue: {
      label: "Left value",
      widget: "text",
      placeholder: "{{Trigger.output.body.status}}",
    },
    operator: {
      label: "Operator",
      widget: "select",
      options: [
        { label: "Equals", value: "equals" },
        { label: "Does not equal", value: "not_equals" },
        { label: "Greater than", value: "greater_than" },
        { label: "Greater than or equal", value: "greater_than_or_equal" },
        { label: "Less than", value: "less_than" },
        { label: "Less than or equal", value: "less_than_or_equal" },
        { label: "Contains", value: "contains" },
        { label: "Does not contain", value: "not_contains" },
        { label: "Starts with", value: "starts_with" },
        { label: "Ends with", value: "ends_with" },
        { label: "Is empty", value: "is_empty" },
        { label: "Is not empty", value: "is_not_empty" },
      ],
    },
    rightValue: {
      label: "Right value",
      widget: "text",
      placeholder: "premium",
      showWhen: {
        field: "operator",
        notIn: ["is_empty", "is_not_empty"],
      },
    },
  },
};

import * as z from "zod";

export const SetVariableSchema = z.object({
  assignments: z
    .array(
      z.object({
        name: z.string().min(1, "Variable name is required"),
        type: z.enum(["string", "number", "boolean", "object"]).default("string"),
        value: z.union([z.string(), z.number(), z.boolean()]),
      })
    )
    .min(1, "Add at least one variable"),
});

export type SetVariable = z.infer<typeof SetVariableSchema>;

// Output is a flat object keyed by assignment name — not the raw config shape.
// SetVariableNode.execute() must flatten:
//   { assignments: [{ name: "foo", value: "bar" }] }  →  { foo: "bar" }
export const SetVariableUIMeta = {
  nodeType: "setVariable",
  displayName: "Set Variable",
  icon: "Variable",
  category: "action",
  description: "Define one or more variables to pass downstream",
  fields: {
    assignments: {
      label: "Variables",
      widget: "fieldArray",
      addLabel: "Add variable",
      itemFields: {
        name: {
          label: "Name",
          widget: "text",
          placeholder: "customerName",
        },
        type: {
          label: "Type",
          widget: "select",
          default: "string",
          options: [
            { label: "String", value: "string" },
            { label: "Number", value: "number" },
            { label: "Boolean", value: "boolean" },
            { label: "Object", value: "object" },
          ],
        },
        value: {
          label: "Value",
          widget: "text",
          placeholder: "{{Trigger.output.body.name}}",
        },
      },
    },
  },
};

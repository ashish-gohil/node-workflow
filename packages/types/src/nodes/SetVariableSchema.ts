import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

/* ------------------------------------------------------------------ */
/*  Root schema                                                        */
/*                                                                    */
/*  The frontend stores Set-node assignments as a flat object keyed   */
/*  by variable name — see set-node-config.tsx. Values are runtime-   */
/*  typed at the form level (string / number / boolean / object), so  */
/*  the schema accepts `unknown` here.                                */
/* ------------------------------------------------------------------ */

export const SetVariableSchema = z.object({
  values: z
    .record(z.string(), z.unknown())
    .describe("Key-value assignments emitted by this node"),
});

export type SetVariable = z.infer<typeof SetVariableSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata                                                        */
/*                                                                    */
/*  The frontend uses a bespoke key-value editor for this node (it    */
/*  drives per-row type pickers). UIMeta below is informational —     */
/*  describes the field shape for schema-driven preview/inspection.   */
/* ------------------------------------------------------------------ */

export const SetVariableUIMeta: NodeUIMeta = {
  nodeType: "set",
  displayName: "Set",
  icon: "Variable",
  category: "action",
  description: "Define one or more variables to pass downstream",
  fields: {
    values: {
      label: "Variables",
      widget: "keyValueList",
      addLabel: "Add variable",
      keyPlaceholder: "name",
      valuePlaceholder: "{{Trigger.output.body.name}}",
    },
  },
};

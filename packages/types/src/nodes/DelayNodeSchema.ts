import * as z from "zod";

import type { NodeUIMeta } from "./field-meta";

/* ------------------------------------------------------------------ */
/*  Sub-schemas per mode                                               */
/* ------------------------------------------------------------------ */

const SecondsDelaySchema = z.object({
  mode: z.literal("seconds"),
  seconds: z.number().min(0).describe("How many seconds to pause"),
});

const UntilDelaySchema = z.object({
  mode: z.literal("until"),
  timestamp: z.string().describe("ISO datetime to resume at"),
});

/* ------------------------------------------------------------------ */
/*  Root schema — discriminated on mode                                */
/* ------------------------------------------------------------------ */

export const DelayNodeSchema = z.discriminatedUnion("mode", [
  SecondsDelaySchema,
  UntilDelaySchema,
]);

export type DelayNode = z.infer<typeof DelayNodeSchema>;

/* ------------------------------------------------------------------ */
/*  UI metadata                                                        */
/* ------------------------------------------------------------------ */

export const DelayNodeUIMeta: NodeUIMeta = {
  nodeType: "delay",
  displayName: "Delay",
  icon: "Timer",
  category: "action",
  description:
    "Pause workflow execution for a fixed duration or until a timestamp",
  fields: {
    mode: {
      label: "Wait mode",
      widget: "select",
      default: "seconds",
      options: [
        { label: "For seconds", value: "seconds" },
        { label: "Until timestamp", value: "until" },
      ],
    },
    seconds: {
      label: "Seconds",
      widget: "number",
      default: 5,
      showWhen: { field: "mode", in: ["seconds"] },
    },
    timestamp: {
      label: "Resume at",
      widget: "dateTimePicker",
      showWhen: { field: "mode", in: ["until"] },
    },
  },
};

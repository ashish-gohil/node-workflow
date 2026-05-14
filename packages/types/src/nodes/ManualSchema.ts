import * as z from "zod";

export const ManualTriggerSchema = z.object({}).passthrough();

export type ManualTrigger = z.infer<typeof ManualTriggerSchema>;

export const ManualTriggerUIMeta = {
  nodeType: "manualTrigger",
  displayName: "Manual Trigger",
  icon: "PlayerPlay",
  category: "trigger",
  description: "Start the workflow manually with optional input data",
  fields: {},
  emptyState: {
    message: "No configuration needed",
    hint: "Paste a JSON object in the Run dialog to inject data into the workflow",
  },
};

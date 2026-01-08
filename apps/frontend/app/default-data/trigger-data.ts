import {
  ManualTriggerDataTypes,
  SchedulerTriggerDataTypes,
  WebhookTriggerDataTypes,
} from "../types/tirggers";

export const DEFAULT_MANUAL_TRIGGER_DATA: ManualTriggerDataTypes = {
  label: "Manual Trigger",
  execution: "initial",
  data: null,
};

export const DEFAULT_SCHEDULER_TRIGGER_DATA: SchedulerTriggerDataTypes = {
  label: "Schedule Trigger",
  description: "Runs workflow on a schedule",
  execution: "initial",
  enabled: true,
  timezone: "UTC",
  config: {
    mode: "interval",
    every: 5,
    unit: "minutes",
  },
};

export const DEFAULT_WEBHOOK_TRIGGER_DATA: WebhookTriggerDataTypes = {
  label: "Webhook Trigger",
  description: "Starts workflow via HTTP request",
  execution: "initial",
  enabled: true,
  config: {
    path: "/webhook",
    methods: ["POST"],
    auth: { type: "none" },
    responseMode: "onReceived",
    timeoutMs: 30000,
  },
};

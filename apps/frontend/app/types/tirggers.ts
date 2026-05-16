import type {
  ManualTrigger,
  SchedulerTrigger,
  WebhookTrigger,
} from "@repo/types";
import { ReactNode } from "react";
import { Node } from "@xyflow/react";

/* ------------------------------------------------------------------ */
/*  Trigger Types                                                      */
/* ------------------------------------------------------------------ */

export enum TriggerNodeTypes {
  ManualTrigger = "manualTrigger",
  SchedulerTrigger = "scheduler",
  Webhook = "webhook",
}

/* ------------------------------------------------------------------ */
/*  Shared Execution Status                                            */
/* ------------------------------------------------------------------ */

export type ExecutionStatus = "loading" | "success" | "error" | "initial";

/* ------------------------------------------------------------------ */
/*  Trigger Sheet Element Object                                       */
/* ------------------------------------------------------------------ */

export interface TriggerSheetElement {
  type: TriggerNodeTypes;
  title?: string;
  label: string;
  description: string;
  icon?: ReactNode;
  requireDataFields: boolean;
}

/* ------------------------------------------------------------------ */
/*  Base Trigger (Generic)                                             */
/* ------------------------------------------------------------------ */

export type BaseTriggerData<TConfig> = {
  execution?: ExecutionStatus;
  label: string;
  description?: string;
  onEdit?: (id: string) => void;
  config: TConfig;
  /** Last captured output from this trigger's most recent execution. */
  output?: unknown;
};

/* ------------------------------------------------------------------ */
/*  Manual Trigger                                                     */
/* ------------------------------------------------------------------ */

export type ManualTriggerDataTypes = BaseTriggerData<ManualTrigger>;

/* ------------------------------------------------------------------ */
/*  Scheduler Trigger                                                  */
/*                                                                    */
/*  Root config comes from @repo/types. Sub-types are derived so      */
/*  existing consumers (Weekday, IntervalUnit, …) keep working.       */
/* ------------------------------------------------------------------ */

export type SchedulerConfig = SchedulerTrigger;
export type SchedulerMode = SchedulerConfig["mode"];
export type IntervalSchedulerConfig = Extract<SchedulerConfig, { mode: "interval" }>;
export type DailySchedulerConfig = Extract<SchedulerConfig, { mode: "daily" }>;
export type WeeklySchedulerConfig = Extract<SchedulerConfig, { mode: "weekly" }>;
export type CronSchedulerConfig = Extract<SchedulerConfig, { mode: "cron" }>;
export type IntervalUnit = IntervalSchedulerConfig["unit"];
export type Weekday = WeeklySchedulerConfig["days"][number];

export type SchedulerTriggerDataTypes = BaseTriggerData<SchedulerConfig>;

/* ------------------------------------------------------------------ */
/*  Webhook Trigger                                                    */
/*                                                                    */
/*  Same pattern — root config is imported, sub-types derived.        */
/* ------------------------------------------------------------------ */

export type WebhookTriggerConfig = WebhookTrigger;
export type WebhookHttpMethod = WebhookTriggerConfig["methods"][number];
export type WebhookAuthConfig = NonNullable<WebhookTriggerConfig["auth"]>;
export type WebhookResponseMode = NonNullable<WebhookTriggerConfig["responseMode"]>;
export type WebhookCustomResponse = NonNullable<WebhookTriggerConfig["customResponse"]>;

export type WebhookTriggerDataTypes = BaseTriggerData<WebhookTriggerConfig>;

/* ------------------------------------------------------------------ */
/*  React Flow Node Types                                              */
/* ------------------------------------------------------------------ */

export type ManualTriggerNodeType = Node<ManualTriggerDataTypes>;
export type SchedulerTriggerNodeType = Node<SchedulerTriggerDataTypes>;
export type WebhookTriggerNodeType = Node<WebhookTriggerDataTypes>;

export type TriggerNodesDataTypes =
  | ManualTriggerDataTypes
  | SchedulerTriggerDataTypes
  | WebhookTriggerDataTypes;

export type TriggerNode =
  | ManualTriggerNodeType
  | SchedulerTriggerNodeType
  | WebhookTriggerNodeType;

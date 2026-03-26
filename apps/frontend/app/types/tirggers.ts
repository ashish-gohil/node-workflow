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
};

/* ------------------------------------------------------------------ */
/*  Manual Trigger                                                     */
/* ------------------------------------------------------------------ */

export type ManualTriggerDataTypes = BaseTriggerData<null>;

/* ------------------------------------------------------------------ */
/*  Scheduler Trigger                                                  */
/* ------------------------------------------------------------------ */

export type SchedulerMode = "interval" | "daily" | "weekly" | "cron";

export type IntervalUnit = "seconds" | "minutes" | "hours";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type IntervalSchedulerConfig = {
  mode: "interval";
  every: number;
  unit: IntervalUnit;
  startAt?: string;
  endAt?: string;
};

export type DailySchedulerConfig = {
  mode: "daily";
  time: string; // hour string 00–23
  startAt?: string;
  endAt?: string;
};

export type WeeklySchedulerConfig = {
  mode: "weekly";
  days: Weekday[];
  time: string;
  startAt?: string;
  endAt?: string;
};

export type CronSchedulerConfig = {
  mode: "cron";
  cronExpression: string;
  timezone?: string;
};

export type SchedulerConfig =
  | IntervalSchedulerConfig
  | DailySchedulerConfig
  | WeeklySchedulerConfig
  | CronSchedulerConfig;

export type SchedulerTriggerDataTypes = BaseTriggerData<SchedulerConfig>;

/* ------------------------------------------------------------------ */
/*  Webhook Trigger                                                    */
/* ------------------------------------------------------------------ */

export type WebhookHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type WebhookAuthConfig =
  | { type: "none" }
  | { type: "basic"; username: string; password: string }
  | { type: "header"; headerName: string; value: string }
  | { type: "query"; paramName: string; value: string };

export type WebhookResponseMode = "onReceived" | "lastNode" | "custom";

export type WebhookCustomResponse = {
  statusCode: number;
  body?: string;
  headers?: Record<string, string>;
};

export type WebhookTriggerConfig = {
  path: string;
  methods: WebhookHttpMethod[];
  auth?: WebhookAuthConfig;
  responseMode?: WebhookResponseMode;
  customResponse?: WebhookCustomResponse;
  allowedIps?: string[];
  timeoutMs?: number;
};

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

export type TriggerNode = ManualTriggerNodeType | SchedulerTriggerNodeType | WebhookTriggerNodeType;

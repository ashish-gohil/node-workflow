/* ------------------------------------------------------------------ */
/*  Shared workflow types — the single source of truth for the        */
/*  workflow document shape across the API, executor, and frontend.   */
/*                                                                    */
/*  Kept here (in @repo/types) instead of @repo/db so the frontend    */
/*  can use these types without pulling Mongoose into the client      */
/*  bundle. @repo/db re-exports them and binds them to its Mongoose   */
/*  schema.                                                           */
/* ------------------------------------------------------------------ */

/* -------------------- Node type enums -------------------- */

export enum ActionNodeTypes {
  HttpRequest = "httpRequest",
  Set = "set",
  If = "if",
  Code = "code",
  Delay = "delay",
  Merge = "merge",
}

export enum TriggerNodeTypes {
  ManualTrigger = "manualTrigger",
  SchedulerTrigger = "scheduler",
  Webhook = "webhook",
}

export type FlowNodeType = ActionNodeTypes | TriggerNodeTypes;

export const FlowTypeValues = [
  ...Object.values(ActionNodeTypes),
  ...Object.values(TriggerNodeTypes),
] as const;

/* -------------------- Workflow-level enums -------------------- */

export type WorkflowStatus = "READY" | "QUEUED" | "PROCESSING" | "FAILED";
export type TriggerType = "CRON" | "WEBHOOK" | "MANUAL";

/* -------------------- Graph node & edge shape -------------------- */

export interface INode {
  id: string;
  name: string;
  nodeType: FlowNodeType;
  type: "trigger" | "action";
  position: { x: number; y: number };
  config: Record<string, unknown>;
  error: string | null;
}

export interface IEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface IWorkflowGraph {
  nodes: INode[];
  edges: IEdge[];
}

/* -------------------- Lock fields -------------------- */

export interface IWorkflowLock {
  lockedAt: Date | null;
  lockId: string | null;
}

/* -------------------- Main workflow document -------------------- */

export interface IWorkflow extends IWorkflowLock {
  workflowId: string;
  name: string;
  userId: string;
  active: boolean;
  version: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  status: WorkflowStatus;
  triggerType: TriggerType;
  graph: IWorkflowGraph;
  cronExpression: string | null;
  webhookId: string | null;
}

/* -------------------- Client → API payloads -------------------- */

/**
 * Body of `POST /workflows` — only the fields the client supplies.
 * The server fills in workflowId, userId, version, status, timestamps,
 * lock fields, and nextRunAt (computed from cronExpression).
 */
export type CreateWorkflowPayload = Pick<
  IWorkflow,
  "name" | "triggerType" | "graph"
> &
  Partial<Pick<IWorkflow, "active" | "cronExpression">>;

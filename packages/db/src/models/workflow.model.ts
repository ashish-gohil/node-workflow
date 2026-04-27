import { Model, Schema, model, models } from "mongoose";

/* -------------------- Enums -------------------- */

// Node types that perform actions — these sit in the middle/end of the DAG
export enum ActionNodeTypes {
  HttpRequest = "httpRequest",
  Set = "set",       // set / transform variables in the context
  If = "if",         // conditional branch — produces "true" or "false" handle
  Code = "code",     // arbitrary JS execution sandbox
  Delay = "delay",   // pause execution for N seconds
  Merge = "merge",   // wait for multiple upstream branches to complete
}

// Node types that start a workflow — every workflow must have exactly one trigger node
export enum TriggerNodeTypes {
  ManualTrigger = "manualTrigger", // kicked off from the UI or API
  SchedulerTrigger = "scheduler",  // cron-based schedule
  Webhook = "webhook",             // inbound HTTP request
}

/* -------------------- Derived union type -------------------- */

// Union of every valid node type — used in INode.nodeType
export type FlowNodeType = ActionNodeTypes | TriggerNodeTypes;

// Convenience array for Mongoose enum validation (avoids duplication)
export const FlowTypeValues = [
  ...Object.values(ActionNodeTypes),
  ...Object.values(TriggerNodeTypes),
] as const;

/* -------------------- Workflow-level types -------------------- */

/**
 * Lifecycle states of a workflow in the poller/queue system.
 *
 * READY      → eligible to be picked up by the cron poller
 * QUEUED     → already pushed onto SQS; poller must skip it to prevent duplicate enqueues
 * PROCESSING → a worker Lambda has claimed it and is actively running
 * FAILED     → last execution ended in an unrecoverable error
 */
export type WorkflowStatus = "READY" | "QUEUED" | "PROCESSING" | "FAILED";

/**
 * What mechanism starts this workflow.
 * Determines which fields are required (cronExpression / webhookId).
 */
export type TriggerType = "CRON" | "WEBHOOK" | "MANUAL";

/* -------------------- Graph node & edge types -------------------- */

/**
 * A single node in the workflow graph.
 *
 * `id`       — stable client-generated ID (nanoid / uuid). Never changes after creation.
 * `nodeType` — the specific node implementation to run (e.g. "httpRequest", "if")
 * `type`     — broad category used by the executor to distinguish the trigger from action nodes
 * `position` — UI-only coordinates; ignored by the execution engine
 * `config`   — node-type-specific parameter bag. May contain expression strings like
 *              {{NodeName.output.field}} that the executor resolves at runtime.
 */
export interface INode {
  id: string;
  nodeType: FlowNodeType;
  type: "trigger" | "action";
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

/**
 * A directed edge connecting two nodes in the graph.
 *
 * `sourceHandle` — which output port the edge leaves from.
 *                  "main" for most nodes; "true" / "false" for IF nodes.
 * `targetHandle` — which input port the edge connects to (usually "main").
 */
export interface IEdge {
  id: string;
  source: string; // nodeId of the upstream node
  target: string; // nodeId of the downstream node
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * The complete workflow graph — nodes + directed edges.
 * Stored as embedded arrays because they are always read and written together.
 */
export interface IWorkflowGraph {
  nodes: INode[];
  edges: IEdge[];
}

/* -------------------- Distributed-lock fields -------------------- */

/**
 * Fields used by the cron poller to claim a workflow for enqueueing
 * without a separate transactions or a distributed lock service.
 *
 * Flow:
 *  1. Poller does findOneAndUpdate({ status: "READY", nextRunAt: { $lte: now } },
 *       { $set: { status: "QUEUED", lockedAt: now, lockId: uuid } })
 *  2. Only the instance that received the updated doc pushes to SQS.
 *  3. Lock is released (status → READY / FAILED) by the executor when the run finishes.
 *  4. A cleanup job resets any workflow stuck in QUEUED/PROCESSING for > 16 min
 *     (handles Lambda crash / missed SQS delivery).
 */
export interface IWorkflowLock {
  lockedAt: Date | null;
  lockId: string | null;
}

/* -------------------- Main workflow interface -------------------- */

export interface IWorkflow extends IWorkflowLock {
  /** Stable external ID — safe to expose in URLs / API responses */
  workflowId: string;

  name: string;

  /** Owner — matches the userId from your auth package */
  userId: string;

  /** Master switch. When false, cron poller and webhook handler skip this workflow */
  active: boolean;

  /**
   * Incremented each time the graph is saved.
   * The execution engine stores this in workflowSnapshot so you can always
   * tell which version of the graph a historical run used.
   */
  version: number;

  /** Timestamps from the last completed execution (any status) */
  lastRunAt: Date | null;

  /**
   * For CRON workflows: the next scheduled wall-clock time to enqueue.
   * Computed from cronExpression after each run. Indexed for poller query.
   * Null for WEBHOOK and MANUAL workflows.
   */
  nextRunAt: Date | null;

  /** Current position in the poller/queue lifecycle — see WorkflowStatus */
  status: WorkflowStatus;

  /** What mechanism starts this workflow */
  triggerType: TriggerType;

  /** The workflow DAG — nodes and edges */
  graph: IWorkflowGraph;

  /**
   * Standard cron expression (5-part: min hour dom month dow).
   * Required when triggerType === "CRON", null otherwise.
   * Example: "0 9 * * 1"  → every Monday at 09:00 UTC
   */
  cronExpression: string | null;

  /**
   * Foreign key → webhook_registrations collection.
   * Required when triggerType === "WEBHOOK", null otherwise.
   */
  webhookId: string | null;
}

/* -------------------- Sub-schemas -------------------- */

const NodeSchema = new Schema<INode>(
  {
    // Client-generated stable ID (nanoid recommended — short, URL-safe, unique)
    id: { type: String, required: true },

    nodeType: {
      type: String,
      required: true,
      enum: FlowTypeValues,
    },

    type: {
      type: String,
      required: true,
      enum: ["trigger", "action"],
    },

    // UI-only — execution engine never reads this
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },

    // Freeform Mixed so every node type can store its own shape without
    // schema migrations when new node types are added
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false } // no separate _id per node — the id field is sufficient
);

const EdgeSchema = new Schema<IEdge>(
  {
    id: { type: String, required: true },

    source: { type: String, required: true },
    target: { type: String, required: true },

    // Optional — defaults to "main" in the execution engine if omitted
    sourceHandle: String,
    targetHandle: String,
  },
  { _id: false }
);

/* -------------------- Workflow Schema -------------------- */

const WorkflowSchema = new Schema<IWorkflow>(
  {
    workflowId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    userId: {
      type: String,
      required: true,
      index: true, // frequent query: "all workflows for this user"
    },

    active: {
      type: Boolean,
      default: false,
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    lastRunAt: {
      type: Date,
      default: null,
    },

    // Indexed — cron poller queries: { active: true, triggerType: "CRON",
    //   status: "READY", nextRunAt: { $lte: now } }
    nextRunAt: {
      type: Date,
      default: null,
      index: true,
    },

    // --- Distributed lock fields (see IWorkflowLock) ---
    lockedAt: {
      type: Date,
      default: null,
    },
    lockId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["READY", "QUEUED", "PROCESSING", "FAILED"] satisfies WorkflowStatus[],
      default: "READY",
      index: true,
    },

    triggerType: {
      type: String,
      required: true,
      enum: ["CRON", "WEBHOOK", "MANUAL"] satisfies TriggerType[],
    },

    // Only populated when triggerType === "CRON"
    cronExpression: {
      type: String,
      default: null,
    },

    // Only populated when triggerType === "WEBHOOK"
    // Stores the webhookId (not _id) from the webhook_registrations collection
    webhookId: {
      type: String,
      default: null,
    },

    graph: {
      nodes: {
        type: [NodeSchema],
        required: true,
        default: [],
      },
      edges: {
        type: [EdgeSchema],
        required: true,
        default: [],
      },
    },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt automatically
    versionKey: false, // disables Mongoose's internal __v field (we use our own `version`)
  }
);

/* -------------------- Compound indexes -------------------- */

// Cron poller hot path — runs every minute via EventBridge
// Finds workflows that are due to run and haven't been claimed yet
WorkflowSchema.index(
  { active: 1, triggerType: 1, status: 1, nextRunAt: 1 },
  { name: "cron_poller_query" }
);

// Cleanup job — finds workflows stuck in QUEUED/PROCESSING after a Lambda crash
WorkflowSchema.index(
  { status: 1, lockedAt: 1 },
  { name: "stuck_workflow_cleanup" }
);

/* -------------------- Singleton Export -------------------- */

export const WorkflowModel: Model<IWorkflow> =
  models.Workflow ?? model<IWorkflow>("Workflow", WorkflowSchema);
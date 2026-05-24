import {
  FlowTypeValues,
  type IEdge,
  type INode,
  type IWorkflow,
  type TriggerType,
  type WorkflowStatus,
} from "@repo/types";
import { Model, Schema, model, models } from "mongoose";

// Re-export the shared workflow types so existing `@repo/db` consumers keep working.
export {
  ActionNodeTypes,
  FlowTypeValues,
  TriggerNodeTypes,
  type CreateWorkflowPayload,
  type FlowNodeType,
  type IEdge,
  type INode,
  type IWorkflow,
  type IWorkflowGraph,
  type IWorkflowLock,
  type TriggerType,
  type WorkflowStatus,
} from "@repo/types";

/* -------------------- Sub-schemas -------------------- */

const NodeSchema = new Schema<INode>(
  {
    // Client-generated stable ID (nanoid recommended — short, URL-safe, unique)
    id: { type: String, required: true },

    name: { type: String, required: true, trim: true },

    error: { type: String, default: null },

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
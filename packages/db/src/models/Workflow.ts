import { Model, Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */
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

export type FlowNodeType =
  | ActionNodeTypes
  | TriggerNodeTypes;

export interface IWorkflow {
  workflowId: string;
  name: string;
  userId: string;
  active: boolean;
  version: number;
  lastRunAt: Date;
  status: "running" | "ideal" | "queued"; // queued is when workflow is already present in queue 
  graph: {
    nodes: Array<{
      id: string;
      nodeType: FlowNodeType;
      position: { x: number; y: number };
      config: Record<string, unknown>;
      type: "trigger" | "action";
      lastExecutedAt: Date;
      executionStatus: "executing" | "ideal" | "queued"
      outputData?: Record<string, unknown>
      inputData?: Record<string, unknown>

    }>;

    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string;
      targetHandle?: string;
    }>;
  };
}

const FlowTypeValues = [
  ...Object.values(ActionNodeTypes),
  ...Object.values(TriggerNodeTypes),
];

/* -------------------- Schema -------------------- */

const NodeSchema = new Schema(
  {
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

    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },

    config: {
      type: Schema.Types.Mixed,
      default: {},
    },

    lastExecutedAt: {
      type: Date,
    },

    executionStatus: {
      type: String,
      enum: ["executing", "ideal", "queued"],
      default: "ideal",
    },

    outputData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    inputData: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);

/* -------------------- Edge Schema -------------------- */

const EdgeSchema = new Schema(
  {
    id: { type: String, required: true },

    source: { type: String, required: true },
    target: { type: String, required: true },

    sourceHandle: String,
    targetHandle: String,
  },
  { _id: false }
);

/* -------------------- Workflow Schema -------------------- */

const WorkflowSchema = new Schema(
  {
    workflowId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },

    active: {
      type: Boolean,
      default: false,
    },

    version: {
      type: Number,
      default: 1,
    },

    lastRunAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["running", "ideal", "queued"],
      default: "ideal",
    },

    graph: {
      nodes: {
        type: [NodeSchema],
        required: true,
      },

      edges: {
        type: [EdgeSchema],
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


/* -------------------- Singleton Export -------------------- */

export const WorkflowModel: Model<IWorkflow> =
  models.Workflow ??
  model<IWorkflow>("Workflow", WorkflowSchema);
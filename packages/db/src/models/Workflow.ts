import { Schema, model, models } from "mongoose";

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

export type FlowType =
  | ActionNodeTypes
  | TriggerNodeTypes;

export interface IWorkflow {
  workflowId: string;
  name: string;
  userId: string;
  active: boolean;
  version: number;

  graph: {
    nodes: Array<{
      id: string;
      type: FlowType;
      position: { x: number; y: number };
      config: Record<string, unknown>;
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

    type: {
      type: String,
      required: true,
      enum: FlowTypeValues,
    },

    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },

    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

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

export const WorkflowModel =
  models.Workflow ??
  model<IWorkflow>("Workflow", WorkflowSchema);
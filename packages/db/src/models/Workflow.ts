import { Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */

export interface WorkflowDocument {
  name: string;
  userId: string;
  active: boolean;
  version: number;

  graph: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: {
        label: string;
        description?: string;
        config: Record<string, unknown>;
      };
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

/* -------------------- Schema -------------------- */

const WorkflowSchema = new Schema<WorkflowDocument>(
  {
    name: { type: String, required: true },
    userId: { type: String, required: true, index: true },

    active: { type: Boolean, default: false },
    version: { type: Number, default: 1 },

    graph: {
      nodes: { type: [Schema.Types.Mixed], required: true },
      edges: { type: [Schema.Types.Mixed], required: true },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* -------------------- Singleton Export -------------------- */

export const WorkflowModel =
  models.Workflow ?? model("Workflow", WorkflowSchema);

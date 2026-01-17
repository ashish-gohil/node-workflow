import { Schema, model, Document } from "mongoose";

export interface IWorkflow extends Document {
  userId: string;
  nodes: any[];
  createdAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
  userId: { type: String, required: true },
  nodes: { type: [], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const WorkflowModel = model<IWorkflow>("Workflow", WorkflowSchema);

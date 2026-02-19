import { model, models } from "mongoose";
import { Schema } from "mongoose";

export interface IExecution {
    userId: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt: Date;
    error: string;
    data: Record<string, unknown>;
}

const ExecutionSchema = new Schema<IExecution>({
    userId: { type: String, required: true, ref: 'User' },
    workflowId: { type: String, ref: 'Workflow', required: true },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], required: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    error: { type: String },
    data: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const ExecutionModel = models.Execution ?? model('Execution', ExecutionSchema);
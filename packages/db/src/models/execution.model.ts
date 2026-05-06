import { Model, Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */

export type ExecutionStatus =
    | "PENDING"
    | "RUNNING"
    | "SUCCESS"
    | "FAILED"
    | "TIMED_OUT"
    | "CANCELLED"
    | "PARTIAL_SUCCESS"; // used when stopAtNodeId is provided (partial run)

export type ExecutionTrigger = "CRON" | "WEBHOOK" | "MANUAL";

export type NodeExecutionStatus =
    | "PENDING"
    | "RUNNING"
    | "SUCCESS"
    | "FAILED"
    | "SKIPPED"; // branch not taken (e.g. IF node false-branch)

export interface INodeError {
    message: string;
    stack?: string;
    code?: string;
}

export interface INodeResult {
    nodeId: string;
    nodeName: string;
    status: NodeExecutionStatus;
    startedAt: Date | null;
    finishedAt: Date | null;
    attempts: number; // how many times this node was attempted (for retries)
    output: Record<string, unknown> | null;
    error: INodeError | null;
}

export interface IExecutionError {
    nodeId: string | null;
    message: string;
}

export interface IInputData {
    body: Record<string, unknown>;
    headers: Record<string, unknown>;
    query: Record<string, unknown>;
}

export interface IExecution {
    executionId: string;
    workflowId: string;

    // Snapshot of the workflow at the time of this run.
    // Ensures execution history remains accurate even if the workflow is later edited.
    workflowSnapshot: Record<string, unknown>;

    // --- Identity & dedup ---
    // For cron: "<workflowId>__<scheduledAt ISO string>"
    // For webhook: "<workflowId>__<webhookRequestId>"
    // For manual: "<workflowId>__<timestamp>"
    idempotencyKey: string;

    triggeredBy: ExecutionTrigger;
    triggeredByUserId: string | null;

    // --- Lifecycle ---
    status: ExecutionStatus;
    startedAt: Date | null;
    finishedAt: Date | null;

    // --- Input that kicked off this run ---
    inputData: IInputData | null;

    // --- Per-node results — keyed by nodeId ---
    nodeResults: Record<string, INodeResult> | null;

    // --- Top-level error summary for quick querying ---
    error: IExecutionError | null;

    // --- Partial execution support ---
    // If set, execution halts after this node completes successfully
    stopAtNodeId: string | null;
}

/* -------------------- Sub-schemas -------------------- */

const NodeErrorSchema = new Schema<INodeError>(
    {
        message: { type: String, required: true },
        stack: String,
        code: String,
    },
    { _id: false }
);

const NodeResultSchema = new Schema<INodeResult>(
    {
        nodeId: { type: String, required: true },
        nodeName: { type: String, required: true },

        status: {
            type: String,
            required: true,
            enum: ["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED"],
            default: "PENDING",
        },

        startedAt: { type: Date, default: null },
        finishedAt: { type: Date, default: null },

        attempts: { type: Number, default: 0 },

        output: { type: Schema.Types.Mixed, default: null },
        error: { type: NodeErrorSchema, default: null },
    },
    { _id: false }
);

const InputDataSchema = new Schema<IInputData>(
    {
        body: { type: Schema.Types.Mixed, default: {} },
        headers: { type: Schema.Types.Mixed, default: {} },
        query: { type: Schema.Types.Mixed, default: {} },
    },
    { _id: false }
);

const ExecutionErrorSchema = new Schema<IExecutionError>(
    {
        nodeId: { type: String, required: true },
        message: { type: String, required: true },
    },
    { _id: false }
);

/* -------------------- Execution Schema -------------------- */

const ExecutionSchema = new Schema<IExecution>(
    {
        executionId: {
            type: String,
            required: true,
            unique: true,
        },

        workflowId: {
            type: String,
            required: true,
            index: true,
        },

        workflowSnapshot: {
            type: Schema.Types.Mixed,
            required: true,
        },

        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
            sparse: true,
        },

        triggeredBy: {
            type: String,
            required: true,
            enum: ["CRON", "WEBHOOK", "MANUAL"],
        },

        triggeredByUserId: {
            type: String,
            default: null,
        },

        status: {
            type: String,
            required: true,
            enum: [
                "PENDING",
                "RUNNING",
                "SUCCESS",
                "FAILED",
                "TIMED_OUT",
                "CANCELLED",
                "PARTIAL_SUCCESS",
            ],
            default: "PENDING",
            index: true,
        },

        startedAt: { type: Date, default: null },
        finishedAt: { type: Date, default: null },

        inputData: {
            type: InputDataSchema,
            default: () => ({ body: {}, headers: {}, query: {} }),
        },

        // Stored as a flat map: { "node_1": { ...INodeResult }, "node_2": { ... } }
        // Map type gives O(1) access by nodeId without array scanning
        nodeResults: {
            type: Map,
            of: NodeResultSchema,
            default: {},
        },

        error: {
            type: ExecutionErrorSchema,
            default: null,
        },

        stopAtNodeId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/* -------------------- Indexes -------------------- */

// Fetch execution history for a workflow, newest first
ExecutionSchema.index({ workflowId: 1, createdAt: -1 });

// Cleanup job: find executions stuck in RUNNING state
ExecutionSchema.index({ status: 1, startedAt: 1 });

/* -------------------- Singleton Export -------------------- */

export const ExecutionModel: Model<IExecution> =
    models.Execution ?? model<IExecution>("Execution", ExecutionSchema);
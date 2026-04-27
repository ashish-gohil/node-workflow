import { Model, Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */

// Stores the last successful output of each node per workflow.
// Injected into node execution context as $prevRunData so nodes can
// implement incremental patterns — e.g. "only fetch records newer than
// the last ID I saw."
//
// Usage inside a Code node:
//   const lastSeenId = $prevRunData?.output?.lastId ?? 0;
//   // fetch records where id > lastSeenId

export interface IPrevRunData {
    workflowId: string;
    nodeId: string;

    // The executionId where this output was produced — useful for debugging
    lastExecutionId: string;

    // Copy of the node's output from its last successful run
    output: Record<string, unknown>;

    // When this record was last updated — equals the finishedAt of the last successful node run
    lastSuccessAt: Date;
}

/* -------------------- Schema -------------------- */

const PrevRunDataSchema = new Schema<IPrevRunData>(
    {
        workflowId: {
            type: String,
            required: true,
        },

        nodeId: {
            type: String,
            required: true,
        },

        lastExecutionId: {
            type: String,
            required: true,
        },

        output: {
            type: Schema.Types.Mixed,
            required: true,
            default: {},
        },

        lastSuccessAt: {
            type: Date,
            required: true,
        },
    },
    {
        // No createdAt needed — lastSuccessAt serves the same purpose.
        timestamps: false,
        versionKey: false,
    }
);

/* -------------------- Indexes -------------------- */

// Primary access pattern: executor upserts this after every successful node run
// and reads it at the start of each node execution
PrevRunDataSchema.index({ workflowId: 1, nodeId: 1 }, { unique: true });

/* -------------------- Singleton Export -------------------- */

export const PrevRunDataModel: Model<IPrevRunData> =
    models.PrevRunData ?? model<IPrevRunData>("PrevRunData", PrevRunDataSchema);
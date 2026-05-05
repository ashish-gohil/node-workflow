import { ExecutionModel, NodeExecutionStatus, PrevRunDataModel } from "@repo/db"
import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver"

interface NodeContextEntry {
    status: NodeExecutionStatus
    output: ResolvedValue | null
    error: string | null
    startedAt: Date | null
    finishedAt: Date | null
}

export class ContextManager {

    // keyed by nodeId — full internal state
    private nodeEntries: Map<string, NodeContextEntry>

    // keyed by nodeName — what ExpressionResolver reads
    private expressionContext: ExecutionContext

    constructor(
        private readonly executionId: string,
        private readonly workflowId: string
    ) {
        this.nodeEntries = new Map()
        this.expressionContext = {}
    }

    getContext(): ExecutionContext {
        return this.expressionContext
    }

    async setNodeStatus(nodeId: string, status: NodeExecutionStatus, timestamps?: Date): Promise<void> {
        // update nodeEntries
        const inMemoryNodeEntry = this.nodeEntries.get(nodeId)
        if (inMemoryNodeEntry) {
            this.nodeEntries.set(nodeId, {
                ...inMemoryNodeEntry, status, startedAt: status === "RUNNING" ? timestamps ? timestamps : null : null,
                finishedAt: (status === "FAILED" || status === "SUCCESS") ? timestamps ? timestamps : null : null,
            })
        } else {
            this.nodeEntries.set(nodeId, {
                status,
                output: null,
                error: null,
                startedAt: status === "RUNNING" ? timestamps ? timestamps : null : null,
                finishedAt: (status === "FAILED" || status === "SUCCESS") ? timestamps ? timestamps : null : null,
            })
        }

        // write to MongoDB execution record
        try {
            if (status === "RUNNING") {
                await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                    $set: {
                        [`nodeResults.${nodeId}.status`]: status,
                        [`nodeResults.${nodeId}.startedAt`]: timestamps
                    }
                })
            }
            if (status === "FAILED" || status === "SUCCESS") {
                await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                    $set: {
                        [`nodeResults.${nodeId}.status`]: status,
                        [`nodeResults.${nodeId}.finishedAt`]: timestamps
                    }
                })
            }
        } catch (err) {
            console.log("status update in execution model failed");
            throw err // this will bubble up at the top and update workflow status
        }
    }

    async setNodeOutput(nodeId: string, nodeName: string, output: ResolvedValue): Promise<void> {
        // update nodeEntries by nodeId
        const inMemoryNodeEntry = this.nodeEntries.get(nodeId)
        // nodeEntries at this point always has one entry for nodeId so no need to create new incase does not exist...
        if (inMemoryNodeEntry) {
            this.nodeEntries.set(nodeId, { ...inMemoryNodeEntry, output })
        }

        // update expressionContext by nodeName  ← different key
        this.expressionContext[nodeName] = { output }

        // write to MongoDB
        try {
            await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                $set: {
                    [`nodeResults.${nodeId}.output`]: output,
                }
            })

        } catch (err) {
            console.log("output update in execution model failed");
            throw err // this will bubble up at the top and update workflow status
        }

    }
    async setNodeError(nodeId: string, error: string): Promise<void> {
        // update nodeEntries
        const inMemoryNodeEntry = this.nodeEntries.get(nodeId)
        if (inMemoryNodeEntry) {
            this.nodeEntries.set(nodeId, {
                ...inMemoryNodeEntry, error,
            })
        }

        try {// write to MongoDB
            await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                $set: {
                    [`nodeResults.${nodeId}.error`]: { message: error },   // node level
                    error: { message: error, nodeId }          // execution level summary
                }
            })
        } catch (err) {
            console.log("setNodeError db update failed");
            throw err // to bubble up at the top
        }
    }

    async upsertPrevRunData(nodeId: string, output: ResolvedValue): Promise<void> {
        // write to PrevRunDataModel — completely separate from context
        try {
            await PrevRunDataModel.findOneAndUpdate(
                { workflowId: this.workflowId, nodeId },
                { $set: { output, lastExecutionId: this.executionId, lastSuccessAt: new Date() } },
                { upsert: true, new: true }
            )
        } catch (err) {
            console.log("Upsert in prev run data failed.")
        }
    }
}
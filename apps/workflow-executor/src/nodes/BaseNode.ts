import { ResolvedValue, ExecutionContext } from "../utils/expression-resolver";
/* -------------------- Meta passed to every execute() call -------------------- */
// Execution-specific data flows through here — never stored on the class itself
// This keeps adapters stateless so the registry can safely reuse one instance
// across multiple concurrent executions



export interface NodeExecutionMeta {
    nodeId: string;
    nodeName: string;    // human-readable name — used in error messages
    workflowId: string;
    executionId: string;
}

/* -------------------- Abstract base -------------------- */
// Every adapter extends this and implements execute()
// NodeRunner always calls adapters through this interface —
// it never imports a concrete class directly

export abstract class BaseNode {
    abstract execute(
        inputs: ResolvedValue,         // node config AFTER expressionResolver has run
        context: ExecutionContext,     // read-only — all previous node outputs
        meta: NodeExecutionMeta        // which execution this belongs to
    ): Promise<ResolvedValue>
}
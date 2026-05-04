// check if registory has node type defined or not

import { FlowNodeType, INode } from "@repo/db";
import { BaseNode, NodeExecutionMeta } from "../nodes/BaseNode";
import { ExecutionContext, expressionResolver, ResolvedValue } from "../utils/expression-resolver";

export class NodeRunner {
    private readonly registory: Record<FlowNodeType, BaseNode>;
    private readonly contextManager: ContextManager;
    private readonly workflowId: string;
    private readonly executionId: string;
    constructor(registory: Record<FlowNodeType, BaseNode>, contextManager: ContextManager, workflowId: string, executionId: string) {
        this.registory = registory;
        this.contextManager = contextManager;
        this.workflowId = workflowId;
        this.executionId = executionId;
    }
    async run(node: INode) {
        try {
            if (!this.registory[node.nodeType]) {
                throw new Error(`Node type ${node.nodeType} not found in registry`);
            }
            const metaData: NodeExecutionMeta = {
                nodeId: node.id,
                nodeName: node.name,
                workflowId: this.workflowId,
                executionId: this.executionId,
            }
            // do expression resolution
            const context: ExecutionContext = this.contextManager.getContext();
            const inputs = expressionResolver(node.config as ResolvedValue, context);

            // make node status running
            await this.contextManager.setNodeStatus(node.id, "RUNNING");

            // call adapter execute method
            const output = await this.registory[node.nodeType].execute(inputs, context, metaData);

            // store node output
            await this.contextManager.setNodeOutput(node.id, output);

            // update prev_run_data with node output
            await this.contextManager.updatePrevRunData(node.id, output);

            await this.contextManager.setNodeStatus(node.id, "SUCCESS");
        } catch (err: any) {
            await this.contextManager.setNodeStatus(node.id, "FAILED");
            await this.contextManager.setNodeError(node.id, err.message);
            throw err;
        }

    }

}
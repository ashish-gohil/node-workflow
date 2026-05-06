import { FlowNodeType, INode } from "@repo/db";
import { BaseNode, NodeExecutionMeta } from "../nodes/BaseNode";
import { ExecutionContext, expressionResolver, ResolvedValue } from "../utils/expression-resolver";
import { ContextManager } from "./ContextManager";

export class NodeRunner {
    private readonly registry: Partial<Record<FlowNodeType, BaseNode>>;
    private readonly contextManager: ContextManager;
    private readonly workflowId: string;
    private readonly executionId: string;
    constructor(registry: Partial<Record<FlowNodeType, BaseNode>>, contextManager: ContextManager, workflowId: string, executionId: string) {
        this.registry = registry;
        this.contextManager = contextManager;
        this.workflowId = workflowId;
        this.executionId = executionId;
    }
    async run(node: INode): Promise<ResolvedValue> {
        console.log("------running node with node-----")
        console.log(node)
        console.log("------running node with node-----")
        try {
            if (!this.registry[node.nodeType]) {
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
            console.log(`---context for node with nodeId ${node.id} and name ${node.name}-------`);
            console.log(context)
            console.log(`---context for node with nodeId ${node.id} and name ${node.name}-------`);


            const inputs = expressionResolver(node.config as ResolvedValue, context);

            console.log(`---inputs for node with nodeId ${node.id} and name ${node.name}-------`);
            console.log(inputs)
            console.log(`---inputs for node with nodeId ${node.id} and name ${node.name}-------`);

            // make node status running
            await this.contextManager.setNodeStatus(node.id, "RUNNING");

            // call adapter execute method
            const output = await this.registry[node.nodeType]!.execute
                (inputs, context, metaData);

            console.log(`---output for node with nodeId ${node.id} and name ${node.name}-------`);
            console.log(output)
            console.log(`---output for node with nodeId ${node.id} and name ${node.name}-------`);

            await this.contextManager.setNodeStatus(node.id, "SUCCESS");

            // store node output
            await this.contextManager.setNodeOutput(node.id, node.name, output);

            // update prev_run_data with node output
            await this.contextManager.upsertPrevRunData(node.id, output);

            return output;
        } catch (err: any) {
            await this.contextManager.setNodeStatus(node.id, "FAILED");
            await this.contextManager.setNodeError(node.id, err.message);
            throw err; // this will be caught by the ExecutionEngine and marked as FAILED
        }

    }

}
import { ActionNodeTypes, ExecutionModel, FlowNodeType, IEdge, INode, WorkflowModel } from "@repo/db";
import { BaseNode } from "../nodes/BaseNode";
import { DAGResolver } from "./DagResolver";
import { ContextManager } from "./ContextManager";
import { NodeRunner } from "./NodeRunner";
import { CronExpressionParser } from 'cron-parser';
import { ResolvedValue } from "../utils/expression-resolver";

export class ExecutionEngine {

    constructor(
        private readonly executionId: string,
        private readonly workflowId: string,
        private readonly nodeRegistry: Partial<Record<FlowNodeType, BaseNode>>
    ) {

    }

    async executeWorkflow() {
        console.log("inside executeWorkflow")
        try {
            // load wf from db
            const workflow = await WorkflowModel.findOne({ workflowId: this.workflowId })
            console.log("---found workflow---");
            console.log(workflow);
            console.log("---found workflow---");

            if (!workflow) {
                throw Error(`Workflow does not exist with id ${this.workflowId}`)
            }

            // load execution and update status to running
            const execution = await ExecutionModel.findOneAndUpdate({ executionId: this.executionId, status: "PENDING" }, {
                $set: {
                    status: "RUNNING"
                }
            })

            if (!execution) {
                // execution is already in progrss by another lambda
                return
            }

            // update workflow status to processing, so no other poller can poll it and put in queue again
            const wfFromDb = await WorkflowModel.findOneAndUpdate({ workflowId: this.workflowId }, {
                $set: {
                    status: "PROCESSING"
                }
            })

            // get nodes and edges from execution (workflowSnapshot)
            const nodes: INode[] = execution.workflowSnapshot.nodes as INode[]
            const edges: IEdge[] = execution.workflowSnapshot.edges as IEdge[]

            console.log("----wfFromDb------");
            console.log(wfFromDb);
            console.log("----wfFromDb------");

            console.log("------nodes from workflow Snapshot------");
            console.log(nodes)
            console.log("------nodes from workflow Snapshot------");
            console.log("------edges from workflow Snapshot------")
            console.log(edges)
            console.log("------edges from workflow Snapshot------")

            // create nodeTiers
            const dagResolver = new DAGResolver(nodes, edges)
            const nodeTiers = dagResolver.resolve();

            console.log("--node tiers after DAG resolve---")
            console.log(nodeTiers)
            console.log("--node tiers after DAG resolve---")

            // set up context
            const contextManager = new ContextManager(this.executionId, this.workflowId)

            // set up node runner
            const nodeRunner = new NodeRunner(this.nodeRegistry, contextManager, this.workflowId, this.executionId)

            // ── Branching support ─────────────────────────────────────
            // A node runs only if it's a root OR at least one incoming edge
            // is "live". An edge becomes live when its source node completes
            // AND (for IF nodes) the edge's sourceHandle matches the result.
            // Nodes that never become reachable are marked SKIPPED.
            const incomingEdges: Record<string, IEdge[]> = {};
            for (const node of nodes) incomingEdges[node.id] = [];
            for (const edge of edges) incomingEdges[edge.target]?.push(edge);

            const liveEdgeIds = new Set<string>();

            const isIfNode = (n: INode) => n.nodeType === ActionNodeTypes.If;

            const activateOutgoingEdges = (node: INode, output: ResolvedValue) => {
                const outgoing = edges.filter(e => e.source === node.id);
                if (isIfNode(node)) {
                    const passed = (output as { passed?: boolean })?.passed === true;
                    for (const e of outgoing) {
                        // Edges with a true/false handle are gated by the result;
                        // edges with no handle (legacy graphs) stay live.
                        if (e.sourceHandle === "true") {
                            if (passed) liveEdgeIds.add(e.id);
                        } else if (e.sourceHandle === "false") {
                            if (!passed) liveEdgeIds.add(e.id);
                        } else {
                            liveEdgeIds.add(e.id);
                        }
                    }
                } else {
                    for (const e of outgoing) liveEdgeIds.add(e.id);
                }
            };

            // loop over each tier and run runnable nodes in parallel via Promise.allSettled
            for (const tier of nodeTiers) {
                const tierNodes = tier.map(nodeId => nodes.find(n => n.id === nodeId)!);

                const runnable: INode[] = [];
                const skipped: INode[] = [];
                for (const node of tierNodes) {
                    const incoming = incomingEdges[node.id];
                    const isReachable =
                        incoming.length === 0 || incoming.some(e => liveEdgeIds.has(e.id));
                    if (isReachable) runnable.push(node);
                    else skipped.push(node);
                }

                // Mark skipped nodes so the execution record reflects the branch decision
                for (const node of skipped) {
                    await contextManager.setNodeStatus(node.id, "SKIPPED");
                }

                const results = await Promise.allSettled(
                    runnable.map(node => nodeRunner.run(node))
                );
                console.log("-------results after all settled run-------")
                console.log(results)
                console.log("-------results after all settled run-------")

                const failed = results.find(r => r.status === "rejected")
                if (failed) {
                    throw (failed as PromiseRejectedResult).reason
                }

                // Activate outgoing edges for nodes that ran successfully
                for (let i = 0; i < runnable.length; i++) {
                    const result = results[i];
                    if (result.status === "fulfilled") {
                        activateOutgoingEdges(runnable[i], result.value);
                    }
                }
            }

            // mark execution success
            await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                $set: {
                    status: "SUCCESS"
                }
            })

            // update workflow status to ready again and set next run
            const update: any = {
                status: "READY",
            };

            if (workflow.triggerType === "CRON" && workflow.cronExpression) {
                // CRON: lastRunAt was already stamped by SchedulerTriggerNode at
                // trigger time, so we only need to compute the next scheduled run.
                const cronExpression = workflow.cronExpression;
                const interval = CronExpressionParser.parse(cronExpression);
                const nextRun = interval.next().toDate();
                update.nextRunAt = nextRun;
            } else {
                // MANUAL/WEBHOOK triggers don't have a per-trigger lastRunAt
                // writer, so the engine stamps it on completion as a fallback.
                update.lastRunAt = new Date();
            }

            await WorkflowModel.findOneAndUpdate(
                { workflowId: this.workflowId },
                { $set: update }
            );


        } catch (err: any) {

            console.log("----failed inside executeWorkflow------")
            console.log(err)
            console.log("----failed inside executeWorkflow------")
            // mark execution failled with error
            await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                $set: {
                    status: "FAILED",
                    error: {
                        message: err?.message || "something went wrong"
                    }
                }
            })
            await WorkflowModel.findOneAndUpdate({ workflowId: this.workflowId },
                {
                    $set: {
                        status: "FAILED"
                    }
                }
            )
        }
    }

}
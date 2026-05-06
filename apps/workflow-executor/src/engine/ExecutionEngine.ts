import { ExecutionModel, FlowNodeType, IEdge, INode, WorkflowModel } from "@repo/db";
import { BaseNode } from "../nodes/BaseNode";
import { DAGResolver } from "./DagResolver";
import { ContextManager } from "./ContextManager";
import { NodeRunner } from "./NodeRunner";
import { CronExpressionParser } from 'cron-parser';

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

            // loop over each tier and run nodes in parallel using promiss.allSettled
            for (const tier of nodeTiers) {
                const tierNodes = tier.map(nodeId =>
                    nodes.find(n => n.id === nodeId)!
                )

                const results = await Promise.allSettled(
                    tierNodes.map(node => nodeRunner.run(node))
                );
                console.log("-------results after all settled run-------")
                console.log(results)
                console.log("-------results after all settled run-------")

                const failed = results.find(r => r.status === "rejected")
                if (failed) {
                    throw (failed as PromiseRejectedResult).reason
                }
            }

            // mark execution success
            await ExecutionModel.findOneAndUpdate({ executionId: this.executionId }, {
                $set: {
                    status: "SUCCESS"
                }
            })

            // update workflow status too ready again and set last run and next run
            const update: any = {
                lastRunAt: new Date(),
                status: "READY",
            };

            if (workflow.triggerType === "CRON" && workflow.cronExpression) {

                const cronExpression = workflow.cronExpression;
                const interval = CronExpressionParser.parse(cronExpression);
                const nextRun = interval.next().toDate();
                update.nextRunAt = nextRun;
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
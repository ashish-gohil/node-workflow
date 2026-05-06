import { SQSEvent } from 'aws-lambda';
import { ExecutionEngine } from './engine/ExecutionEngine';
import { nodeRegistry } from './nodes';
import { connectMongo } from '@repo/db';


export const handler = async (event: SQSEvent) => {

    connectMongo();

    const workflows: { workflowId: string; executionId: string }[] = event.Records.map(record => JSON.parse(record.body));
    console.log("-------workflowsToBeExecuted-------");
    console.log(workflows);
    console.log("-------workflowsToBeExecuted-------");
    if (workflows.length > 0) {
        for (const wf of workflows) {
            const executionEngine = new ExecutionEngine(wf.executionId, wf.workflowId, nodeRegistry)
            console.log(`Executing workflow with workflowId, ${wf.workflowId} and executionId, ${wf.executionId}`)
            await executionEngine.executeWorkflow();
        }
    }

    return {
        success: true
    };
};

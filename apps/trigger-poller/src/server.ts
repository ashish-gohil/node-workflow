import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { connectMongo, WorkflowModel } from "@repo/db";

const sqs = new SQSClient({
    region: "ap-south-1",
});

const QUEUE_URL = process.env.QUEUE_URL!;

export const handler = async () => {
    console.log("Polling workflows...");
    connectMongo();
    const readyWorkflows = await WorkflowModel.find({ active: true, status: "ideal" });
    console.log(readyWorkflows)
    // Example logic
    // const readyWorkflows = [
    //     { workflowId: "wf_1" },
    //     { workflowId: "wf_2" },
    // ];

    for (const workflow of readyWorkflows) {
        await sqs.send(
            new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: JSON.stringify(workflow),
            })
        );

        console.log("Queued workflow:", workflow.workflowId);
    }

    return { success: true };
};
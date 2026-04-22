import { SQSClient, SendMessageBatchCommand, } from "@aws-sdk/client-sqs";
import { connectMongo, WorkflowModel } from "@repo/db";

const sqs = new SQSClient({
    region: "ap-south-1",
});

const QUEUE_URL = process.env.QUEUE_URL!;

export const handler = async () => {
    console.log("Polling workflows...");
    connectMongo();

    // un-lock workflows which are frizzed/locked before 5 mins(might bee lambda crashees and it make worrkflows only locked and not put in queue)
    const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 min

    await WorkflowModel.updateMany(
        {
            status: "PROCESSING",
            lockedAt: { $lt: new Date(Date.now() - LOCK_TIMEOUT) }
        },
        {
            $set: {
                status: "READY",
                lockedAt: null,
                lockId: null
            }
        }
    );


    const now = new Date();
    const lockId = crypto.randomUUID();
    const lockedWfs = [];
    // check which all workflows are reedy to be executed based on nextRunAt and status, and put in a queue and mark them as queued.
    const activeWorkflows = await WorkflowModel.find({
        active: true,
        status: "READY",
        nextRunAt: { $lte: now },
    }).limit(100);

    // first lock the workflows and then put in queue
    for (const wf of activeWorkflows) {
        const lockedWf = await WorkflowModel.findOneAndUpdate(
            {
                workflowId: wf.workflowId,
                status: "READY",
            },
            {
                $set: {
                    status: "PROCESSING",
                    lockedAt: now,
                    lockId,
                },
            },
            {
                returnDocument: 'after'
            }
        );

        if (lockedWf) {
            lockedWfs.push(lockedWf);
        }
    }

    const wfBatch = lockedWfs.map((wf) => ({
        Id: wf._id.toString(),
        MessageBody: JSON.stringify({
            workflowId: wf.workflowId
        }),
        MessageGroupId: "trigger-poller-events"

    })
    )
    const command = new SendMessageBatchCommand({
        QueueUrl: QUEUE_URL,
        Entries: wfBatch,

    });
    const response = await sqs.send(command);
    console.log("response from sqs")
    console.log(response)


    return { success: true };

}



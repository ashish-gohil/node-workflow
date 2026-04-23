import { SQSClient, SendMessageBatchCommand, } from "@aws-sdk/client-sqs";
import { connectMongo, WorkflowModel } from "@repo/db";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const sqs = new SQSClient({
    region: "ap-south-1",
});

// find workflows which should run now based on cron/nextRunAt and push it to queue
export const handler = async () => {
    console.log("Polling workflows...");
    connectMongo();

    const ssm = new SSMClient({});
    const ssmParamName = process.env.QUEUE_URL_PATH!;

    if (!ssmParamName) {
        throw new Error(
            "QUEUE_URL is not defined in environment variables"
        );
    }

    console.log("Fetching QUEUE URL from AWS SSM:", ssmParamName);

    const ssmRes = await ssm.send(
        new GetParameterCommand({
            Name: ssmParamName,
            WithDecryption: true,
        })
    );

    const queueUrl = ssmRes.Parameter?.Value;
    if (!queueUrl) {
        throw new Error(`SSM parameter "${ssmParamName}" has no value`);
    }


    const QUEUE_URL = queueUrl;

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
    console.log("----active workflows-----")
    console.log(activeWorkflows)
    console.log("----active workflows-----")


    // first lock the workflows and then put in queue
    for (const wf of activeWorkflows) {
        console.log("wf in for loop");
        console.log(wf)
        console.log("wf in for loop");

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
            console.log("-----updated locked wf-------")
            lockedWfs.push(lockedWf);
            console.log("-----updated locked wf-------")
        }
    }
    console.log("--------locked workflows--------")
    console.log(lockedWfs)
    console.log("--------locked workflows--------")

    const wfBatch = lockedWfs.map((wf) => ({
        Id: wf._id.toString(),
        MessageBody: JSON.stringify({
            workflowId: wf.workflowId
        }),
        MessageGroupId: "trigger-poller-events"

    })
    )
    if (wfBatch.length > 0) {
        const command = new SendMessageBatchCommand({
            QueueUrl: QUEUE_URL,
            Entries: wfBatch,

        });
        const response = await sqs.send(command);
        console.log("response from sqs")
        console.log(response)
    }

    return { success: true };

}



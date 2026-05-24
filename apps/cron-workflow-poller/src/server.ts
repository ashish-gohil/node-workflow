import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { connectMongo, ExecutionModel, WorkflowModel, type IExecution } from "@repo/db";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const sqs = new SQSClient({
  region: "ap-south-1",
});

// find workflows which should run now based on cron/nextRunAt and push it to queue
export const handler = async () => {
  console.log("Polling workflows...");
  await connectMongo();

  const ssm = new SSMClient({});
  const ssmParamName = process.env.QUEUE_URL_PATH!;

  if (!ssmParamName) {
    throw new Error("QUEUE_URL is not defined in environment variables");
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
      lockedAt: { $lt: new Date(Date.now() - LOCK_TIMEOUT) },
    },
    {
      $set: {
        status: "READY",
        lockedAt: null,
        lockId: null,
      },
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
  console.log("----active workflows-----");
  console.log(activeWorkflows);
  console.log("----active workflows-----");

  // first lock the workflows and then put in queue
  for (const wf of activeWorkflows) {
    console.log("wf in for loop");
    console.log(wf);
    console.log("wf in for loop");

    const lockedWf = await WorkflowModel.findOneAndUpdate(
      {
        workflowId: wf.workflowId,
        status: "READY",
      },
      {
        $set: {
          status: "QUEUED",
          lockedAt: now,
          lockId,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (lockedWf) {
      console.log("-----updated locked wf-------");
      lockedWfs.push(lockedWf);
      console.log("-----updated locked wf-------");
    }
  }
  console.log("--------locked workflows--------");
  console.log(lockedWfs);
  console.log("--------locked workflows--------");

  // For each locked workflow, create a PENDING Execution document that the
  // executor will pick up via { workflowId, executionId } from SQS.
  // The execution carries a snapshot of the workflow graph so subsequent
  // edits to the workflow don't affect an in-flight run.
  const queueEntries: { workflowId: string; executionId: string; dedupeId: string }[] = [];

  for (const wf of lockedWfs) {
    // idempotencyKey pattern (per execution.model.ts): "<workflowId>__<scheduledAt ISO>"
    // We use the workflow's nextRunAt — the moment it was *supposed* to fire —
    // so two pollers covering the same tick can't double-create an execution.
    const scheduledAt = wf.nextRunAt ?? now;
    const idempotencyKey = `${wf.workflowId}__${scheduledAt.toISOString()}`;
    const executionId = crypto.randomUUID();

    try {
      const execDoc: Partial<IExecution> = {
        executionId,
        workflowId: wf.workflowId,
        workflowSnapshot: { nodes: wf.graph.nodes, edges: wf.graph.edges },
        idempotencyKey,
        triggeredBy: "CRON",
        triggeredByUserId: null,
        status: "PENDING",
        inputData: { body: {}, headers: {}, query: {} },
      };
      await ExecutionModel.create(execDoc);
      queueEntries.push({
        workflowId: wf.workflowId,
        executionId,
        dedupeId: wf._id.toString(),
      });
    } catch (e: any) {
      // Duplicate idempotencyKey → another poller already created this execution.
      // Release our lock so the workflow can be picked up on its next nextRunAt.
      if (e?.code === 11000) {
        console.log(`Skipping duplicate execution for workflow ${wf.workflowId}`);
        await WorkflowModel.updateOne(
          { workflowId: wf.workflowId, lockId },
          { $set: { status: "READY", lockedAt: null, lockId: null } }
        ).catch(() => {});
        continue;
      }
      throw e;
    }
  }

  // SQS SendMessageBatch caps at 10 entries — chunk before sending.
  for (let i = 0; i < queueEntries.length; i += 10) {
    const chunk = queueEntries.slice(i, i + 10);
    const command = new SendMessageBatchCommand({
      QueueUrl: QUEUE_URL,
      Entries: chunk.map((e) => ({
        Id: e.dedupeId,
        MessageBody: JSON.stringify({
          workflowId: e.workflowId,
          executionId: e.executionId,
        }),
        MessageGroupId: "trigger-poller-events",
      })),
    });
    const response = await sqs.send(command);
    console.log("response from sqs");
    console.log(response);

    // If SQS rejected any messages, roll back: delete the execution + release
    // the workflow lock so the next poll tick can retry.
    if (response.Failed && response.Failed.length > 0) {
      const failedIds = new Set(response.Failed.map((f) => f.Id));
      const failedEntries = chunk.filter((e) => failedIds.has(e.dedupeId));
      for (const fe of failedEntries) {
        await ExecutionModel.deleteOne({ executionId: fe.executionId }).catch(() => {});
        await WorkflowModel.updateOne(
          { workflowId: fe.workflowId, lockId },
          { $set: { status: "READY", lockedAt: null, lockId: null } }
        ).catch(() => {});
      }
    }
  }

  return { success: true };
};

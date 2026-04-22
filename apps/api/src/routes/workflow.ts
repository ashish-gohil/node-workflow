import { Router } from "express";
import { connectMongo, WorkflowModel, type IWorkflow } from "@repo/db";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const router: Router = Router();
/**
 * GET all workflows for authenticated user
 */
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await connectMongo();

    const workflows: IWorkflow[] = await WorkflowModel.find({ userId }).exec();
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST create a new workflow
 */
router.post("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await connectMongo();

    const workflowData = req.body as Partial<IWorkflow>; // type-safe request body
    const workflow: IWorkflow = await WorkflowModel.create({
      userId,
      ...workflowData
    });

    res.status(201).json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST run a workflow(manual trigger..)
 */
router.post("/:id/run", authMiddleware, async (req: AuthenticatedRequest, res) => {
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
  const sqs = new SQSClient({ region: "ap-south-1" });
  const QUEUE_URL = queueUrl
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    await connectMongo();

    const workflowId = req.params.id;

    if (!workflowId) {
      return res.status(400).json({
        success: false,
        message: "Workflow ID is required",
      });
    }

    const now = new Date();
    const lockId = crypto.randomUUID();

    // Try locking workflow
    const lockedWf = await WorkflowModel.findOneAndUpdate(
      {
        workflowId,
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

    if (!lockedWf) {
      return res.status(409).json({
        success: false,
        message: "Workflow is already running or not in a runnable state",
      });
    }

    // Push to SQS
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({
        workflowId,
      }),
      MessageGroupId: "api-events"
    });

    const response = await sqs.send(command);

    if (!response?.MessageId) {
      // rollback lock if queue push fails
      await WorkflowModel.updateOne(
        { workflowId, lockId },
        {
          $set: {
            status: "READY",
            lockedAt: null,
            lockId: null,
          },
        }
      );

      return res.status(500).json({
        success: false,
        message: "Failed to enqueue workflow for execution",
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      message: "Workflow execution triggered successfully",
      data: {
        workflowId,
        messageId: response.MessageId,
      },
    });
  } catch (err: any) {
    console.error("Manual trigger error:", {
      error: err?.message,
      stack: err?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unexpected server error",
      error: err?.message || "Unknown error",
    });
  }
});

export default router;

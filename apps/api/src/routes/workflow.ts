import { Router } from "express";
import {
  connectMongo,
  TriggerNodeTypes,
  WebhookRegistrationModel,
  WorkflowModel,
  type INode,
  type IWebhookRegistration,
  type IWorkflow,
  type WebhookHttpMethod,
} from "@repo/db";
import type { SchedulerTrigger, TriggerType, WebhookTrigger } from "@repo/types";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

/* ------------------------------------------------------------------ */
/*  Scheduler config → standard 5-part cron expression                */
/*  Layout: "minute hour day-of-month month day-of-week"              */
/* ------------------------------------------------------------------ */

const DAY_OF_WEEK_TO_CRON: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getCronExpression(triggerNode: INode): string {
  const cfg = triggerNode.config as Partial<SchedulerTrigger> | undefined;
  if (!cfg || !cfg.mode) {
    throw new Error("Scheduler trigger is missing a mode");
  }

  switch (cfg.mode) {
    case "interval": {
      const every = cfg.every ?? 1;
      switch (cfg.unit) {
        // Standard cron has minute granularity — sub-minute intervals fire every minute.
        case "seconds":
          return "* * * * *";
        case "minutes":
          return `*/${every} * * * *`;
        case "hours":
          return `0 */${every} * * *`;
        default:
          throw new Error(`Unsupported interval unit: ${cfg.unit}`);
      }
    }

    case "daily": {
      const [hh, mm] = (cfg.time ?? "00:00").split(":");
      return `${Number(mm)} ${Number(hh)} * * *`;
    }

    case "weekly": {
      const [hh, mm] = (cfg.time ?? "00:00").split(":");
      const days = ((cfg.days as string[] | undefined) ?? [])
        .map((d: string) => DAY_OF_WEEK_TO_CRON[d])
        .filter((d): d is number => d !== undefined)
        .join(",");
      if (!days) throw new Error("Weekly schedule requires at least one day");
      return `${Number(mm)} ${Number(hh)} * * ${days}`;
    }

    case "cron":
      if (!cfg.cronExpression) throw new Error("Cron expression is required");
      return cfg.cronExpression;

    default:
      throw new Error(`Unsupported scheduler mode: ${(cfg as { mode: string }).mode}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Webhook config → registration document shape                      */
/* ------------------------------------------------------------------ */

function resolveHttpMethod(methods: WebhookTrigger["methods"] | undefined): WebhookHttpMethod {
  if (!methods || methods.length === 0) return "POST";
  if (methods.length > 1) return "ANY";
  const single = methods[0];
  // WebhookTrigger allows HEAD/OPTIONS too, but the registration model only stores
  // the limited set — collapse anything outside that to ANY.
  return (["GET", "POST", "PUT", "PATCH", "DELETE"] as const).includes(single as never)
    ? (single as WebhookHttpMethod)
    : "ANY";
}

function normalizeWebhookPath(raw: string | undefined, fallback: string): string {
  const p = (raw ?? "").trim().replace(/^\/+/, "").toLowerCase();
  return p || fallback;
}

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

    const workflowData = req.body as Partial<IWorkflow>;
    const triggerNode = workflowData.graph?.nodes.find((node) => node.type === "trigger");

    const triggerType: TriggerType =
      triggerNode?.nodeType === TriggerNodeTypes.Webhook
        ? "WEBHOOK"
        : triggerNode?.nodeType === TriggerNodeTypes.SchedulerTrigger
          ? "CRON"
          : "MANUAL";

    const workflowId = crypto.randomUUID();

    let cronExpression: string | null = null;
    if (triggerType === "CRON") {
      if (!triggerNode) return res.status(400).json({ error: "Scheduler trigger node missing" });
      try {
        cronExpression = getCronExpression(triggerNode);
      } catch (e) {
        return res.status(400).json({ error: (e as Error).message });
      }
    }

    // Register the webhook BEFORE the workflow so a duplicate-path collision fails
    // fast and we don't leave an orphan workflow without a registration.
    let webhookId: string | null = null;
    let createdWebhookId: string | null = null;
    if (triggerType === "WEBHOOK") {
      if (!triggerNode) return res.status(400).json({ error: "Webhook trigger node missing" });
      const cfg = (triggerNode.config ?? {}) as Partial<WebhookTrigger>;
      const path = normalizeWebhookPath(cfg.path, workflowId);

      const registration: Partial<IWebhookRegistration> = {
        webhookId: crypto.randomUUID(),
        workflowId,
        userId,
        path,
        httpMethod: resolveHttpMethod(cfg.methods),
        isActive: true,
        secret: null,
        allowedIps: cfg.allowedIps ?? [],
      };

      try {
        const created = await WebhookRegistrationModel.create(registration);
        webhookId = created.webhookId;
        createdWebhookId = created.webhookId;
      } catch (e: any) {
        if (e?.code === 11000) {
          return res.status(409).json({ error: `Webhook path "${path}" is already in use` });
        }
        throw e;
      }
    }

    try {
      const workflow: IWorkflow = await WorkflowModel.create({
        userId,
        ...workflowData,
        workflowId,
        triggerType,
        cronExpression,
        webhookId,
      });
      res.status(201).json(workflow);
    } catch (err) {
      // Roll back the webhook registration if the workflow itself failed to persist.
      if (createdWebhookId) {
        await WebhookRegistrationModel.deleteOne({ webhookId: createdWebhookId }).catch(() => {});
      }
      throw err;
    }
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
  const sqs = new SQSClient({ region: "ap-south-1" });
  const QUEUE_URL = queueUrl;
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
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
        returnDocument: "after",
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
      MessageGroupId: "api-events",
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

import { Router } from "express";
import { connectMongo, WorkflowModel, type IWorkflow } from "@repo/db";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth";

const router: Router = Router();
/**
 * GET all workflows for authenticated user
 */
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    console.log(userId)
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
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    await connectMongo();

    const workflowData = req.body as Partial<IWorkflow>; // type-safe request body
    const workflow: IWorkflow = await WorkflowModel.create({
      userId,
      ...workflowData,
    });

    res.status(201).json(workflow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

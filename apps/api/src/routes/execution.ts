import { AuthenticatedRequest, authMiddleware } from "@repo/auth";
import { connectMongo, IExecution, ExecutionModel, WorkflowModel } from "@repo/db";
import { Router } from "express";

const router: Router = Router()

router.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.id;
        console.log(userId)
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        await connectMongo();

        const executions: IExecution[] = await ExecutionModel.find({ userId }).exec();
        res.json(executions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
})

router.post("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        await connectMongo();

        const body: IExecution = req.body;

        //Validate workflowId exists in requests
        if (!body.workflowId) {
            return res.status(400).json({
                error: "workflowId is required",
            });
        }

        // Check if workflow exists
        const workflowExists = await WorkflowModel.exists({
            _id: body.workflowId,
        });

        if (!workflowExists) {
            return res.status(400).json({
                error: "Invalid workflowId. Workflow does not exist.",
            });
        }

        // Create execution
        const execution = await ExecutionModel.create({
            ...body,
            userId: req.user.id,
            status: body.status ?? "pending",
            startedAt: body.startedAt ?? new Date(),
        });

        return res.status(201).json({ execution });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Server error",
        });
    }
});

export default router;
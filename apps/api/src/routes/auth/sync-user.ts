import { Router } from "express";
import { connectMongo, UserModel } from "@repo/db";
import { authMiddleware, type AuthenticatedRequest } from "../../middlewares/auth.js";

const router: Router = Router();

/**
 * POST /auth/sync
 * Called after successful OAuth login
 */
router.post("/sync-user", authMiddleware, async (req: AuthenticatedRequest, res) => {
    const { email, name, image, provider } = req.body as {
        email: string;
        name?: string;
        image?: string;
        provider: "google" | "github" | string;
    };

    if (!email || !provider) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    await connectMongo();

    let user = await UserModel.findOne({ email });

    if (!user) {
        user = await UserModel.create({
            email,
            name,
            image,
            provider,
        });
    }

    res.json({
        id: user._id.toString(),
        email: user.email,
    });
});

export default router;

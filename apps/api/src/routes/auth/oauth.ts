import { Router } from "express";
import { connectMongo, UserModel } from "@repo/db";

const router: Router = Router();

router.post("/oauth", async (req, res) => {
    const { email, name, image, provider } = req.body as {
        email: string;
        name?: string;
        image?: string;
        provider: "google";
    };

    await connectMongo();

    let user = await UserModel.findOne({ email, provider });

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
        name: user.name,
        image: user.image,
    });
});

export default router;

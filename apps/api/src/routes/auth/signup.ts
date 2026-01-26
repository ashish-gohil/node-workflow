import { Router } from "express";
import bcrypt from "bcryptjs";
import { connectMongo, UserModel } from "@repo/db";

const router: Router = Router();

router.post("/signup", async (req, res) => {
    const { email, password, name } = req.body as {
        email: string;
        password: string;
        name?: string;
    };

    if (!email || !password) {
        return res.status(400).json({ error: "Missing fields" });
    }

    await connectMongo();

    const exists = await UserModel.findOne({ email });
    if (exists) {
        return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
        email,
        passwordHash,
        name,
        provider: "credentials",
    });

    res.status(201).json({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
    });
});

export default router;

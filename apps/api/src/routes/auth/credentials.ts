import { Router } from "express";
import bcrypt from "bcryptjs";
import { connectMongo, UserModel, } from "@repo/db";
import jwt from "jsonwebtoken"

const router: Router = Router();

router.post("/credentials", async (req, res) => {
    const { email, password } = req.body as {
        email: string;
        password: string;
    };

    await connectMongo();

    const user = await UserModel.findOne({ email, provider: "credentials" })


    if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        accessToken: jwt.sign({ id: user._id.toString(), email: user.email, }, process.env.JWT_SECRET!)
    });
});

export default router;

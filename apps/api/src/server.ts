import express, { type Request, type Response } from 'express'
import serverless from 'serverless-http'
import workflowRoutes from './routes/workflow.js'
import authRoutes from "./routes/auth/index.js";

const app = express()
app.use(express.json())

app.use('/workflows', workflowRoutes)
app.use("/auth", authRoutes);

app.get("/health", (req: Request, res: Response) => {
    console.log(req.body);
    res.status(200).json({ message: "Success" })
})

export const server = serverless(app)

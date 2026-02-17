import express, { type Request, type Response, type Express } from 'express'
import workflowRoutes from './routes/workflow'
import authRoutes from "./routes/auth/index"

console.log("index.ts called")
const app: Express = express()
app.use(express.json())

app.use('/workflows', workflowRoutes)
app.use("/auth", authRoutes)

app.get("/health", (req: Request, res: Response) => {
    console.log(req.body)
    res.status(200).json({ message: "Success" })
})

export default app
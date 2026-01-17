import express from 'express'
import serverless from 'serverless-http'
import workflowRoutes from './routes/workflow'

const app = express()
app.use(express.json())

app.use('/workflows', workflowRoutes)

export const server = serverless(app)

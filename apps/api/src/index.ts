import { type APIGatewayProxyHandler } from 'aws-lambda'
import { server } from './server'

export const handler: APIGatewayProxyHandler = server

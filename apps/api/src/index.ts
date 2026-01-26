import type { Handler } from "aws-lambda";
import { server } from "./server.js";

export const handler: Handler = server;

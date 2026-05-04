// src/nodes/HttpRequestNode.ts

import { ResolvedValue, ExecutionContext } from "../utils/expression-resolver";
import { BaseNode, NodeExecutionMeta } from "./BaseNode";

/* -------------------- Types -------------------- */

// Shape of the resolved config this node expects as `inputs`
// By the time execute() is called, all {{}} tokens are already substituted
interface HttpRequestInputs {
    url: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeoutMs?: number;   // optional per-node override, defaults to 10_000
}

// Shape of what this node returns — stored in executionContext under this node's name
// Downstream nodes access it via {{Fetch Customer.output.statusCode}} etc.
export interface HttpRequestOutput {
    statusCode: number;
    body: unknown;         // parsed JSON object, or raw string if not JSON
    headers: Record<string, string>;
    ok: boolean;           // true if statusCode is 2xx — convenience field
}

/* -------------------- Errors -------------------- */

export class HttpRequestError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number | null,  // null if network error (no response)
        public readonly response: HttpRequestOutput | null,
        public readonly retryable: boolean
    ) {
        super(message)
        this.name = "HttpRequestError"
        Object.setPrototypeOf(this, new.target.prototype)
    }
}

/* -------------------- Node -------------------- */

export class HttpRequestNode extends BaseNode {

    async execute(
        inputs: ResolvedValue,
        _context: ExecutionContext,    // HttpRequest doesn't need previous outputs
        meta: NodeExecutionMeta        // used in error messages
    ): Promise<ResolvedValue> {

        // Cast to the expected shape — by the time we're here,
        // expressionResolver has already substituted all {{}} tokens
        const config = inputs as unknown as HttpRequestInputs
        // Validate required fields — these should always be present if the
        // workflow was built correctly, but guard anyway
        if (!config.url) {
            throw new HttpRequestError(
                `[${meta.nodeName}] Missing required field: url`,
                null,
                null,
                false   // not retryable — misconfiguration
            )
        }

        if (!config.method) {
            throw new HttpRequestError(
                `[${meta.nodeName}] Missing required field: method`,
                null,
                null,
                false
            )
        }

        const timeoutMs = config.timeoutMs ?? 10_000  // default 10 seconds

        // AbortController lets us cancel the fetch after the timeout
        // Without this, a hanging API call would hang the entire Lambda invocation
        const controller = new AbortController()
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

        let rawResponse: Response

        try {
            rawResponse = await fetch(config.url, {
                method: config.method,
                headers: {
                    "Content-Type": "application/json",
                    ...config.headers,        // user-provided headers override defaults
                },
                // Only attach body for methods that support it
                body: ["POST", "PUT", "PATCH"].includes(config.method)
                    ? JSON.stringify(config.body ?? {})
                    : undefined,
                signal: controller.signal,
            })
        } catch (err) {
            // fetch() itself threw — either a network error or the AbortController fired

            if ((err as Error).name === "AbortError") {
                throw new HttpRequestError(
                    `[${meta.nodeName}] Request timed out after ${timeoutMs}ms — ${config.url}`,
                    null,
                    null,
                    true   // timeout is retryable — might be transient
                )
            }

            // Network error (DNS failure, connection refused, etc.)
            throw new HttpRequestError(
                `[${meta.nodeName}] Network error — ${(err as Error).message}`,
                null,
                null,
                true   // also retryable
            )
        } finally {
            // Always clear the timeout — if fetch resolved before timeout we
            // don't want a dangling timer keeping the Lambda warm unnecessarily
            clearTimeout(timeoutHandle)
        }

        // Parse response headers into a plain object
        // rawResponse.headers is a Headers instance, not a plain object
        const responseHeaders: Record<string, string> = {}
        rawResponse.headers.forEach((value, key) => {
            responseHeaders[key] = value
        })

        // Parse body — try JSON first, fall back to plain text
        // We always read the body even on error responses, because
        // error bodies often contain useful information (validation errors etc.)
        let responseBody: unknown
        const contentType = rawResponse.headers.get("content-type") ?? ""

        if (contentType.includes("application/json")) {
            try {
                responseBody = await rawResponse.json()
            } catch {
                // Content-Type said JSON but body wasn't valid JSON
                // Fall back to text so we don't silently drop the response
                responseBody = await rawResponse.text()
            }
        } else {
            responseBody = await rawResponse.text()
        }

        const output: HttpRequestOutput = {
            statusCode: rawResponse.status,
            body: responseBody,
            headers: responseHeaders,
            ok: rawResponse.ok,   // true for 200-299
        }

        // Non-2xx responses are treated as errors by default
        // NodeRunner will catch this and apply retry logic based on retryConfig
        // The full response is attached to the error so if continueOnFail is true,
        // the execution engine can store it as the node's output anyway
        if (!rawResponse.ok) {
            throw new HttpRequestError(
                `[${meta.nodeName}] HTTP ${rawResponse.status} — ${config.url}`,
                rawResponse.status,
                output,
                rawResponse.status >= 500   // 5xx = retryable (server error), 4xx = not retryable (client error)
            )
        }

        // Success — return the output object
        // This gets stored in executionContext under this node's name
        // Downstream nodes access it via {{Fetch Customer.output.body.id}} etc.
        return output as unknown as ResolvedValue
    }
}
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { HttpRequestNode, HttpRequestError } from "./HttpRequestNode"

const meta = {
    nodeId: "node_2",
    nodeName: "Fetch Customer",
    workflowId: "wf_1",
    executionId: "exec_1",
}

const context = {}  // HttpRequestNode doesn't use context

describe("HttpRequestNode", () => {

    beforeEach(() => {
        // Replace global fetch with a controlled mock before each test
        // We never make real network calls in tests — that would make them
        // slow, flaky, and dependent on external services
        vi.stubGlobal("fetch", vi.fn())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // Helper — builds a fake fetch Response so tests don't repeat this boilerplate
    const mockResponse = (status: number, body: unknown, contentType = "application/json") => {
        return Promise.resolve({
            status,
            ok: status >= 200 && status < 300,
            headers: {
                get: (key: string) => key === "content-type" ? contentType : null,
                forEach: (cb: (v: string, k: string) => void) => cb(contentType, "content-type"),
            },
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(String(body)),
        } as unknown as Response)
    }

    describe("successful requests", () => {

        it("returns statusCode, body, headers, ok on 200 response", async () => {
            vi.mocked(fetch).mockReturnValue(
                mockResponse(200, { id: "CUST-441", name: "Rahul Sharma" })
            )

            const node = new HttpRequestNode()
            const result = await node.execute(
                { url: "https://api.example.com/customers/CUST-441", method: "GET" },
                context,
                meta
            ) as any

            expect(result.statusCode).toBe(200)
            expect(result.ok).toBe(true)
            expect(result.body).toEqual({ id: "CUST-441", name: "Rahul Sharma" })
        })

        it("parses JSON body when content-type is application/json", async () => {
            vi.mocked(fetch).mockReturnValue(
                mockResponse(200, { parsed: true }, "application/json")
            )

            const node = new HttpRequestNode()
            const result = await node.execute(
                { url: "https://api.example.com/data", method: "GET" },
                context,
                meta
            ) as any

            // body should be the parsed object, not a JSON string
            expect(typeof result.body).toBe("object")
            expect(result.body.parsed).toBe(true)
        })

        it("returns raw string body when content-type is not JSON", async () => {
            vi.mocked(fetch).mockReturnValue(
                mockResponse(200, "plain text response", "text/plain")
            )

            const node = new HttpRequestNode()
            const result = await node.execute(
                { url: "https://api.example.com/text", method: "GET" },
                context,
                meta
            ) as any

            expect(typeof result.body).toBe("string")
            expect(result.body).toBe("plain text response")
        })

    })

    describe("error responses", () => {

        it("throws HttpRequestError on 404 — not retryable", async () => {
            vi.mocked(fetch).mockReturnValue(mockResponse(404, { error: "Not found" }))

            const node = new HttpRequestNode()

            await expect(
                node.execute({ url: "https://api.example.com/missing", method: "GET" }, context, meta)
            ).rejects.toThrow(HttpRequestError)

            // Verify it's specifically not retryable — 4xx is a client error
            await expect(
                node.execute({ url: "https://api.example.com/missing", method: "GET" }, context, meta)
            ).rejects.toMatchObject({ retryable: false, statusCode: 404 })
        })

        it("throws HttpRequestError on 500 — retryable", async () => {
            vi.mocked(fetch).mockReturnValue(mockResponse(500, { error: "Server error" }))

            const node = new HttpRequestNode()

            await expect(
                node.execute({ url: "https://api.example.com/data", method: "GET" }, context, meta)
            ).rejects.toMatchObject({ retryable: true, statusCode: 500 })
        })

        it("throws HttpRequestError with attached response on non-2xx", async () => {
            vi.mocked(fetch).mockReturnValue(mockResponse(422, { error: "Validation failed" }))

            const node = new HttpRequestNode()

            try {
                await node.execute({ url: "https://api.example.com/data", method: "POST" }, context, meta)
            } catch (err) {
                // The full response is attached to the error
                // ExecutionEngine uses this for continueOnFail — it stores
                // the response as the node's output even though it "failed"
                expect((err as HttpRequestError).response?.statusCode).toBe(422)
                expect((err as HttpRequestError).response?.ok).toBe(false)
            }
        })

    })

    describe("network failures", () => {

        it("throws retryable error on timeout", async () => {
            // Simulate AbortController firing by rejecting with AbortError
            vi.mocked(fetch).mockRejectedValue(
                Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
            )

            const node = new HttpRequestNode()

            await expect(
                node.execute(
                    { url: "https://api.example.com/slow", method: "GET", timeoutMs: 100 },
                    context,
                    meta
                )
            ).rejects.toMatchObject({ retryable: true })
        })

        it("throws retryable error on network failure", async () => {
            vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"))

            const node = new HttpRequestNode()

            await expect(
                node.execute({ url: "https://api.example.com/data", method: "GET" }, context, meta)
            ).rejects.toMatchObject({ retryable: true })
        })

    })

    describe("validation", () => {

        it("throws non-retryable error when url is missing", async () => {
            const node = new HttpRequestNode()

            await expect(
                node.execute({ method: "GET" } as any, context, meta)
            ).rejects.toMatchObject({ retryable: false })
        })

        it("throws non-retryable error when method is missing", async () => {
            const node = new HttpRequestNode()

            await expect(
                node.execute({ url: "https://api.example.com/data" } as any, context, meta)
            ).rejects.toMatchObject({ retryable: false })
        })

    })

})
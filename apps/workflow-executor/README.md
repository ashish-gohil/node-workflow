# workflow-executor

A stateless AWS Lambda service that consumes jobs from SQS and executes workflow DAGs node-by-node. It is one service in a larger monorepo — it does not handle triggering, scheduling, or API concerns. Its only responsibility is to take a job message, run the workflow, and persist the result.

---

## Table of contents

- [Responsibility](#responsibility)
- [How it fits into the platform](#how-it-fits-into-the-platform)
- [How it works](#how-it-works)
- [Folder structure](#folder-structure)
- [Core modules](#core-modules)
  - [handler](#handler)
  - [ExecutionEngine](#executionengine)
  - [DagResolver](#dagresolver)
  - [NodeRunner](#noderunner)
  - [ContextManager](#contextmanager)
  - [ExpressionResolver](#expressionresolver)
  - [Node adapters](#node-adapters)
- [SQS message contract](#sqs-message-contract)
- [Execution lifecycle](#execution-lifecycle)
- [Duplicate execution prevention](#duplicate-execution-prevention)
- [Error handling and retries](#error-handling-and-retries)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Running tests](#running-tests)
- [Deployment](#deployment)
- [Lambda and SQS configuration](#lambda-and-sqs-configuration)
- [Debugging](#debugging)

---

## Responsibility

This service does **one thing**: given an execution job on SQS, run the corresponding workflow to completion and write the results to MongoDB.

It does **not**:
- Decide when a workflow should run (that is `workflow-cron-poller`)
- Expose HTTP endpoints (that is the `api` service)
- Render any UI (that is the `frontend` service)
- Own the database schemas (those live in `packages/db`)

---

## How it fits into the platform

```
workflow-cron-poller  ─────┐
                           ├──► SQS (workflow-jobs) ──► workflow-executor ──► MongoDB
api (manual / webhook) ────┘
```

Any service that wants to run a workflow creates an `Execution` document in MongoDB with status `PENDING` and pushes a job message onto the SQS queue. This service picks that message up, runs the workflow, and updates the execution record with the result. Nothing else coordinates between the two — the queue is the contract.

---

## How it works

1. SQS delivers a job message to the Lambda trigger.
2. The handler parses the message and calls `ExecutionEngine.run()`.
3. The engine atomically claims the execution in MongoDB (`PENDING → RUNNING`). If the record is already `RUNNING` (duplicate message), the Lambda exits immediately — no work is done twice.
4. The engine loads the workflow definition from the `workflowSnapshot` on the execution record and passes the graph to `DagResolver`, which returns an ordered list of execution tiers via topological sort.
5. Each tier is a group of nodes that have no dependencies on each other within the tier and can run in parallel.
6. For each node, `NodeRunner` resolves input expressions (e.g. `{{HTTP Request.output.body.id}}`), calls the correct node adapter, and writes the output back to the execution context via `ContextManager`.
7. On `IF` nodes, only the active branch is marked for execution. The inactive branch nodes are visited but immediately marked `SKIPPED`.
8. After all tiers complete, the execution is marked `SUCCESS`. On any unrecoverable failure it is marked `FAILED` with an error summary.
9. If `stopAtNodeId` is set in the job message, execution halts cleanly after that node and the status is set to `PARTIAL_SUCCESS`.

---

## Folder structure

```
apps/workflow-executor/
├── src/
│   ├── handler.ts                  # Lambda entrypoint — parses SQS event, calls engine
│   │
│   ├── engine/
│   │   ├── ExecutionEngine.ts      # Orchestrates the full run end-to-end
│   │   ├── DagResolver.ts          # Topological sort + execution tier grouping
│   │   ├── NodeRunner.ts           # Runs one node: resolve inputs → execute → store output
│   │   ├── ContextManager.ts       # Reads/writes nodeResults to MongoDB during the run
│   │   └── ExpressionResolver.ts   # Resolves {{NodeName.output.field}} syntax
│   │
│   ├── nodes/
│   │   ├── BaseNode.ts             # Abstract base: execute(inputs, params, ctx) → output
│   │   ├── HttpRequestNode.ts      # Outbound HTTP calls
│   │   ├── CodeNode.ts             # Sandboxed arbitrary JS execution
│   │   ├── IfNode.ts               # Evaluates a condition, returns active handle
│   │   ├── SetVariableNode.ts      # Maps / transforms values between nodes
│   │   ├── DelayNode.ts            # Pauses execution for N seconds
│   │   ├── MergeNode.ts            # Waits for multiple upstream branches
│   │   └── index.ts                # NODE_REGISTRY — maps nodeType string → class
│   │
│   └── utils/
│       ├── logger.ts               # Structured JSON logger (CloudWatch-friendly)
│       └── errors.ts               # Typed error classes (NodeExecutionError, etc.)
│
├── tests/
│   ├── engine/
│   │   ├── DagResolver.test.ts
│   │   ├── NodeRunner.test.ts
│   │   └── ExpressionResolver.test.ts
│   └── nodes/
│       ├── HttpRequestNode.test.ts
│       ├── IfNode.test.ts
│       └── ...
│
├── scripts/
│   └── deploy.sh                   # Manual zip-and-upload deploy script
│
├── .env.example
├── package.json
└── README.md
```

---

## Core modules

### handler

**File:** `src/handler.ts`

The Lambda entrypoint. AWS invokes this with an SQS event. Batch size is configured to 1 (see [Lambda and SQS configuration](#lambda-and-sqs-configuration)) so `event.Records` always contains a single message.

Responsibilities:
- Parse and validate the SQS message body
- Initialize the MongoDB connection (reused across warm invocations — declared outside the handler body)
- Call `ExecutionEngine.run()` with the parsed job
- Return cleanly so SQS deletes the message; throw only on unrecoverable parse errors so malformed messages go to the DLQ immediately rather than retrying

```ts
// Connection is initialized once, outside the handler, so it persists across warm invocations
await connectDb();

export const handler = async (event: SQSEvent): Promise<void> => {
  const record = event.Records[0];
  const job = JSON.parse(record.body) as ExecutionJob;
  await ExecutionEngine.run(job);
};
```

---

### ExecutionEngine

**File:** `src/engine/ExecutionEngine.ts`

The top-level coordinator. Owns the execution lifecycle from claim to completion.

Responsibilities:
- Atomically claim the execution (`PENDING → RUNNING`) using `findOneAndUpdate`
- Load the workflow graph from `workflowSnapshot` on the execution record
- Call `DagResolver` to produce the ordered tier list
- Iterate over tiers, running all nodes in a tier concurrently via `Promise.allSettled`
- Mark the execution `SUCCESS`, `FAILED`, or `PARTIAL_SUCCESS` when done
- Write a top-level error summary to MongoDB on failure

Key pattern — the atomic claim that prevents duplicate processing:

```ts
const claimed = await ExecutionModel.findOneAndUpdate(
  { executionId: job.executionId, status: "PENDING" },
  { $set: { status: "RUNNING", startedAt: new Date() } },
  { new: true }
);
if (!claimed) return; // already claimed by another worker — exit silently
```

---

### DagResolver

**File:** `src/engine/DagResolver.ts`

Takes the workflow graph (`nodes` + `edges`) and returns an ordered array of execution tiers. Each tier is an array of node IDs that are safe to run in parallel because none depend on each other within that tier.

Uses Kahn's algorithm (BFS-based topological sort). Chosen over DFS because it naturally groups nodes into levels (tiers) and makes cycle detection explicit.

```
Input graph:
  Trigger → HTTP Request → Transform → Send Email
                        ↘ Write to DB

Output tiers:
  [
    ["trigger_1"],
    ["http_request_1"],
    ["transform_1", "write_db_1"],   ← parallel tier
    ["send_email_1"]
  ]
```

Also handles:
- **Cycle detection** — throws `CyclicGraphError` if a circular dependency exists; the execution is immediately marked `FAILED`
- **Disconnected nodes** — nodes with no path from the trigger are detected and marked `SKIPPED` without running
- **Conditional edges** — edges tagged `sourceHandle: "true"` or `"false"` are only activated after the `IF` node resolves its condition; inactive branch nodes are excluded from remaining tiers

---

### NodeRunner

**File:** `src/engine/NodeRunner.ts`

Executes a single node. Called by `ExecutionEngine` for every node in every tier.

Responsibilities:
- Mark the node `RUNNING` in the execution context
- Fetch predecessor outputs from `ContextManager`
- Call `ExpressionResolver` to substitute `{{...}}` tokens in the node's `config`
- Look up the correct adapter from `NODE_REGISTRY` and call `adapter.execute()`
- Write the node output back to `ContextManager`
- Implement retry logic with exponential backoff based on `node.retryConfig`
- Mark the node `SUCCESS`, `FAILED`, or `SKIPPED`

Retry behaviour:
```
Attempt 1 → fails → wait 1000ms
Attempt 2 → fails → wait 2000ms
Attempt 3 → fails → mark FAILED, propagate
```

If `node.continueOnFail` is `true`, a `FAILED` node does not halt the execution — the engine continues with the next tier using `null` as the node's output.

---

### ContextManager

**File:** `src/engine/ContextManager.ts`

Manages the live execution state that accumulates as nodes run. Acts as the shared memory for a single execution — every node writes its output here and every downstream node reads from here.

Responsibilities:
- Hold the full `nodeResults` map **in memory** for the duration of the Lambda invocation (fast O(1) reads via a plain `Map`)
- **Persist** each node result to MongoDB after it completes (durable writes for observability and future resume support)
- Expose `getOutput(nodeId)` for `ExpressionResolver` to fetch any previous node's output
- Write the `prev_run_data` upsert after each successful node so `$prevRunData` is available on the next run

The in-memory map means expression resolution never hits MongoDB mid-execution. All reads within a single run are in-process.

---

### ExpressionResolver

**File:** `src/engine/ExpressionResolver.ts`

Scans a node's `config` object recursively and replaces all `{{NodeName.output.field}}` expressions with their resolved values from the current execution context before the node runs.

Syntax: `{{<NodeName>.<path>.<to>.<field>}}`

```
{{Trigger.output.body.userId}}            → 42
{{HTTP Request.output.body.token}}        → "abc123"
{{Set Variable.output.processedAt}}       → "2026-04-27T10:00:00Z"
```

Handles:
- **Nested paths** — `body.user.address.city` resolved via lodash `get`
- **Missing values** — returns `""` rather than throwing; a missing expression is a workflow logic error, not a system error
- **Multiple expressions in one string** — `"Hello {{Trigger.output.body.name}}, ID: {{Trigger.output.body.id}}"` resolves both tokens independently
- **Non-string values** — numbers, booleans, and nested objects in `config` are passed through untouched; only strings are scanned

---

### Node adapters

**Directory:** `src/nodes/`

Each node type is a class extending `BaseNode` and implementing a single `execute` method:

```ts
abstract class BaseNode {
  abstract execute(
    inputs: Record<string, unknown>,    // resolved config (expressions already substituted)
    rawParams: Record<string, unknown>, // original config before resolution
    context: ExecutionContext           // read-only view of the full execution context
  ): Promise<Record<string, unknown>>;  // output — stored as nodeResults[nodeId].output
}
```

| Adapter | What it does |
|---|---|
| `HttpRequestNode` | Makes outbound HTTP calls. Supports method, URL, headers, body, query params. Returns `{ statusCode, body, headers }`. |
| `CodeNode` | Runs user-provided JS in a sandboxed `vm.Script` context. Exposes `$input`, `$context`, and `$prevRunData` to the script. |
| `IfNode` | Evaluates a condition against the input. Returns `{ activeHandle: "true" \| "false" }`. The engine uses this to activate or deactivate downstream edges. |
| `SetVariableNode` | Maps and transforms values into a new object from upstream outputs — no code required. |
| `DelayNode` | Pauses execution for N seconds. Throws if the requested delay would exceed remaining Lambda execution time. |
| `MergeNode` | Collects outputs from all upstream branches into a single array and passes them downstream. |

**Adding a new node type:**
1. Create `src/nodes/YourNode.ts` extending `BaseNode`
2. Register it in `src/nodes/index.ts`: `your_node_type: YourNode`
3. The `nodeType` value on the workflow node in MongoDB must match the registry key exactly
4. Write tests in `tests/nodes/YourNode.test.ts`

---

## SQS message contract

Every message body is a JSON string. This is the input contract — any service that wants to trigger an execution must produce a message in exactly this shape.

```ts
interface ExecutionJob {
  executionId: string;    // must already exist in MongoDB with status "PENDING"
  workflowId: string;
  triggeredBy: "CRON" | "WEBHOOK" | "MANUAL";
  inputData: {
    body: Record<string, unknown>;
    headers: Record<string, unknown>;
    query: Record<string, unknown>;
  };
  idempotencyKey: string;

  // Optional — if set, execution halts after this node completes
  // and status is set to PARTIAL_SUCCESS. Used by the builder "run until here" feature.
  stopAtNodeId?: string;
}
```

> **Important:** this service does not create the `Execution` document. The calling service must create it with `status: "PENDING"` before enqueuing the message. If the executor receives a job for a non-existent or already-completed execution ID, it logs an error and returns without retrying — this is a caller error, not a transient failure.

---

## Execution lifecycle

```
PENDING ──► RUNNING ──► SUCCESS
                    ──► FAILED
                    ──► PARTIAL_SUCCESS   (stopAtNodeId reached)
```

Transitions managed by this service: `PENDING → RUNNING`, then `RUNNING → SUCCESS / FAILED / PARTIAL_SUCCESS`.

`TIMED_OUT` and `CANCELLED` are written by other services (`workflow-cron-poller` cleanup job and the `api` service respectively). This service never writes those statuses.

---

## Duplicate execution prevention

SQS delivers messages *at least once* — in rare cases the same message may arrive twice (e.g. after a Lambda crash near completion). The atomic MongoDB claim handles this:

```ts
const claimed = await ExecutionModel.findOneAndUpdate(
  { executionId: job.executionId, status: "PENDING" },
  { $set: { status: "RUNNING", startedAt: new Date() } },
  { new: true }
);
if (!claimed) return; // already claimed — exit silently, no duplicate work
```

A second Lambda instance receiving the duplicate finds the status is no longer `PENDING`, gets `null` back, and exits. No distributed lock service required.

---

## Error handling and retries

**Node-level retries** are configured per-node in the workflow definition via `node.retryConfig`:

```ts
interface RetryConfig {
  maxAttempts: number; // default: 3
  backoffMs: number;   // base delay, doubles on each attempt (default: 1000ms)
}
```

**Workflow-level failure** — if a node exhausts all retries and `continueOnFail` is `false`, the engine marks the execution `FAILED` and stops. Nodes that had not yet run remain in `PENDING` status in `nodeResults`.

**Lambda-level retries** — if the Lambda itself throws (OOM, timeout), SQS redelivers the message up to `maxReceiveCount` times. After that the message moves to the DLQ. Because the executor only claims executions in `PENDING` status, a redelivery for an execution that already completed is safely ignored.

---

## Environment variables

Copy `.env.example` to `.env` for local development. Set these as Lambda environment variables in AWS.

```bash
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/your-db
NODE_ENV=production

# 32-byte hex key for decrypting credential values at execution time
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CREDENTIAL_ENCRYPTION_KEY=your-32-byte-hex-key

# Optional — defaults shown
LOG_LEVEL=info
EXECUTION_TIMEOUT_SECONDS=840
NODE_MAX_RETRY_ATTEMPTS=3
NODE_RETRY_BACKOFF_MS=1000
```

---

## Local development

### Prerequisites

- Node.js 20+ or Bun
- MongoDB (local or Atlas free tier)
- AWS CLI (only needed for deployment)

### Install

```bash
# From monorepo root
bun install
```

### Run a workflow locally

The executor is a pure function — there is no server to start. Invoke it directly with a mock SQS event:

```bash
# 1. Seed an Execution document in MongoDB with status "PENDING" first

# 2. Create a test event
cat > tmp/test-event.json << 'EOF'
{
  "Records": [{
    "messageId": "local-test",
    "body": "{\"executionId\":\"YOUR_EXECUTION_ID\",\"workflowId\":\"YOUR_WORKFLOW_ID\",\"triggeredBy\":\"MANUAL\",\"inputData\":{\"body\":{},\"headers\":{},\"query\":{}},\"idempotencyKey\":\"local-test-1\"}"
  }]
}
EOF

# 3. Invoke
bun run src/handler.ts
```

---

## Running tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Single file
bun test tests/engine/DagResolver.test.ts
```

### Key scenarios per module

| Module | Scenarios to cover |
|---|---|
| `DagResolver` | Linear graph, branching, parallel merge, disconnected nodes, cycle detection |
| `ExpressionResolver` | Nested paths, missing field returns `""`, multiple tokens in one string, non-string passthrough |
| `NodeRunner` | First-attempt success, retry on failure, exhausted retries, `continueOnFail: true` |
| `IfNode` | True branch active + false skipped, false branch active + true skipped |
| `HttpRequestNode` | 2xx success, 4xx/5xx triggers retry, network timeout |
| `ContextManager` | Output written after success, `$prevRunData` upserted correctly |

---

## Deployment

### Option A — deploy script

Add to `package.json`:
```json
{ "scripts": { "deploy": "bash scripts/deploy.sh" } }
```

`scripts/deploy.sh`:
```bash
#!/bin/bash
set -e

FUNCTION_NAME="workflow-executor"
REGION="ap-south-1"   # update to your region

echo "→ Installing production deps..."
bun install --production

echo "→ Zipping..."
zip -r workflow-executor.zip . \
  --exclude "*.test.ts" \
  --exclude "tests/*" \
  --exclude ".env*" \
  --exclude "tmp/*" \
  --exclude "*.md" \
  --exclude "node_modules/.cache/*"

echo "→ Uploading..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://workflow-executor.zip \
  --region $REGION

echo "→ Waiting for update to propagate..."
aws lambda wait function-updated \
  --function-name $FUNCTION_NAME \
  --region $REGION

echo "✓ Deployed $FUNCTION_NAME"
rm workflow-executor.zip
```

Run with: `bun run deploy`

---

### Option B — GitHub Actions (recommended)

Triggers automatically on push to `main` when files in this service or `packages/db` change.

Create `.github/workflows/deploy-executor.yml` in the monorepo root:

```yaml
name: Deploy workflow-executor

on:
  push:
    branches: [main]
    paths:
      - 'apps/workflow-executor/**'
      - 'packages/db/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install production deps
        working-directory: apps/workflow-executor
        run: bun install --production

      - name: Zip
        working-directory: apps/workflow-executor
        run: |
          zip -r ../../workflow-executor.zip . \
            --exclude "*.test.ts" --exclude "tests/*" \
            --exclude ".env*" --exclude "*.md"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1

      - name: Deploy to Lambda
        run: |
          aws lambda update-function-code \
            --function-name workflow-executor \
            --zip-file fileb://workflow-executor.zip
          aws lambda wait function-updated \
            --function-name workflow-executor

      - run: rm workflow-executor.zip
```

**Required GitHub secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**Required IAM permissions for the CI user:** `lambda:UpdateFunctionCode`, `lambda:GetFunction`

---

## Lambda and SQS configuration

### Lambda settings

| Setting | Value | Reason |
|---|---|---|
| Runtime | Node.js 20.x | |
| Handler | `src/handler.handler` | |
| Timeout | 900s (15 min) | Maximum allowed — long workflows need headroom |
| Memory | 512 MB | Increase to 1024 MB if `CodeNode` runs heavy scripts |
| Trigger | SQS `workflow-jobs`, batch size **1** | One execution per invocation — simplifies error handling |
| Reserved concurrency | 10 | Adjust based on expected queue depth |
| DLQ | SQS `workflow-jobs-dlq` | Catches messages that fail all retries |

> Batch size must be **1**. Each execution is a potentially long-running job — processing multiple records in one invocation would risk timeout mid-batch and complicate partial failure handling.

### SQS queue settings

| Setting | Value | Reason |
|---|---|---|
| Visibility timeout | 920s | Must exceed Lambda timeout — prevents redelivery during a live run |
| Message retention | 4 days | |
| Max receive count | 3 | After 3 failures, route to DLQ |

---

## Debugging

### Check execution state

```bash
mongosh "$MONGODB_URI" --eval "
  db.executions.findOne(
    { executionId: 'YOUR_EXECUTION_ID' },
    { status: 1, error: 1, nodeResults: 1, startedAt: 1, finishedAt: 1 }
  )
"
```

### Tail Lambda logs

```bash
# Live tail
aws logs tail /aws/lambda/workflow-executor --follow --region ap-south-1

# Filter by execution ID
aws logs filter-log-events \
  --log-group-name /aws/lambda/workflow-executor \
  --filter-pattern "YOUR_EXECUTION_ID" \
  --region ap-south-1
```

### Inspect the DLQ

```bash
aws sqs receive-message \
  --queue-url https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/workflow-jobs-dlq \
  --max-number-of-messages 10 \
  --region ap-south-1
```

### Common issues

**"Execution not claimed — already running"** in logs
Normal. A duplicate SQS message arrived and was correctly ignored by the atomic claim check. No action needed.

**Lambda OOM (exit code 137)**
A `CodeNode` script is consuming too much memory. Increase Lambda memory to 1024 MB, or add a memory cap inside the `CodeNode` VM sandbox.

**`MongooseServerSelectionError` on cold start**
Lambda cannot reach MongoDB. Check: Atlas IP allowlist includes `0.0.0.0/0` (development) or Lambda is in the correct VPC with the right security group rules (production). Verify `MONGODB_URI` is set correctly in Lambda environment variables.

**Execution stuck in `RUNNING` indefinitely**
Lambda timed out or crashed after claiming but before completing. The `workflow-cron-poller` cleanup job finds executions in `RUNNING` with `startedAt` older than 16 minutes and marks them `TIMED_OUT`. If the cleanup job is not running, do it manually:

```bash
mongosh "$MONGODB_URI" --eval "
  db.executions.updateMany(
    { status: 'RUNNING', startedAt: { \$lt: new Date(Date.now() - 16 * 60 * 1000) } },
    { \$set: { status: 'TIMED_OUT', finishedAt: new Date() } }
  )
"
```
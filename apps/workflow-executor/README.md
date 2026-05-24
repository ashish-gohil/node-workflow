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
- Decide when a workflow should run (that is `cron-workflow-poller`)
- Expose HTTP endpoints (that is the `api` service)
- Render any UI (that is the `frontend` service)
- Own the database schemas (those live in `packages/db`)

---

## How it fits into the platform

```
cron-workflow-poller  ─────┐
                           ├──► SQS (workflow-jobs) ──► workflow-executor ──► MongoDB
api (manual / webhook) ────┘
```

Any service that wants to run a workflow creates an `Execution` document in MongoDB with status `PENDING` and pushes a job message onto the SQS queue. This service picks that message up, runs the workflow, and updates the execution record with the result. Nothing else coordinates between the two — the queue is the contract.

---

## How it works

1. SQS delivers job messages to the Lambda trigger.
2. The handler parses every message in `event.Records` and creates an `ExecutionEngine` per job.
3. The engine atomically claims the execution in MongoDB (`PENDING → RUNNING`). If the record is already `RUNNING` (duplicate message), the Lambda exits immediately — no work is done twice.
4. The engine loads the workflow definition from the `workflowSnapshot` on the execution record and passes the graph to `DagResolver`, which returns an ordered list of execution tiers via topological sort.
5. Each tier is a group of nodes that have no dependencies on each other within the tier and can run in parallel.
6. For each node, `NodeRunner` resolves input expressions (e.g. `{{HTTP Request.output.body.id}}`), calls the correct node adapter, and writes the output back to the execution context via `ContextManager`.
7. On `IF` nodes the engine activates only the matching-handle edges (`sourceHandle === "true"` if `output.passed` is true, `"false"` otherwise). Any node whose only path is through a non-matching handle is marked `SKIPPED` and never runs.
8. After all tiers complete, the execution is marked `SUCCESS`. On any unrecoverable failure it is marked `FAILED` with an error summary.
9. On success the workflow status is reset to `READY`. For `CRON` triggers the next `nextRunAt` is recomputed via `cron-parser`; `lastRunAt` for cron is owned by `SchedulerTriggerNode` (stamped at trigger time). For `MANUAL`/`WEBHOOK` triggers the engine stamps `lastRunAt` on completion as a fallback.

---

## Folder structure

```
apps/workflow-executor/
├── src/
│   ├── index.ts                          # Lambda entrypoint — parses SQS event, runs one ExecutionEngine per record
│   │
│   ├── engine/
│   │   ├── ExecutionEngine.ts            # Orchestrates the full run end-to-end (incl. IF branching)
│   │   ├── DagResolver.ts                # Topological sort + execution tier grouping
│   │   ├── NodeRunner.ts                 # Runs one node: resolve inputs → execute → store output
│   │   ├── ContextManager.ts             # Reads/writes nodeResults to MongoDB during the run
│   │   ├── ExecutionEngine.test.ts
│   │   └── DagResolver.test.ts
│   │
│   ├── nodes/
│   │   ├── BaseNode.ts                   # Abstract base: execute(inputs, context, meta) → output
│   │   ├── ManualTriggerNode.ts          # Passthrough — outputs the trigger inputs
│   │   ├── SchedulerTriggerNode.ts       # Stamps workflow.lastRunAt at trigger time; emits cron metadata
│   │   ├── HttpRequestNode.ts            # Outbound HTTP calls with timeout + typed error
│   │   ├── HttpRequestNode.test.ts
│   │   ├── SetVariableNode.ts            # Maps / transforms values between nodes
│   │   ├── IfNode.ts                     # Evaluates conditions → { passed, results }; engine gates branch edges
│   │   ├── DelayNode.ts                  # Scaffold — not yet wired into the registry
│   │   └── index.ts                      # nodeRegistry — maps FlowNodeType → instance
│   │
│   └── utils/
│       ├── expression-resolver.ts        # Resolves {{NodeName.output.field}} syntax
│       └── expresstion-resolver.test.tsx
│
├── package.json
└── README.md
```

Tests are co-located with the modules they cover (Vitest). There is no separate `tests/` directory.

---

## Core modules

### handler

**File:** `src/index.ts`

The Lambda entrypoint. AWS invokes this with an SQS event. The handler loops through `event.Records`, parses each message body, and runs one `ExecutionEngine` per job sequentially.

Responsibilities:
- Initialize the MongoDB connection via the `connectMongo()` singleton (re-used across warm invocations)
- Parse every SQS message body as `{ workflowId, executionId }`
- Instantiate `ExecutionEngine(executionId, workflowId, nodeRegistry)` for each job and call `executeWorkflow()`
- Return cleanly so SQS deletes the messages

```ts
export const handler = async (event: SQSEvent) => {
  await connectMongo();
  const workflows = event.Records.map((r) => JSON.parse(r.body) as {
    workflowId: string;
    executionId: string;
  });
  for (const wf of workflows) {
    const engine = new ExecutionEngine(wf.executionId, wf.workflowId, nodeRegistry);
    await engine.executeWorkflow();
  }
  return { success: true };
};
```

---

### ExecutionEngine

**File:** `src/engine/ExecutionEngine.ts`

The top-level coordinator. Owns the execution lifecycle from claim to completion.

Responsibilities:
- Load the workflow document (used for trigger type + cron expression at tail-end)
- Atomically claim the execution (`PENDING → RUNNING`) using `findOneAndUpdate`
- Mark the workflow `PROCESSING` (poller had set it `QUEUED`)
- Load the graph from `execution.workflowSnapshot` (NOT the live workflow — snapshot is frozen at trigger time)
- Call `DagResolver` to produce the ordered tier list
- Track `liveEdgeIds: Set<string>` across tiers and decide per-tier which nodes are runnable vs skipped
- Mark skipped nodes via `ContextManager.setNodeStatus(nodeId, "SKIPPED")`
- Run runnable nodes in a tier concurrently via `Promise.allSettled`
- Activate outgoing edges after each successful node (IF nodes activate only the handle that matches `output.passed`)
- Mark the execution `SUCCESS` or `FAILED` when done
- On success: reset workflow `status: READY`; for CRON recompute `nextRunAt` via `CronExpressionParser`; for MANUAL/WEBHOOK stamp `lastRunAt`
- On failure: write `Execution.error = { message }` and set `Workflow.status = FAILED`

Key pattern — the atomic claim that prevents duplicate processing:

```ts
const claimed = await ExecutionModel.findOneAndUpdate(
  { executionId: this.executionId, status: "PENDING" },
  { $set: { status: "RUNNING" } }
);
if (!claimed) return; // already claimed by another worker — exit silently
```

Key pattern — IF branch gating per tier:

```ts
const isReachable =
  incoming.length === 0 || incoming.some(e => liveEdgeIds.has(e.id));
// ... runnable nodes run; unreachable nodes get setNodeStatus("SKIPPED")

// After a successful run:
if (isIfNode(node)) {
  const passed = (output as { passed?: boolean })?.passed === true;
  for (const e of outgoing) {
    if (e.sourceHandle === "true"  && passed)  liveEdgeIds.add(e.id);
    else if (e.sourceHandle === "false" && !passed) liveEdgeIds.add(e.id);
    else if (!e.sourceHandle) liveEdgeIds.add(e.id); // backwards compat
  }
} else {
  for (const e of outgoing) liveEdgeIds.add(e.id);
}
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

Notes:
- **Cycle detection** — if the topo-sort output is shorter than the node set, a cycle exists. The engine treats this as a failed run.
- **Disconnected nodes** — nodes with no path from the trigger end up in the topo sort but get pruned at execution time by the live-edge check (they have incoming edges but no live predecessor).
- **Conditional edges** — the resolver itself is unaware of `IF` handles; gating is enforced by `ExecutionEngine` via the live-edge set, which is what actually decides if a node runs or is marked `SKIPPED`.

---

### NodeRunner

**File:** `src/engine/NodeRunner.ts`

Executes a single node. Called by `ExecutionEngine` for every runnable node in every tier.

Responsibilities:
- Look up the adapter in `nodeRegistry`; throw if no adapter registered for `node.nodeType`
- Build `NodeExecutionMeta` = `{ nodeId, nodeName, workflowId, executionId }`
- Call `expressionResolver(node.config, context)` to substitute `{{...}}` tokens with prior node outputs
- Mark the node `RUNNING` in the execution context
- Call `adapter.execute(inputs, context, meta)`
- Mark the node `SUCCESS`, write the output via `ContextManager.setNodeOutput`, and upsert to `prev_run_data`
- On throw: mark the node `FAILED`, write the error message, and re-throw so the engine fails the run

> The current implementation does **not** yet support per-node retry policies or a `continueOnFail` flag — any thrown error from a tier causes the engine to mark the execution `FAILED`. Lambda-level retries (via SQS) still apply.

---

### ContextManager

**File:** `src/engine/ContextManager.ts`

Manages the live execution state that accumulates as nodes run. Acts as the shared memory for a single execution — every node writes its output here and every downstream node reads from here.

Responsibilities:
- Hold the full `nodeEntries` map **in memory** for the duration of the Lambda invocation (fast O(1) reads via a plain `Map`)
- Maintain a parallel `expressionContext` keyed by node **name** (not ID) — this is what `expressionResolver` reads
- **Persist** each node status, output, and error transition to MongoDB on the execution record (durable writes for observability)
- Upsert the latest successful node output to `PrevRunDataModel` so future workflow runs can reference the previous run's outputs

The in-memory map means expression resolution never hits MongoDB mid-execution. All reads within a single run are in-process.

---

### ExpressionResolver

**File:** `src/utils/expression-resolver.ts`

Exported as a plain function `expressionResolver(template, context)`, not a class. Scans a node's `config` object recursively and replaces all `{{NodeName.output.field}}` expressions with their resolved values from the current execution context **before** the node's adapter is called.

Syntax: `{{<NodeName>.<path>.<to>.<field>}}`

```
{{Trigger.output.body.userId}}            → 42
{{HTTP Request.output.body.token}}        → "abc123"
{{Set Variable.output.processedAt}}       → "2026-04-27T10:00:00Z"
```

Handles:
- **Whole-string expression** — returns the **raw typed value** (number/object/array stays typed; only a single `{{...}}` with no surrounding text gets this treatment)
- **Embedded expression** — `"Hello {{...}}, ID: {{...}}"` returns a string with each token stringified independently
- **Nested paths** — dot notation walks any plain object
- **Missing values** — returns `""` rather than throwing; a missing expression is a workflow logic error, not a system error
- **Non-string passthrough** — numbers, booleans, and nested objects in `config` are walked recursively; only strings are scanned for tokens

---

### Node adapters

**Directory:** `src/nodes/`

Each node type is a class extending `BaseNode` and implementing a single `execute` method:

```ts
abstract class BaseNode {
  abstract execute(
    inputs: ResolvedValue,         // resolved config (expressions already substituted)
    context: ExecutionContext,     // read-only view of the full execution context
    meta: NodeExecutionMeta        // { nodeId, nodeName, workflowId, executionId }
  ): Promise<ResolvedValue>;       // output — stored as nodeResults[nodeId].output
}
```

Currently registered in `src/nodes/index.ts`:

| Adapter | nodeType key | What it does |
|---|---|---|
| `ManualTriggerNode` | `manualTrigger` | Passthrough — outputs the trigger inputs unchanged |
| `SchedulerTriggerNode` | `scheduler` | Stamps `workflow.lastRunAt = now`; emits `{ triggeredAt, lastRunAt, cronExpression, nextRunAt, mode, every, unit, time, days, timezone }` for downstream nodes |
| `HttpRequestNode` *(also aliased to `webhook`)* | `httpRequest`, `webhook` | Outbound `fetch` with `AbortController` timeout and typed `HttpRequestError`. Returns `{ statusCode, body, headers, ok }`. The webhook alias is a **placeholder** — webhook trigger semantics are not yet implemented. |
| `SetVariableNode` | `set` | Maps and transforms values into a new object from upstream outputs — no code required |
| `IfNode` | `if` | Evaluates AND-combined conditions. Returns `{ passed, results }`. The engine reads `output.passed` to gate edges by `sourceHandle: "true" \| "false"`. |
| `DelayNode` | *(not in registry)* | Scaffold — needs to be wired up in `nodes/index.ts` once implementation lands |

Future additions noted in `nodes/index.ts`: `Code`, `Delay`, `Merge`.

**Adding a new node type:**
1. Create `src/nodes/YourNode.ts` extending `BaseNode`
2. Register it in `src/nodes/index.ts`: `[ActionNodeTypes.YourType]: new YourNode()`
3. The `nodeType` value on the workflow node in MongoDB must match the registry key exactly
4. (Optional) define a Zod schema + UIMeta in `packages/types/src/nodes/YourNodeSchema.ts` so the frontend renders a config form automatically
5. Write tests co-located: `src/nodes/YourNode.test.ts`

---

## SQS message contract

Every message body is a JSON string. This is the input contract — any service that wants to trigger an execution must produce a message in exactly this shape.

```ts
interface ExecutionJob {
  executionId: string;    // must already exist in MongoDB with status "PENDING"
  workflowId: string;
}
```

> **Important:** this service does not create the `Execution` document. The calling service (`cron-workflow-poller` for CRON triggers, future webhook receiver for WEBHOOK) must create it with `status: "PENDING"` along with a `workflowSnapshot` of the graph **before** enqueuing the message. If the executor receives a job for an execution that is not in `PENDING` state, the atomic claim returns null and the executor exits silently.

The schema (`IExecution`) supports additional fields — `idempotencyKey`, `triggeredBy`, `inputData`, `stopAtNodeId` — but they are written by the caller when the Execution doc is created, not passed through the SQS message body.

---

## Execution lifecycle

```
PENDING ──► RUNNING ──► SUCCESS
                    ──► FAILED
```

Transitions managed by this service: `PENDING → RUNNING`, then `RUNNING → SUCCESS / FAILED`.

`TIMED_OUT`, `CANCELLED`, and `PARTIAL_SUCCESS` are reserved statuses in the schema. `TIMED_OUT` would be written by a future cleanup job; `CANCELLED` by the `api` service; `PARTIAL_SUCCESS` is reserved for the planned `stopAtNodeId` feature. This service never writes those statuses.

---

## Duplicate execution prevention

SQS delivers messages *at least once* — in rare cases the same message may arrive twice (e.g. after a Lambda crash near completion). The atomic MongoDB claim handles this:

```ts
const claimed = await ExecutionModel.findOneAndUpdate(
  { executionId: this.executionId, status: "PENDING" },
  { $set: { status: "RUNNING" } }
);
if (!claimed) return; // already claimed — exit silently, no duplicate work
```

A second Lambda instance receiving the duplicate finds the status is no longer `PENDING`, gets `null` back, and exits. No distributed lock service required.

In addition, the `cron-workflow-poller` writes each execution with a unique `idempotencyKey` (`<workflowId>__<scheduledAt ISO>`). The unique index on that field prevents two pollers from even creating duplicate executions for the same tick.

---

## Error handling and retries

**Workflow-level failure** — the executor uses `Promise.allSettled` per tier but throws on the **first** rejection. The execution is marked `FAILED` with `error.message`, and the workflow is set to `FAILED`. Per-node retry policies and a `continueOnFail` flag are planned but not yet implemented.

**Lambda-level retries** — if the Lambda itself throws (OOM, timeout), SQS redelivers the message up to `maxReceiveCount` times. After that the message moves to the DLQ. Because the executor only claims executions in `PENDING` status, a redelivery for an execution that already completed is safely ignored.

**Stale-lock recovery** — if a Lambda crashes after marking a workflow `PROCESSING` but before the execution finishes, the `cron-workflow-poller`'s stale-lock sweep (every minute, threshold 5 min) flips the workflow back to `READY` so the next tick can retry.

---

## Environment variables

Lambda environment variables:

```bash
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/your-db
```

For local dev, drop the same value in `apps/workflow-executor/.env`. Bun auto-loads `.env` so there's no need for `dotenv`.

---

## Local development

### Prerequisites

- Bun v1.3+
- MongoDB (local or Atlas free tier)
- AWS CLI (only needed for deployment)

### Install

```bash
# From monorepo root
bun install
```

### Run a workflow locally

The executor is a pure function — there is no server to start. Build, then invoke the bundled handler directly with a mock SQS event:

```bash
# 1. Seed an Execution document in MongoDB with status "PENDING" + workflowSnapshot

# 2. Build
bun run build

# 3. Create a test event
cat > /tmp/test-event.json << 'EOF'
{
  "Records": [{
    "messageId": "local-test",
    "body": "{\"workflowId\":\"YOUR_WORKFLOW_ID\",\"executionId\":\"YOUR_EXECUTION_ID\"}"
  }]
}
EOF

# 4. Invoke via Node
node -e "
  const { handler } = require('./dist/index.js');
  const evt = require('/tmp/test-event.json');
  handler(evt).then(r => console.log(r)).catch(e => console.error(e));
"
```

---

## Running tests

Vitest with v8 coverage. Tests are co-located with the modules they cover (`*.test.ts` / `*.test.tsx`).

```bash
# Watch mode
bun run test

# One-shot run
bun run test:run

# With coverage
bun run test:coverage

# Single file
bun run test src/engine/DagResolver.test.ts
```

### Key scenarios per module

| Module | Scenarios to cover |
|---|---|
| `DagResolver` | Linear graph, branching, parallel merge, disconnected nodes |
| `ExecutionEngine` | Atomic claim, workflow status transitions, CRON `nextRunAt` recomputation, MANUAL `lastRunAt` fallback |
| `expressionResolver` | Nested paths, missing field returns `""`, multiple tokens in one string, whole-string returns raw typed value |
| `IfNode` | All 6 operators, AND-combination, missing/null operands |
| `HttpRequestNode` | 2xx success, error propagation, timeout via `AbortController` |

---

## Deployment

The same script set used by every Lambda app in this monorepo. From `apps/workflow-executor/`:

```bash
bun run build           # bun build src/index.ts → dist/index.js (CJS, minified)
bun run zip             # dist/ + package.json → lambda.zip
bun run build:zip       # build + zip
bun run deploy          # aws lambda update-function-code
bun run deploy:full     # build + zip + deploy in one go
bun run logs            # aws logs tail … --follow
```

`deploy:full` is the day-to-day redeploy command. The handler entry-point and other Lambda config (memory, timeout, role) are set when the function is first created and are **not** updated by `update-function-code` — only the code zip is shipped.

### First-time function creation

```bash
aws lambda create-function \
  --function-name n8n-workflow-executor-dev \
  --runtime nodejs20.x \
  --handler dist/index.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-basic-role \
  --region ap-south-1
```

After creating, wire the SQS queue as an event source (see root `DEPLOYMENT.md` STEP 16).

---

## Lambda and SQS configuration

### Lambda settings

| Setting | Value | Reason |
|---|---|---|
| Function name | `n8n-workflow-executor-dev` | |
| Region | `ap-south-1` | |
| Runtime | `nodejs20.x` | Lambda doesn't run Bun at runtime — Bun is used only to build a Node-compatible CJS bundle |
| Handler | `dist/index.handler` | Exported from `src/index.ts` |
| Timeout | 900s (15 min) | Maximum allowed — long workflows need headroom |
| Memory | 512 MB | Increase if HTTP request bodies are large or future `CodeNode` runs heavy scripts |
| Trigger | SQS workflow queue | One execution per record (records are processed sequentially within an invocation) |
| Reserved concurrency | 10 | Adjust based on expected queue depth |
| DLQ | SQS DLQ on the source queue | Catches messages that fail all retries |

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
# Live tail (or use `bun run logs` from apps/workflow-executor/)
aws logs tail /aws/lambda/n8n-workflow-executor-dev --follow --region ap-south-1

# Filter by execution ID
aws logs filter-log-events \
  --log-group-name /aws/lambda/n8n-workflow-executor-dev \
  --filter-pattern "YOUR_EXECUTION_ID" \
  --region ap-south-1
```

### Inspect the DLQ

```bash
aws sqs receive-message \
  --queue-url https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/<your-dlq-name> \
  --max-number-of-messages 10 \
  --region ap-south-1
```

### Common issues

**Execution exits immediately with no node output**
The atomic claim returned null — a duplicate SQS message arrived and was correctly ignored. No action needed. Confirm by checking the original execution's status in MongoDB.

**Workflow stuck in `PROCESSING`**
Lambda crashed mid-run. The `cron-workflow-poller`'s stale-lock sweep (5 min threshold) will flip it back to `READY` automatically on the next tick. Manual recovery:

```bash
mongosh "$MONGODB_URI" --eval "
  db.workflows.updateMany(
    { status: 'PROCESSING', lockedAt: { \$lt: new Date(Date.now() - 5 * 60 * 1000) } },
    { \$set: { status: 'READY', lockedAt: null, lockId: null } }
  )
"
```

**Lambda OOM (exit code 137)**
Most often caused by very large HTTP response bodies being loaded into memory. Increase Lambda memory to 1024 MB, or add a size cap inside `HttpRequestNode`.

**`MongooseServerSelectionError` on cold start**
Lambda cannot reach MongoDB. Check: Atlas IP allowlist includes `0.0.0.0/0` (development) or Lambda is in the correct VPC with the right security group rules (production). Verify `MONGODB_URI` is set correctly in Lambda environment variables.

**Node marked `SKIPPED` unexpectedly**
The node's only incoming edge came from an IF branch whose handle didn't match `output.passed`. Check the IF node's `nodeResults` entry for `output.results[]` to see which condition flipped the branch.

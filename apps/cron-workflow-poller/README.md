# Cron Workflow Poller

EventBridge-triggered AWS Lambda that fires once a minute. Its sole job is to find workflows whose `nextRunAt` has elapsed, atomically claim them, create a `PENDING` execution record with a snapshot of the workflow graph, and enqueue an execution task on SQS for the executor to pick up.

This is the **scheduler** of the platform — it decides *when* something runs but never executes anything itself.

---

## Why a poller (not infinite loops)?

Running a long-lived process on Lambda is a non-starter (15-minute hard cap, billed per ms). The poller pattern gives us:

- **Bounded execution** — runs for a few hundred ms per tick, exits, sleeps until next EventBridge cron.
- **Crash recovery** — if a Lambda dies mid-poll, the next tick picks up where the previous left off; stuck locks expire after 5 minutes.
- **Cost** — ~43,200 invocations/month at <1s each → free tier eligible.
- **Horizontal safety** — multiple concurrent pollers can't double-execute thanks to atomic `findOneAndUpdate` locking and a unique `idempotencyKey` index.

---

## Pipeline

```
EventBridge "rate(1 minute)"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│ handler()                                                │
│                                                          │
│ 1. Stale-lock sweep                                      │
│    WorkflowModel.updateMany({                            │
│      status: "PROCESSING",                               │
│      lockedAt: { $lt: now - 5min }                       │
│    }, { status: "READY", lockedAt: null, lockId: null })│
│                                                          │
│ 2. Find due workflows                                    │
│    WorkflowModel.find({                                  │
│      active: true,                                       │
│      status: "READY",                                    │
│      nextRunAt: { $lte: now }                            │
│    }).limit(100)                                         │
│                                                          │
│ 3. Atomic lock per workflow                              │
│    findOneAndUpdate(                                     │
│      { workflowId, status: "READY" },                    │
│      { status: "QUEUED", lockedAt, lockId }              │
│    )                                                     │
│                                                          │
│ 4. Create PENDING Execution per locked workflow          │
│    {                                                     │
│      executionId: uuid(),                                │
│      workflowSnapshot: { nodes, edges },                 │
│      idempotencyKey: "<wfId>__<nextRunAt ISO>",          │
│      triggeredBy: "CRON",                                │
│      status: "PENDING"                                   │
│    }                                                     │
│    On duplicate-key error → release lock, skip           │
│                                                          │
│ 5. Push to SQS in chunks of 10                           │
│    SendMessageBatch with                                 │
│    body = { workflowId, executionId }                    │
│                                                          │
│ 6. Roll back SQS failures                                │
│    For each response.Failed: delete Execution,           │
│    release workflow lock                                 │
└─────────────────────────────────────────────────────────┘
        │
        ▼
   SQS FIFO ──▶ Workflow Executor Lambda
```

---

## Why each step matters

### 1. Stale-lock sweep

If the executor Lambda crashes mid-run, the workflow can be left in `PROCESSING` with no in-flight execution. After 5 minutes, the poller treats this as abandoned and releases the lock so the workflow can be retried.

### 2. Indexed find

The query uses the compound index `cron_poller_query` on `{ active, triggerType, status, nextRunAt }`. This is the only hot-path query in the system — every poll touches it.

### 3. Atomic lock (`findOneAndUpdate`)

If two pollers somehow run simultaneously (replay, retries, dev + prod sharing a DB), only one can flip the status from `READY → QUEUED`. The other gets `null` back and skips this workflow.

### 4. Idempotency key

```
idempotencyKey = `${workflowId}__${nextRunAt.toISOString()}`
```

The unique index on `Execution.idempotencyKey` is the second line of defense. If two pollers cover the same tick (e.g., retry storm), the second one's `ExecutionModel.create` throws a `code: 11000` duplicate-key error. The catch block releases the workflow lock and continues — no double-run, no manual cleanup needed.

### 5. Batch chunking

SQS `SendMessageBatch` caps at **10 entries** per call. The poller chunks `queueEntries` into groups of 10. Without this, sending 100 workflows in one batch would fail entirely.

### 6. Failure rollback

If SQS returns `response.Failed[]`, the poller deletes those Execution docs and releases the matching workflow locks. The next poll tick will pick them up cleanly — no orphan PENDING executions paired with stuck workflows.

---

## SQS message contract

The executor parses this exact shape from `record.body`:

```json
{ "workflowId": "uuid", "executionId": "uuid" }
```

Don't add or remove fields without updating `apps/workflow-executor/src/index.ts` together.

---

## Build & deploy

| Script                | What it does |
| --------------------- | ------------ |
| `bun run build`       | `bun build src/server.ts --target=node --bundle --minify --format=cjs` → `dist/server.js` |
| `bun run zip`         | `dist/` + `package.json` → `lambda.zip` |
| `bun run build:zip`   | build + zip |
| `bun run deploy`      | `aws lambda update-function-code --function-name n8n-workflow-poller-dev` |
| `bun run deploy:full` | build + zip + deploy |
| `bun run logs`        | `aws logs tail /aws/lambda/n8n-workflow-poller-dev --follow` |

### Stack

| Thing            | Value                                  |
| ---------------- | -------------------------------------- |
| AWS service      | Lambda + EventBridge `rate(1 minute)`  |
| Function name    | `n8n-workflow-poller-dev`              |
| Region           | `ap-south-1`                           |
| Runtime          | `nodejs20.x`                           |
| Handler          | `dist/server.handler`                  |
| Trigger          | EventBridge rule `n8n-trigger-poller`  |

### Required env vars

| Var               | Source              | Notes |
| ----------------- | ------------------- | ----- |
| `MONGODB_URI`     | SSM param           | Mongoose connection string |
| `QUEUE_URL_PATH`  | env (points to SSM) | SSM parameter path holding the SQS queue URL |

### First-time function creation

```bash
aws lambda create-function \
  --function-name n8n-workflow-poller-dev \
  --runtime nodejs20.x \
  --handler dist/server.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-basic-role \
  --region ap-south-1

# Wire to EventBridge (see root DEPLOYMENT.md STEP 15)
aws events put-rule \
  --name n8n-trigger-poller \
  --schedule-expression "rate(1 minute)"
```

---

## Notes & gotchas

- **`wf.nextRunAt` can be `null`** for misconfigured workflows; the poller falls back to `now` to avoid `null.toISOString()`.
- **`MessageGroupId` is `"trigger-poller-events"`** for the whole batch — FIFO ordering is per-message-group; per-workflow ordering is preserved by the unique dedupe `Id` (`wf._id`).
- **No business logic here.** Trigger-specific config (cron expression, webhook path) is computed by `apps/api` when the workflow is created. This service is intentionally generic so adding a new trigger type doesn't require changes here.
- **MongoDB connection** — uses `connectMongo()` singleton from `@repo/db` so the connection is re-used across warm invocations.

# CLAUDE.md — `apps/cron-workflow-poller`

EventBridge-triggered Lambda (`rate(1 minute)`). Finds workflows whose `nextRunAt <= now`, atomically locks them, creates a PENDING `Execution` doc with a graph snapshot, and pushes `{ workflowId, executionId }` to SQS for the executor.

## Entry point

`src/server.ts` — single file, single `handler` export.

## Build & deploy

```bash
bun run deploy:full    # build → zip → aws lambda update-function-code
bun run logs           # tail CloudWatch
```

Lambda: `n8n-workflow-poller-dev` · `ap-south-1`.

## Flow (must preserve this order)

1. **Stale-lock sweep** — `WorkflowModel.updateMany({ status: "PROCESSING", lockedAt < now-5min }, { status: "READY" })`. Recovers from executor Lambda crashes.
2. **Find candidates** — `WorkflowModel.find({ active, status: "READY", nextRunAt <= now }).limit(100)`.
3. **Lock per workflow** — `findOneAndUpdate({ workflowId, status: "READY" }, { status: "QUEUED", lockedAt, lockId })`. Atomic claim — if two pollers race, only one wins.
4. **Create `Execution` per locked workflow** with:
   - `executionId = crypto.randomUUID()`
   - `workflowSnapshot = { nodes, edges }` (so later workflow edits don't affect this run)
   - `idempotencyKey = \`${workflowId}__${nextRunAt.toISOString()}\`` — **unique index, see below**
   - `triggeredBy: "CRON"`, `status: "PENDING"`
5. **Push to SQS in chunks of 10** (`SendMessageBatch` cap). Body: `{ workflowId, executionId }`. `MessageGroupId: "trigger-poller-events"`.
6. **Rollback on SQS failure** — for each `response.Failed[i]`, delete the Execution and release the workflow lock so the next tick can retry.

## Idempotency

The unique index on `Execution.idempotencyKey` prevents duplicate executions. If two pollers somehow claim the same workflow on the same tick:
- Second insert throws `code: 11000`
- Catch block releases the lock (`status: READY`) and continues
- The workflow gets picked up cleanly on its next `nextRunAt`

**Don't change the idempotencyKey format** without also updating the executor's expectations and clearing the unique index — the pattern is documented in `execution.model.ts`.

## SQS contract — what the executor expects

```json
{ "workflowId": "uuid", "executionId": "uuid" }
```

The executor (`apps/workflow-executor/src/index.ts`) parses this from `record.body` and loads the matching Execution. Don't add or remove fields without updating both sides.

## Gotchas

- `wf.nextRunAt` can be `null` for misconfigured workflows — we fall back to `now`. Don't let `null` reach `.toISOString()`.
- `MessageGroupId` keeps the same value for the whole batch — that's fine for FIFO ordering per workflow because each batch entry already has a unique dedupe `Id`.
- `QUEUE_URL_PATH` env var is the **SSM parameter path**, not the queue URL.

## Don't

- **Don't poll without locking** — sending an unlocked workflow to SQS could cause duplicate runs.
- **Don't bypass the 10-message batch cap** — `SendMessageBatch` rejects larger batches entirely.
- **Don't write trigger-specific logic here** — keep this service generic; trigger config (cron expression, webhook path) is set when the workflow is created by `apps/api`.

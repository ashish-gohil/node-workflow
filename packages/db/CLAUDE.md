# CLAUDE.md — `@repo/db`

Mongoose models + connection singleton. Used by all backend Lambdas (`api`, `cron-workflow-poller`, `workflow-executor`).

## What's here

```
src/
├── index.ts                          Re-exports — import from here, not subfiles
├── connectMongo.ts                   Singleton mongoose.connect (call at handler top)
└── models/
    ├── workflow.model.ts             IWorkflow — graph + trigger + lock fields
    ├── execution.model.ts            IExecution — per-run snapshot + nodeResults
    ├── webhook-registration.model.ts IWebhookRegistration — path → workflow lookup
    ├── user.model.ts                 IUser
    ├── credential.model.ts           ICredential — per-user secrets
    └── prev-run-data.model.ts        IPrevRunData — last successful output per node
```

## Critical rule: don't import Mongoose into the frontend bundle

Pure-TS workflow interfaces (`IWorkflow`, `INode`, `IEdge`, `TriggerType`, etc.) live in **`@repo/types`**, NOT here. `workflow.model.ts` imports them from `@repo/types` and re-exports for backward compat.

If you add a new shared type:
- **Type-only** (no Mongoose) → `packages/types/src/<file>.ts` so the frontend can use it.
- **Mongoose schema + model** → `packages/db/src/models/<file>.ts`.

The frontend currently imports `@repo/types` directly for `CreateWorkflowPayload`, `INode`, `IEdge`, node config types, etc.

## Connection pattern

Every Lambda handler does this at the top:

```ts
import { connectMongo } from "@repo/db";

export const handler = async (event) => {
  await connectMongo();      // singleton — re-uses cached connection across invocations
  // ... handler logic
};
```

`connectMongo` reads `MONGODB_URI` from env. Lambda freezes connections between invocations, so the singleton avoids reconnect storms.

## Build

```bash
bun run build       # tsup → dist/index.{js,cjs,d.ts}
```

This package is consumed via `"@repo/db": "*"` workspace links — apps import from the built `dist/` output. **Rebuild after model changes** before testing dependent services, or use `bun run build:watch`.

## Workflow model — fields the executor + poller depend on

- `workflowId` (uuid, unique) — primary external ID
- `userId` (indexed)
- `active`, `status: "READY" | "QUEUED" | "PROCESSING" | "FAILED"`
- `triggerType: "MANUAL" | "CRON" | "WEBHOOK"`
- `cronExpression` (CRON only)
- `webhookId` (WEBHOOK only — FK to WebhookRegistration.webhookId, not _id)
- `lockedAt`, `lockId` — distributed lock for the poller
- `lastRunAt`, `nextRunAt`
- `graph: { nodes: INode[], edges: IEdge[] }` (Mixed type so adding new node types doesn't require schema migration)

Compound index `cron_poller_query`: `{ active, triggerType, status, nextRunAt }` — the poller hot path. Don't break this without checking poller cost.

## Execution model — what the executor writes to

- `executionId` (uuid, unique)
- `workflowId` (indexed)
- `workflowSnapshot: { nodes, edges }` — frozen at trigger time
- `idempotencyKey` (unique, sparse) — pattern `"<workflowId>__<scheduledAt ISO>"` for CRON, `"<workflowId>__<webhookRequestId>"` for WEBHOOK
- `status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "TIMED_OUT" | "CANCELLED" | "PARTIAL_SUCCESS"`
- `nodeResults: Map<nodeId, INodeResult>` — `{ status, startedAt, finishedAt, output, error }`
- `error: { nodeId, message }` — top-level summary

## Don't

- **Don't import `mongoose` in `@repo/types`** — keeps the frontend bundle clean.
- **Don't open new connections per handler** — always use `connectMongo()`.
- **Don't query workflows without an indexed field** at scale — the poller relies on the compound index.
- **Don't add required fields to existing models** without a migration plan; production docs won't have them.

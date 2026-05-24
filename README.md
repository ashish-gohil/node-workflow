# Node Workflow — Workflow Automation Platform

A serverless, n8n-style visual workflow automation platform. Users draw workflows on a canvas; the platform schedules them, executes nodes in topological order, and persists every run.

Built with **TypeScript**, **Turborepo**, **Bun**, **Next.js 15 (App Router)**, **Tailwind v4**, **Express on AWS Lambda**, **MongoDB Atlas**, **SQS**, **EventBridge**.

---

## Architecture

```
                            ┌──────────────────────┐
                            │  Frontend (Next.js)  │ ── Vercel
                            │  React Flow editor   │
                            └──────────┬───────────┘
                                       │ HTTPS
                                       ▼
                            ┌──────────────────────┐
                            │ API Gateway HTTP v2  │
                            └──────────┬───────────┘
                                       ▼
                            ┌──────────────────────┐
                            │  apps/api            │ ── Lambda (Express)
                            │  Auth · Workflow CRUD│
                            │  Webhook registration│
                            └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  MongoDB Atlas       │
                            │  workflows · users   │
                            │  executions · creds  │
                            └──────────────────────┘
                                       ▲
            EventBridge (rate 1 min)   │            SQS FIFO queue
                    │                  │                    │
                    ▼                  │                    ▼
   ┌──────────────────────────┐        │      ┌──────────────────────────┐
   │ apps/cron-workflow-poller│────────┼─────▶│ apps/workflow-executor   │
   │ Find ready workflows     │        │      │ Read execution snapshot  │
   │ Create PENDING execution │        │      │ Walk DAG · run nodes     │
   │ Push {wfId,execId} → SQS │        │      │ Honor IF branch handles  │
   └──────────────────────────┘        │      │ Persist node results     │
                                       └──────└──────────────────────────┘
```

### Data flow at a glance

1. **User creates a workflow** in the editor; `apps/api` POST `/workflows` persists it. For CRON triggers, the API computes `cronExpression` + `nextRunAt`. For WEBHOOK triggers, it inserts a `WebhookRegistration` doc.
2. **EventBridge fires every minute** → `apps/cron-workflow-poller` runs. It finds workflows with `nextRunAt <= now`, locks them (PROCESSING), creates a PENDING `Execution` doc carrying a snapshot of the graph, then sends `{ workflowId, executionId }` to SQS.
3. **SQS triggers `apps/workflow-executor`**. It reads the snapshot from the execution, builds tiers via `DAGResolver`, runs each node through `NodeRunner`, and honors IF-node branch handles (false-branch subtrees are marked SKIPPED).
4. **Engine writes** node statuses/outputs to the `Execution` doc and bumps the workflow's `lastRunAt` + `nextRunAt`.

---

## Repo layout

```
apps/
├── frontend/                 Next.js 15 App Router · React Flow · Tailwind v4
├── api/                      Express on Lambda — auth + workflow CRUD
├── cron-workflow-poller/     EventBridge-triggered Lambda — finds & queues due workflows
└── workflow-executor/        SQS-triggered Lambda — runs the DAG

packages/
├── types/                    Pure-TS Zod schemas + node UI metadata (no Mongoose)
├── db/                       Mongoose models + connection singleton (re-exports @repo/types)
├── auth/                     JWT middleware shared by api + frontend session route
├── eslint-config/            Shared ESLint config
└── typescript-config/        Shared tsconfig.base
```

---

## Build & deploy

Each Lambda service has the same script set in its `package.json`:

```bash
bun run build          # bundle entrypoint → dist/*.js (CJS, minified)
bun run zip            # dist + package.json → lambda.zip
bun run build:zip      # build + zip
bun run deploy         # aws lambda update-function-code …
bun run deploy:full    # build + zip + deploy
bun run logs           # aws logs tail … --follow
```

Deployed function names (all in `ap-south-1`):

| Service                 | Lambda function name          | Trigger              |
| ----------------------- | ----------------------------- | -------------------- |
| `apps/api`              | `n8n-workflow-api-dev`        | API Gateway HTTP v2  |
| `apps/cron-workflow-poller` | `n8n-workflow-poller-dev` | EventBridge `rate(1 minute)` |
| `apps/workflow-executor`| `n8n-workflow-executor-dev`   | SQS                  |

The first-time AWS setup (IAM role, SSM secrets, API Gateway, SQS, EventBridge wiring) is in [`DEPLOYMENT.md`](./DEPLOYMENT.md). Per-service Lambda redeploy cheat-sheets live in each `apps/*/README.md`.

Frontend deploys via **Vercel** on push to `main`.

---

## Local development

```bash
bun install
bun run dev        # turborepo runs everything in parallel
```

Or per-service:

```bash
cd apps/frontend && bun run dev
cd apps/api && bun run dev
cd apps/workflow-executor && bun run build && bun run dist/index.js
```

### Required env vars

| Service                  | Vars                                                |
| ------------------------ | --------------------------------------------------- |
| `apps/api`               | `MONGODB_URI`, `JWT_SECRET`, `QUEUE_URL_PATH` (SSM) |
| `apps/cron-workflow-poller` | `MONGODB_URI`, `QUEUE_URL_PATH` (SSM)            |
| `apps/workflow-executor` | `MONGODB_URI`                                       |
| `apps/frontend`          | `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`            |

All Lambda secrets are stored in **AWS SSM Parameter Store**; nothing sensitive in env files or git.

---

## Key concepts

### Trigger types

| triggerType | How it fires                                                       | Fields populated on workflow                |
| ----------- | ------------------------------------------------------------------ | ------------------------------------------- |
| `MANUAL`    | API POST `/workflows/:id/run` (pushes directly to SQS)             | —                                           |
| `CRON`      | Poller finds `nextRunAt <= now`, queues execution                  | `cronExpression`, `nextRunAt`               |
| `WEBHOOK`   | Inbound HTTP request hits the webhook handler (registration → SQS) | `webhookId` (FK to `WebhookRegistration`)   |

### Node types (executor registry)

- **Triggers:** `manualTrigger`, `scheduler`, `webhook`
- **Actions:** `httpRequest`, `set`, `if`, `code`*, `delay`*, `merge`*

\* not yet implemented in the executor registry; schemas exist in `@repo/types`.

### IF branching

IF nodes have `true` and `false` output handles. The engine inspects `output.passed`, marks edges with the matching `sourceHandle` as live, and skips any node whose only path is through a non-matching handle (recorded with `NodeExecutionStatus = "SKIPPED"`).

### Idempotency

Cron-triggered executions use `idempotencyKey = "<workflowId>__<nextRunAt ISO>"`. Two pollers covering the same tick can't double-create — the unique index on `Execution.idempotencyKey` makes the second insert fail, and the poller releases its workflow lock cleanly.

---

## Conventions

- **Bun** for everything (`bun install`, `bun run`, `bun build`, `bun test`). Avoid `npm`/`yarn`/`pnpm`.
- **No Mongoose imports in `@repo/types`** — that package must stay pure TypeScript so the frontend can import workflow types without dragging in `mongoose`.
- **Frontend** uses the FLOW design system: no inline styles, semantic Tailwind tokens, reuse components from `apps/frontend/components/ui/`.

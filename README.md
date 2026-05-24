# Node Workflow Platform

An n8n-style **visual workflow automation platform** built end-to-end on a serverless TypeScript stack. Users draw workflows on a canvas; the platform schedules them on cron, fires them from webhooks, and executes each node in topological order with branching, expression interpolation, and a full per-run audit trail.

Built with **Bun · TypeScript · Turborepo · Next.js 16 · React Flow · Express on AWS Lambda · MongoDB Atlas · SQS · EventBridge**.

---

## Table of contents

- [What you can do with it](#what-you-can-do-with-it)
- [Architecture at a glance](#architecture-at-a-glance)
- [Services](#services)
- [How the services connect](#how-the-services-connect)
- [Wow factors](#wow-factors)
- [Repo layout](#repo-layout)
- [Local setup](#local-setup)
- [Deploy](#deploy)
- [Conventions](#conventions)

---

## What you can do with it

- **Design workflows visually** — drag triggers and actions onto a canvas, connect them, configure each node through a schema-driven form.
- **Trigger by schedule** — set up interval (every N minutes/hours), daily, weekly, or raw cron schedules with timezone support.
- **Trigger by webhook** — register an HTTP endpoint with a custom path, methods, and auth strategy; inbound requests fire the workflow.
- **Trigger manually** — click "Run" to execute on demand.
- **Branch the DAG** — `IF` nodes with `true`/`false` output handles; the runtime prunes the un-taken branch and marks every skipped node so the audit trail stays honest.
- **Reference earlier outputs** — `{{NodeName.output.field}}` interpolation inside any node config, resolved automatically at run time.
- **Audit every run** — every execution stores an immutable snapshot of the workflow graph plus per-node status, output, error, and timing.

---

## Architecture at a glance

```
                                Vercel
                                  │
                          ┌───────▼────────┐
                          │  Frontend      │   Next.js · React Flow editor
                          │  (Next.js)     │   Schema-driven node configs
                          └───────┬────────┘
                                  │  HTTPS + Bearer JWT
                                  │  (server-side proxy injects token)
                          ┌───────▼────────┐
                          │ API Gateway    │   HTTP API v2
                          │  HTTP v2       │
                          └───────┬────────┘
                                  ▼
                          ┌────────────────┐
                          │  API Service   │   Express on Lambda
                          │  /auth         │   • Auth (email/password + Google OAuth)
                          │  /workflows    │   • Workflow CRUD
                          │  /executions   │   • Webhook registration
                          │                │   • Manual run dispatch → SQS
                          └───────┬────────┘
                                  │
                                  ▼
                          ┌────────────────┐                       SQS FIFO
                          │  MongoDB Atlas │                          │
                          │  • workflows   │                          │
                          │  • executions  │◀──── snapshot graph ◀────┤
                          │  • users       │                          │
                          │  • webhook reg │                          │
                          │  • credentials │                          │
                          │  • prev_run    │                          │
                          └──┬─────────────┘                          │
                             │                                        │
        ┌────────────────────┘                                        │
        │              EventBridge "rate(1 minute)"                   │
        │                       │                                     │
        ▼                       ▼                                     │
┌────────────────────────────────────┐                                │
│  Cron Workflow Poller              │                                │
│  (Lambda)                          │                                │
│  1. Stale-lock sweep               │                                │
│  2. Find ready: nextRunAt ≤ now    │                                │
│  3. Atomic lock per workflow       │                                │
│  4. Create PENDING Execution +     │────────── push msg ────────────┤
│     graph snapshot                 │                                │
│  5. SQS batch (chunks of 10)       │                                │
│  6. Roll back failed messages      │                                │
└────────────────────────────────────┘                                │
                                                                      │
                                                                      ▼
                                                       ┌─────────────────────────┐
                                                       │  Workflow Executor      │
                                                       │  (Lambda · SQS trigger) │
                                                       │  1. Atomic claim        │
                                                       │  2. DAG resolve         │
                                                       │  3. Per tier:           │
                                                       │     • run runnable      │
                                                       │     • skip pruned       │
                                                       │     • activate edges    │
                                                       │       (IF gate by       │
                                                       │        sourceHandle)    │
                                                       │  4. Persist results     │
                                                       │  5. Update workflow     │
                                                       │     nextRunAt / status  │
                                                       └─────────────────────────┘
```

---

## Services

### `apps/frontend` — Next.js editor
The only UI surface. Visual workflow editor (React Flow), schema-driven config dialogs, executions panel, NextAuth-based sign-in. All API calls go through a server-side proxy that injects the user's JWT. Deployed to **Vercel**.

📄 [`apps/frontend/README.md`](./apps/frontend/README.md)

### `apps/api` — Express on AWS Lambda
Stateless control plane. Owns auth, workflow CRUD, webhook registration, manual-run dispatch. Computes cron expressions and `nextRunAt` for scheduled triggers; upserts `WebhookRegistration` for webhook triggers; never executes workflows itself. Behind API Gateway HTTP v2.

📄 [`apps/api/README.md`](./apps/api/README.md)

### `apps/cron-workflow-poller` — EventBridge Lambda
The scheduler. Fires once per minute, atomically locks workflows whose `nextRunAt` has elapsed, creates `PENDING` execution records with a snapshot of the graph, and pushes `{ workflowId, executionId }` to SQS. Built-in stale-lock recovery, idempotency keys, and SQS-failure rollback.

📄 [`apps/cron-workflow-poller/README.md`](./apps/cron-workflow-poller/README.md)

### `apps/workflow-executor` — SQS Lambda
The runtime. Reads execution snapshots, walks the DAG in topological tiers via Kahn's algorithm, resolves `{{expressions}}`, runs each node through its registered adapter, and persists per-node status/output/error. Honors `IF` branching: the un-taken subtree is pruned and marked `SKIPPED`.

📄 [`apps/workflow-executor/README.md`](./apps/workflow-executor/README.md)

---

## Shared packages

| Package                | Purpose |
| ---------------------- | ------- |
| `@repo/types`          | Pure-TS Zod schemas + UI metadata for every node type. **No Mongoose** — the frontend imports these directly without dragging a database driver into the bundle. |
| `@repo/db`             | Mongoose models + `connectMongo()` singleton. Re-exports `@repo/types` so backend services have one import. |
| `@repo/auth`           | Shared JWT middleware (`authMiddleware`) and request typing used by `apps/api`. |
| `@repo/eslint-config`  | Shared ESLint rules. |
| `@repo/typescript-config` | Shared `tsconfig.base.json`. |

---

## How the services connect

### Creating a workflow

```
User clicks "Save" in the editor
  → Browser POSTs to /api/workflows (Next.js route)
  → Proxy injects JWT, forwards to API Gateway
  → apps/api validates, derives triggerType, computes
    cronExpression + nextRunAt (CRON) or upserts
    WebhookRegistration (WEBHOOK), persists workflow
  → Returns the saved workflow
```

### CRON-triggered execution

```
EventBridge fires (every minute)
  → apps/cron-workflow-poller wakes up
  → Finds workflows where nextRunAt ≤ now
  → Atomically locks them (status: READY → QUEUED)
  → Creates a PENDING Execution doc with workflowSnapshot
  → Pushes { workflowId, executionId } to SQS FIFO
  → SQS triggers apps/workflow-executor
  → Executor claims Execution (PENDING → RUNNING)
  → Walks DAG, runs nodes, persists results
  → On success: Workflow READY, recompute nextRunAt
```

### Manual execution

```
User clicks "Run" in the editor
  → POST /workflows/:id/run
  → apps/api atomically locks the workflow
  → Pushes { workflowId } directly to SQS
  → apps/workflow-executor runs the same DAG flow
```

### Webhook execution

When the workflow is created with a Webhook trigger, `apps/api` inserts a `WebhookRegistration` keyed by the user-chosen path. (The HTTP receiver for inbound webhooks would resolve this registration to a workflowId and enqueue an Execution — the receiver is not yet implemented; the registration plumbing is.)

---

## Wow factors

### 🧵 Frozen graph per execution
Every execution stores its own snapshot of `{ nodes, edges }` at trigger time. **Edits to a workflow never affect an in-flight run.** This is what makes the audit trail trustworthy — a year-old execution still has the exact graph that produced its results.

### 🔒 Multi-layer concurrency safety
Three independent mechanisms prevent double-execution:
1. **Atomic lock** — `findOneAndUpdate({ status: "READY" }, { status: "QUEUED" })` in the poller.
2. **Atomic claim** — `findOneAndUpdate({ status: "PENDING" }, { status: "RUNNING" })` in the executor (handles SQS at-least-once delivery).
3. **Idempotency key** — unique index on `Execution.idempotencyKey` (`<workflowId>__<scheduledAt ISO>`) — even if two pollers somehow create executions for the same tick, only one survives.

### 💀 Crash recovery without operator intervention
If an executor Lambda crashes mid-run, the next poller tick sweeps workflows in `PROCESSING` with `lockedAt > 5min ago` back to `READY`. No manual cleanup, no stuck workflows.

### 🌿 Honest branching with audit trail
IF nodes don't just "stop sending data" — the engine actively marks every pruned node as `SKIPPED` in the execution record. You can look at a run and see exactly which branch was taken.

### 🧠 Schema-driven everything
A single source of truth for every node type:
```
packages/types/src/nodes/HttpRequestSchema.ts
  ├── Zod schema    → backend validation
  └── UIMeta        → frontend renders the config form automatically
```
Adding a new node type: write the schema, register the adapter in the executor. The frontend dialog renders itself.

### 💸 Cost profile
The entire backend runs on AWS free tier for hobby workloads:
- API: pay-per-request Lambda
- Poller: ~43k Lambda invocations/month
- Executor: pay-per-message Lambda
- SQS, EventBridge, MongoDB Atlas free tier
- Vercel free tier for the frontend

### 🛠️ Same deploy story per service
Every Lambda app has the same `bun run deploy:full` script. One bundler (Bun), one CJS target, one Lambda update command. No frameworks, no IaC complexity for day-to-day deploys.

---

## Repo layout

```
.
├── apps/
│   ├── frontend/                  Next.js 16 — visual editor
│   ├── api/                       Express on Lambda — control plane
│   ├── cron-workflow-poller/      EventBridge Lambda — scheduler
│   └── workflow-executor/         SQS Lambda — runtime
│
├── packages/
│   ├── types/                     Pure-TS shared types (Zod + UIMeta)
│   ├── db/                        Mongoose models + connection singleton
│   ├── auth/                      JWT middleware
│   ├── eslint-config/             Shared ESLint
│   └── typescript-config/         Shared tsconfig
│
├── turbo.json                     Turborepo pipeline
├── package.json                   Workspace root
├── DEPLOYMENT.md                  One-time AWS infra setup
└── README.md                      You are here
```

---

## Local setup

### Prerequisites

- **Bun** v1.3+ (`curl -fsSL https://bun.sh/install | bash`)
- **MongoDB** — local Docker (`docker run -p 27017:27017 mongo`) or MongoDB Atlas
- **AWS account** (optional, for deploying — not needed for local dev)

### 1. Install dependencies

```bash
bun install
```

This installs every workspace at once and links `@repo/*` packages.

### 2. Build shared packages

```bash
bun run build --filter='@repo/*'
```

Or run the full pipeline once to seed everything:

```bash
bun run build
```

### 3. Set up environment variables

Each app has its own `.env`. Minimum for local dev:

**`apps/api/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/node-workflow
JWT_SECRET=dev-secret-change-in-prod
PORT=3001
```

**`apps/frontend/.env.local`**
```env
BACKEND_API_URL=http://localhost:3001
NEXTAUTH_SECRET=dev-secret-change-in-prod
NEXTAUTH_URL=http://localhost:3000
```

**`apps/workflow-executor/.env`** *(only if running locally — normally invoked by SQS)*
```env
MONGODB_URI=mongodb://localhost:27017/node-workflow
```

**`apps/cron-workflow-poller/.env`** *(only if running locally)*
```env
MONGODB_URI=mongodb://localhost:27017/node-workflow
QUEUE_URL_PATH=/local/queue-url
```

For local dev you can skip the poller and executor entirely — manual execution works without them. They're only needed if you're testing cron triggers end-to-end.

### 4. Run

All services in parallel:
```bash
bun run dev
```

Or individually:
```bash
cd apps/frontend && bun run dev          # http://localhost:3000
cd apps/api && bun run dev               # http://localhost:3001
cd apps/workflow-executor && bun run build && bun run dist/index.js
```

Open `http://localhost:3000`, sign up with email/password, and start building a workflow at `/workflows/new`.

---

## Deploy

Every Lambda service has the same script set:

```bash
bun run build:zip       # bundle + lambda.zip
bun run deploy          # aws lambda update-function-code
bun run deploy:full     # build + zip + deploy in one go
bun run logs            # aws logs tail … --follow
```

Deployed function names (all `ap-south-1`):

| Service                       | Lambda function name          | Trigger              |
| ----------------------------- | ----------------------------- | -------------------- |
| `apps/api`                    | `n8n-workflow-api-dev`        | API Gateway HTTP v2  |
| `apps/cron-workflow-poller`   | `n8n-workflow-poller-dev`     | EventBridge `rate(1 minute)` |
| `apps/workflow-executor`      | `n8n-workflow-executor-dev`   | SQS                  |

**Frontend** auto-deploys via Vercel on push to `main`.

**One-time AWS setup** (IAM role, SSM secrets, API Gateway, SQS, EventBridge wiring) is in [`DEPLOYMENT.md`](./DEPLOYMENT.md). Per-service redeploy cheat-sheets live in each `apps/*/README.md`.

---

## Conventions

- **Bun for everything** — `bun install`, `bun run`, `bun build`, `bun test`. Avoid `npm` / `yarn` / `pnpm`.
- **TypeScript everywhere** — no plain `.js` source files.
- **Pure-TS in `@repo/types`** — never import Mongoose, fs, or Node-only modules; the frontend depends on it.
- **MongoDB connections** — backend services always call `connectMongo()` from `@repo/db` (singleton, Lambda-safe).
- **Secrets** — never committed. Production secrets live in AWS SSM Parameter Store; frontend secrets in Vercel env vars.
- **Frontend styling** — strict design system (FLOW). No inline styles, no `var()` wrappers, semantic Tailwind tokens only, reuse `components/ui/` primitives.

---

## License

Private — built for personal/learning use.

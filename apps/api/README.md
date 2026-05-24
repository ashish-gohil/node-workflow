# API Service

Stateless Express application running on AWS Lambda (behind API Gateway HTTP v2). This is the single entrypoint for the web app — it handles authentication, workflow CRUD, manual execution dispatch, and webhook registration.

---

## Responsibilities

| Concern              | Detail |
| -------------------- | ------ |
| **Authentication**   | Email/password signup (bcrypt) and Google OAuth via NextAuth → JWT signed with `JWT_SECRET` |
| **Workflow CRUD**    | List, fetch, create, update; ownership-enforced on every route via `userId` from the JWT |
| **Trigger setup**    | Derives `triggerType`, computes `cronExpression` + `nextRunAt`, or upserts a `WebhookRegistration` |
| **Manual execution** | Atomically locks the workflow, pushes `{ workflowId }` to SQS so the executor picks it up |
| **Executions**       | Returns execution history for a workflow (`GET /executions`) |

The API never executes nodes itself — it owns the **schedule** and **ownership** layer; the executor owns the **runtime** layer.

---

## Architecture

```
        Frontend                                              MongoDB
        (Next.js)            Express on Lambda                 Atlas
            │                       │                            │
            ├── Bearer JWT ────────▶│                            │
            │                       │                            │
            │   ┌── /auth/* ────────┤── findOne / create ───────▶│
            │   │                   │                            │
            │   ├── /workflows ─────┤── workflow CRUD ──────────▶│
            │   │   (CRON path)     │── compute cron+nextRun     │
            │   │   (WEBHOOK path)  │── upsert WebhookReg ──────▶│
            │   │                   │                            │
            │   └── /workflows/:id/run ── atomic lock ──────────▶│
            │                       │── push to SQS              │
            │                       │       │                    │
            │                       │       ▼                    │
            │                       │     SQS FIFO ──▶ Executor  │
            ▼                       ▼                            ▼
```

---

## Project layout

```
src/
├── lambda.ts                   AWS Lambda handler — wraps Express via serverless-http
├── server.ts                   Local dev entrypoint (listen on :PORT)
├── index.ts                    Express app composition + route mounting
├── middlewares/
│   └── auth.ts                 Bearer JWT verification → req.user.id
└── routes/
    ├── workflow.ts             /workflows — list, fetch, create, update, run
    ├── execution.ts            /executions — execution history
    └── auth/
        ├── index.ts            mounts the auth sub-routes
        ├── signup.ts           POST /auth/signup       — email+password
        ├── oauth.ts            POST /auth/oauth        — NextAuth Google sign-in
        ├── credentials.ts      Per-user secrets management
        └── sync-user.ts        Upsert NextAuth session → backend user
```

---

## Public surface

### Authentication

| Method | Path                  | Purpose |
| ------ | --------------------- | ------- |
| POST   | `/auth/signup`        | Create user with email + password; returns JWT |
| POST   | `/auth/oauth`         | Upsert user from a Google OAuth payload; returns JWT |

JWTs are signed with `JWT_SECRET` and contain `{ id, email }`. Every protected route reads `Authorization: Bearer <jwt>` and populates `req.user`.

### Workflows

| Method | Path                          | Purpose |
| ------ | ----------------------------- | ------- |
| GET    | `/workflows`                  | List the current user's workflows |
| GET    | `/workflows/:workflowId`      | Fetch one (404 if not owner) |
| POST   | `/workflows`                  | Create — derives trigger artifacts |
| PUT    | `/workflows/:workflowId`      | Update — reconciles trigger artifacts, guards immutable fields |
| POST   | `/workflows/:id/run`          | Manual trigger — atomic lock → SQS enqueue |

### Executions

| Method | Path            | Purpose |
| ------ | --------------- | ------- |
| GET    | `/executions`   | List executions belonging to the user |
| POST   | `/executions`   | Direct execution insert (admin/internal) |

---

## Trigger artifact computation

A workflow's persisted shape depends on its **trigger node type**. The API derives this from `workflowData.graph.nodes.find(n => n.type === "trigger")` and branches:

### `CRON` (Scheduler trigger)

1. `getCronExpression(triggerNode)` — converts the SchedulerTrigger config to a standard 5-part cron string:
   - `interval` → `*/N * * * *` (minutes) or `0 */N * * *` (hours); seconds collapse to `* * * * *`
   - `daily` → `MM HH * * *`
   - `weekly` → `MM HH * * d1,d2,…`
   - `cron` → passthrough
2. `getSchedulerTimezone(triggerNode)` — reads `cfg.timezone` if present; falls back to `process.env.SCHEDULER_DEFAULT_TZ ?? "Asia/Kolkata"`. This is **passed to `CronExpressionParser.parse(expr, { tz })`** so the next-run is interpreted in the user's wall-clock zone, not Lambda's UTC.
3. Stores `cronExpression` + `nextRunAt` on the workflow doc.

### `WEBHOOK`

1. Upserts a `WebhookRegistration` keyed by `workflowId` (PUT) or creates a new one (POST):
   - `path` is normalized (strip leading `/`, lowercase) and falls back to the workflowId.
   - `httpMethod` — single method maps directly; multiple methods (or `HEAD`/`OPTIONS`) collapse to `"ANY"`.
   - Hits a unique index on `path` — collisions return **409 Conflict**, not 500.
2. Stores `webhookId` (FK to `WebhookRegistration.webhookId`) on the workflow.
3. On PUT, if the trigger type changed away from `WEBHOOK`, the stale registration is deleted.

### `MANUAL`

No artifacts. The workflow only runs when `POST /workflows/:id/run` is called.

---

## Manual run (`POST /workflows/:id/run`)

1. Fetch SSM parameter `process.env.QUEUE_URL_PATH` to resolve the SQS queue URL (URL is **not** hardcoded — secrets and infra-specific values live in SSM).
2. `findOneAndUpdate({ workflowId, status: "READY" }, { status: "PROCESSING", lockedAt, lockId })` — atomic lock prevents double-runs if two requests race.
3. `SendMessageCommand` to SQS with `MessageBody: { workflowId }`, `MessageGroupId: "api-events"` (FIFO).
4. On SQS failure, the lock is rolled back (status → READY) so the user can retry.

---

## Build & deploy

| Script                | What it does |
| --------------------- | ------------ |
| `bun run dev`         | Build once then `bun src/server.ts` for local Express |
| `bun run build`       | `bun build src/lambda.ts --target=node --bundle --minify --format=cjs` → `dist/lambda.js` |
| `bun run zip`         | `dist/` + `package.json` → `lambda.zip` |
| `bun run build:zip`   | build + zip |
| `bun run deploy`      | `aws lambda update-function-code --function-name n8n-workflow-api-dev` |
| `bun run deploy:full` | build + zip + deploy |
| `bun run logs`        | `aws logs tail /aws/lambda/n8n-workflow-api-dev --follow` |

### Stack

| Thing            | Value                                  |
| ---------------- | -------------------------------------- |
| AWS service      | Lambda + API Gateway HTTP v2           |
| Function name    | `n8n-workflow-api-dev`                 |
| Region           | `ap-south-1`                           |
| Runtime          | `nodejs20.x` (Node-compatible CJS from Bun's bundler) |
| Handler          | `dist/lambda.handler`                  |
| Secrets          | AWS SSM Parameter Store                |
| IAM role         | `lambda-basic-role`                    |

Lambda doesn't run Bun at runtime — we use Bun **only to build** the bundle, then ship Node-compatible CJS.

### Required env vars

| Var              | Source              | Notes |
| ---------------- | ------------------- | ----- |
| `MONGODB_URI`    | SSM param           | Mongoose connection string |
| `JWT_SECRET`     | SSM param           | Signs/verifies JWTs |
| `QUEUE_URL_PATH` | env (points to SSM) | SSM parameter path holding the SQS queue URL |
| `SCHEDULER_DEFAULT_TZ` | env (optional)| Fallback timezone for scheduler triggers (default `Asia/Kolkata`) |

### First-time function creation

```bash
aws lambda create-function \
  --function-name n8n-workflow-api-dev \
  --runtime nodejs20.x \
  --handler dist/lambda.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-basic-role \
  --environment Variables="{MONGODB_URI=/n8n/prod/mongodb-uri,JWT_SECRET=/n8n/prod/jwt-secret}" \
  --region ap-south-1
```

After creating, wire it to API Gateway (see root `DEPLOYMENT.md` STEP 14).

### Smoke test

```bash
aws lambda invoke \
  --function-name n8n-workflow-api-dev \
  --region ap-south-1 \
  --payload '{"version":"2.0","rawPath":"/health","requestContext":{"http":{"method":"GET"}}}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-out.json
cat /tmp/lambda-out.json
```

---

## Notes

- **MongoDB connection pooling** — `connectMongo()` (from `@repo/db`) maintains a singleton; Lambda freezes connections between invocations so we re-use rather than reconnect.
- **CRON timezone** — without the `{ tz }` option, `CronExpressionParser.parse` defaults to the runtime's local zone (UTC on Lambda). All wall-clock cron modes (daily/weekly/cron) **must** pass the timezone explicitly.
- **Mutable-field guard on PUT** — only `name`, `graph`, `active`, `triggerType`, `cronExpression`, `nextRunAt`, `webhookId` are updated. Clients cannot overwrite `userId`, `workflowId`, `status`, `lockedAt`, `lockId`, `version`, or timestamps.
- **No Mongoose in shared client types** — workflow interfaces (`IWorkflow`, `INode`, `IEdge`, `TriggerType`) live in `@repo/types`; the `@repo/db` workflow model imports and re-exports them so the frontend can use them without dragging Mongoose into the bundle.

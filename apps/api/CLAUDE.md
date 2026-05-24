# CLAUDE.md — `apps/api`

Express on AWS Lambda. Authenticated CRUD for workflows; triggers cron + webhook setup; enqueues manual runs.

## Entry points

- `src/lambda.ts` — Lambda handler (`serverless-http` wraps Express)
- `src/server.ts` — local dev entrypoint (`bun run dev`)
- `src/index.ts` — Express app composition
- `src/routes/` — route modules (`workflow.ts`, `execution.ts`, `auth.ts`, etc.)
- `src/middlewares/auth.ts` — JWT middleware → `req.user.id`

## Build & deploy

```bash
bun run deploy:full    # build → zip → aws lambda update-function-code
bun run logs           # tail CloudWatch
```

Lambda: `n8n-workflow-api-dev` · `ap-south-1`. Full redeploy cheat-sheet in `README.md`.

## Key routes (`src/routes/workflow.ts`)

| Route                          | What it does |
| ------------------------------ | ------------ |
| `GET /workflows`               | List user's workflows |
| `GET /workflows/:workflowId`   | Fetch one (404 if not owner) |
| `POST /workflows`              | Create — computes `cronExpression`+`nextRunAt` for CRON, inserts `WebhookRegistration` for WEBHOOK |
| `PUT /workflows/:workflowId`   | Update — recomputes trigger artifacts, reconciles webhook registration (upsert/delete), guards immutable fields (userId, status, lockedAt, version, …) |
| `POST /workflows/:id/run`      | Manual trigger — locks workflow → SQS via SSM `QUEUE_URL_PATH` |

## Trigger artifact helpers (top of `workflow.ts`)

- `getCronExpression(triggerNode)` — converts `SchedulerTrigger` config (interval/daily/weekly/cron modes) to a 5-part cron string.
- `getSchedulerTimezone(triggerNode)` — reads `cfg.timezone`, falls back to `SCHEDULER_DEFAULT_TZ` env, then `"Asia/Kolkata"`. **Must be passed as `{ tz }` to `CronExpressionParser.parse`** or Lambda's UTC clock will compute the wrong next run.
- `resolveHttpMethod(methods)` — collapses multiple methods (or HEAD/OPTIONS) to `"ANY"` since the `WebhookRegistration` model only supports `GET/POST/PUT/PATCH/DELETE/ANY`.
- `normalizeWebhookPath(raw, fallback)` — strips leading `/`, lowercases. Falls back to `workflowId` if config has no path.

## Gotchas

- Webhook path has a unique index — duplicate paths return **409**, not 500. On PUT, the webhook registration is **upserted by `workflowId`**; if a workflow switches away from WEBHOOK, the stale registration is deleted.
- `req.params.workflowId` in Express 5 types is `string | string[]` — explicit cast needed when passing to string-typed helpers.
- SQS region hardcoded to `ap-south-1`. `QUEUE_URL_PATH` env var is the **SSM parameter path**, not the queue URL itself.

## Don't

- **Don't import from `@repo/db` workflow types** in a way that drags Mongoose into the bundle path — use `@repo/types` for pure interfaces.
- **Don't update workflow status/lock/version fields** from the PUT handler — they're owned by the executor + poller.
- **Don't skip `await connectMongo()`** at the top of any handler that touches the DB.

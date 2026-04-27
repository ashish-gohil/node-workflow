# workflow-executor

Lambda-based workflow execution engine. Triggered by SQS messages, executes workflow DAGs node-by-node, stores results in MongoDB, and handles retries, failures, and idempotency.

---

## Table of contents

- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Running tests](#running-tests)
- [Deployment](#deployment)
- [SQS message format](#sqs-message-format)
- [Execution lifecycle](#execution-lifecycle)
- [Adding a new node type](#adding-a-new-node-type)
- [Monitoring and debugging](#monitoring-and-debugging)

---

## How it works

1. A trigger (cron poller, webhook, or manual API call) creates an `Execution` document in MongoDB with status `pending` and pushes a job message to SQS.
2. SQS triggers this Lambda with the job message.
3. The executor atomically claims the execution (flips status to `running`) to prevent duplicate processing.
4. It loads the workflow definition, runs a topological sort to determine the execution order, then runs each node tier sequentially (nodes within a tier run in parallel).
5. After each node, its output is written to `execution.nodeResults` in MongoDB.
6. Downstream nodes resolve `{{NodeName.output.field}}` expressions against the accumulated context before running.
7. On completion the execution is marked `success` or `failed`. On Lambda crash, SQS redelivers the message up to `maxReceiveCount`, then routes to the DLQ.

---

## Architecture

```
SQS (workflow-jobs)
        │
        ▼
┌─────────────────────────────────────────────┐
│              workflow-executor               │
│                                             │
│  handler.js                                 │
│    └── ExecutionEngine                      │
│          ├── DagResolver      (topo sort)   │
│          ├── NodeRunner       (execute + retry) │
│          ├── ContextManager   (store outputs)│
│          └── ExpressionResolver             │
│                                             │
│  Node adapters (src/nodes/)                 │
│    ├── HttpRequestNode                      │
│    ├── CodeNode                             │
│    ├── IfNode                               │
│    ├── SetVariableNode                      │
│    └── ...                                  │
└─────────────────────────────────────────────┘
        │
        ▼
   MongoDB (executions, workflows, prev_run_data)
```

---

## Project structure

```
workflow-executor/
├── src/
│   ├── handler.js              # Lambda entrypoint — parses SQS event, calls engine
│   ├── engine/
│   │   ├── ExecutionEngine.js  # Orchestrates the full run
│   │   ├── DagResolver.js      # Topological sort, tier grouping
│   │   ├── NodeRunner.js       # Executes one node, handles retries
│   │   ├── ContextManager.js   # Reads/writes nodeResults to MongoDB
│   │   └── ExpressionResolver.js  # Resolves {{Node.output.field}} syntax
│   ├── nodes/
│   │   ├── BaseNode.js         # Interface: execute(inputs, params, ctx) → output
│   │   ├── HttpRequestNode.js
│   │   ├── CodeNode.js
│   │   ├── IfNode.js
│   │   └── SetVariableNode.js
│   ├── db/
│   │   └── index.js            # Mongoose connection (reused across warm invocations)
│   └── utils/
│       ├── logger.js
│       └── errors.js
├── tests/
│   ├── engine/
│   └── nodes/
├── .env.example
├── package.json
└── README.md
```

---

## Environment variables

Copy `.env.example` to `.env` for local development. In AWS, set these as Lambda environment variables.

```bash
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/your-db
NODE_ENV=production

# Encryption key for credentials (32-byte hex string)
CREDENTIAL_ENCRYPTION_KEY=your-32-byte-hex-key-here

# Optional — defaults shown
LOG_LEVEL=info                   # debug | info | warn | error
EXECUTION_TIMEOUT_SECONDS=840    # 14 min — leave headroom under Lambda's 15-min limit
NODE_MAX_RETRY_ATTEMPTS=3
NODE_RETRY_BACKOFF_MS=1000
```

---

## Local development

### Prerequisites

- Node.js 20+ or Bun
- A running MongoDB instance (local or Atlas)
- AWS CLI configured (for SQS simulation, optional)

### Install dependencies

```bash
# From monorepo root
bun install

# Or inside this package
cd apps/workflow-executor
bun install
```

### Run locally with a mock SQS event

The executor is a pure function — you can invoke it locally by passing a mock SQS event directly.

```bash
# Create a test event file
cat > tmp/test-event.json << 'EOF'
{
  "Records": [
    {
      "messageId": "test-msg-1",
      "body": "{\"workflowId\":\"YOUR_WORKFLOW_ID\",\"executionId\":\"YOUR_EXECUTION_ID\",\"triggeredBy\":\"manual\",\"inputData\":{}}"
    }
  ]
}
EOF

# Run
node -e "
  const { handler } = require('./src/handler');
  const event = require('./tmp/test-event.json');
  handler(event).then(console.log).catch(console.error);
"
```

### Using the Lambda local emulator (optional)

```bash
npm install -g aws-lambda-ric
# or use SAM CLI
sam local invoke WorkflowExecutor --event tmp/test-event.json
```

---

## Running tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific file
bun test tests/engine/DagResolver.test.js
```

Key test scenarios to cover:

- `DagResolver` — linear graph, branching graph, parallel nodes, circular dependency detection
- `ExpressionResolver` — nested paths, missing fields, type coercion, multiple expressions in one string
- `NodeRunner` — successful run, retry on failure, exhausted retries, `continueOnFail` flag
- `IfNode` — true branch taken, false branch taken, both downstream branches marked correctly

---

## Deployment

This service is deployed as an AWS Lambda function triggered by SQS. Below are two options: manual zip (your current approach) and a GitHub Actions CI pipeline (recommended next step).

### Option A — Manual zip deploy (current approach)

Run this from inside `apps/workflow-executor`:

```bash
# 1. Install production dependencies only
bun install --production
# or: npm ci --omit=dev

# 2. Create the zip
zip -r workflow-executor.zip . \
  --exclude "*.test.js" \
  --exclude "tests/*" \
  --exclude ".env*" \
  --exclude "tmp/*" \
  --exclude "*.md"

# 3. Upload to Lambda
aws lambda update-function-code \
  --function-name workflow-executor \
  --zip-file fileb://workflow-executor.zip \
  --region ap-south-1          # change to your region

# 4. (If env vars changed) Update configuration
aws lambda update-function-configuration \
  --function-name workflow-executor \
  --environment Variables="{
    MONGODB_URI=your-uri,
    NODE_ENV=production,
    CREDENTIAL_ENCRYPTION_KEY=your-key
  }" \
  --region ap-south-1

# 5. Verify the deploy
aws lambda invoke \
  --function-name workflow-executor \
  --payload '{"Records":[]}' \
  --region ap-south-1 \
  /tmp/response.json && cat /tmp/response.json
```

Add a `deploy` script to `package.json` to avoid typing this each time:

```json
{
  "scripts": {
    "deploy": "bash scripts/deploy.sh"
  }
}
```

`scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

FUNCTION_NAME="workflow-executor"
REGION="ap-south-1"

echo "→ Installing production deps..."
bun install --production

echo "→ Zipping..."
zip -r workflow-executor.zip . \
  --exclude "*.test.js" --exclude "tests/*" \
  --exclude ".env*" --exclude "tmp/*" --exclude "*.md" \
  --exclude "node_modules/.cache/*"

echo "→ Uploading to Lambda..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://workflow-executor.zip \
  --region $REGION

echo "→ Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name $FUNCTION_NAME \
  --region $REGION

echo "✓ Deployed $FUNCTION_NAME"
rm workflow-executor.zip
```

---

### Option B — GitHub Actions CI/CD (recommended)

Create `.github/workflows/deploy-executor.yml` in your monorepo root:

```yaml
name: Deploy workflow-executor

on:
  push:
    branches: [main]
    paths:
      - 'apps/workflow-executor/**'
      - 'packages/db/**'       # redeploy if shared DB layer changes
      - 'packages/auth/**'

jobs:
  deploy:
    name: Deploy to Lambda
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        working-directory: apps/workflow-executor
        run: bun install --production

      - name: Zip artifact
        working-directory: apps/workflow-executor
        run: |
          zip -r ../../workflow-executor.zip . \
            --exclude "*.test.js" --exclude "tests/*" \
            --exclude ".env*" --exclude "*.md"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
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

          echo "✓ Deployed successfully"

      - name: Clean up
        run: rm workflow-executor.zip
```

**Required GitHub secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

The IAM user for CI needs only: `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:UpdateFunctionConfiguration`.

---

### Lambda configuration checklist

When creating or updating the Lambda function in the AWS console:

| Setting | Recommended value |
|---|---|
| Runtime | Node.js 20.x |
| Handler | `src/handler.handler` |
| Timeout | 900 seconds (15 minutes) |
| Memory | 512 MB (increase if CodeNode executes heavy scripts) |
| Concurrency | Reserved: 10 (adjust based on SQS queue throughput) |
| Trigger | SQS — `workflow-jobs` queue, batch size 1 |
| DLQ | SQS — `workflow-jobs-dlq` (after 3 failed attempts) |
| VPC | Only if your MongoDB is in a VPC |

**SQS queue settings:**

| Setting | Recommended value |
|---|---|
| Visibility timeout | 920 seconds (must exceed Lambda timeout) |
| Message retention | 4 days |
| Max receive count | 3 (before routing to DLQ) |

---

## SQS message format

Every message body is a JSON string with this shape:

```jsonc
{
  "workflowId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "executionId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "triggeredBy": "cron" | "webhook" | "manual",
  "inputData": {
    // For webhook: { body, headers, query }
    // For cron/manual: {}
  },
  "idempotencyKey": "wf_abc123__2026-04-26T09:00:00Z",

  // Optional — partial execution support (post-MVP)
  "stopAtNodeId": "node_4" | null
}
```

The `executionId` must already exist in MongoDB as a `pending` record before the message is sent. The executor does not create the execution record — it only claims and runs it.

---

## Execution lifecycle

```
pending → running → success
                 → failed
                 → timed_out   (set by cleanup job after 16 min)
                 → cancelled   (manual cancel via API)
```

Status transitions are atomic — the executor uses `findOneAndUpdate` with a condition on `status: "pending"` to claim an execution. If the record is already `running` (duplicate message), the update finds nothing and the Lambda exits cleanly without doing any work.

```js
const claimed = await Execution.findOneAndUpdate(
  { _id: executionId, status: 'pending' },
  { $set: { status: 'running', startedAt: new Date() } },
  { new: true }
);
if (!claimed) return; // already claimed by another worker
```

---

## Adding a new node type

1. Create `src/nodes/YourNode.js` extending `BaseNode`:

```js
import { BaseNode } from './BaseNode.js';

export class YourNode extends BaseNode {
  // inputs   — resolved parameter values (expressions already substituted)
  // rawParams — original parameter config from workflow definition
  // context  — full ExecutionContext object (read-only)
  async execute(inputs, rawParams, context) {
    // do your thing
    return {
      // whatever shape you want — downstream nodes reference this via
      // {{YourNodeName.output.yourField}}
      result: 'done'
    };
  }
}
```

2. Register it in `src/nodes/index.js`:

```js
export const NODE_REGISTRY = {
  http_request: HttpRequestNode,
  code: CodeNode,
  if: IfNode,
  set_variable: SetVariableNode,
  your_node_type: YourNode,   // ← add here
};
```

3. The `type` field on the workflow's node object must match the registry key exactly.

4. Write tests in `tests/nodes/YourNode.test.js`.

---

## Monitoring and debugging

### Checking execution status

```bash
# Get a specific execution from MongoDB
mongosh "$MONGODB_URI" --eval "
  db.executions.findOne(
    { _id: ObjectId('YOUR_EXECUTION_ID') },
    { nodeResults: 1, status: 1, error: 1 }
  )
"
```

### CloudWatch logs

```bash
# Tail live logs
aws logs tail /aws/lambda/workflow-executor --follow --region ap-south-1

# Filter for a specific execution
aws logs filter-log-events \
  --log-group-name /aws/lambda/workflow-executor \
  --filter-pattern "exec_YOUR_EXECUTION_ID" \
  --region ap-south-1
```

### Inspecting the DLQ

```bash
# Receive messages from DLQ (does not delete them)
aws sqs receive-message \
  --queue-url https://sqs.ap-south-1.amazonaws.com/ACCOUNT_ID/workflow-jobs-dlq \
  --max-number-of-messages 10 \
  --region ap-south-1
```

### Finding stuck executions

```js
// MongoDB query — executions running for more than 16 minutes
db.executions.find({
  status: 'running',
  startedAt: { $lt: new Date(Date.now() - 16 * 60 * 1000) }
})
```

Stuck executions should be handled by your `workflow-cron-poller` cleanup job, which runs this query and marks them `timed_out`.

---

## Common issues

**"Execution not claimed — already running"** in logs
Normal. A duplicate SQS message arrived. The second Lambda saw the execution already `running` and exited. No action needed.

**Lambda times out before workflow finishes**
Increase Lambda timeout (max 15 min) or set `settings.timeoutSeconds` on the workflow to a lower value so the executor marks it `timed_out` cleanly before Lambda forcibly kills the process.

**`MongooseServerSelectionError` on cold start**
Your Lambda is not in the same VPC as your MongoDB, or the Atlas IP allowlist doesn't include Lambda's IP range. For Atlas: allow `0.0.0.0/0` for development, or use Atlas Private Endpoints for production.

**Node outputs are very large and slowing down writes**
Add a `maxOutputSizeBytes` cap in `ContextManager.js` and truncate oversized outputs before writing. Log a warning when truncation occurs.
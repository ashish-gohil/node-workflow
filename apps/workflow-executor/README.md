# 🚀 Workflow Execution Engine (n8n-like) with Real-time Streaming Logs

A **distributed workflow execution engine** built using:

* **Bun + TypeScript**
* **MongoDB**
* **AWS Lambda + SQS + EventBridge**
* **Redis Pub/Sub**
* **WebSocket Server (real-time logs)**

This system executes workflows defined as **graphs (nodes + edges)** and provides **live visual execution logs like n8n**.

---

# 🧠 Evolution of Architecture

---

## ❌ V1: Naive Prototype (Initial Approach)

```text
Lambda → Load Workflow → Execute Entire Graph (Recursive)
```

### Characteristics:

* Single Lambda execution
* Recursive graph traversal
* In-memory state

### Problems:

* ❌ Lambda timeout
* ❌ No retry per node
* ❌ No persistence
* ❌ Delay blocks execution
* ❌ No scalability
* ❌ No observability

---

## ✅ V2: Distributed Execution Engine (Selected)

```text
Trigger → SQS → Worker Lambda
                  ↓
           Execute ONE node
                  ↓
           Save state (Mongo)
                  ↓
      Push next nodes → SQS
                  ↓
              Repeat
```

### Benefits:

* ✅ Horizontal scalability
* ✅ Fault tolerance
* ✅ Retry per node
* ✅ Long-running workflows
* ✅ Parallel execution
* ✅ Non-blocking delays

---

## 🚀 V3: Real-time Streaming Logs (Final Architecture)

```text
Worker Lambda
   ↓
Publish log → Redis Pub/Sub
   ↓
WebSocket Server (subscriber)
   ↓
Broadcast → React UI (live)
```

---

# 🏗️ Final Architecture Overview

```text
                ┌──────────────────────┐
                │   EventBridge Cron   │
                └─────────┬────────────┘
                          ↓
                ┌──────────────────────┐
                │  Scheduler Lambda    │
                └─────────┬────────────┘
                          ↓
                ┌──────────────────────┐
                │        SQS           │
                └─────────┬────────────┘
                          ↓
                ┌──────────────────────┐
                │   Worker Lambda      │
                │ (Execution Engine)   │
                └─────────┬────────────┘
                          ↓
        ┌───────────────┬───────────────┐
        ↓                               ↓
MongoDB (Execution State)      Redis Pub/Sub (Logs)
                                      ↓
                             WebSocket Server
                                      ↓
                                 React UI
```

---

# 🧱 Core Components

---

## 1. Workflow (MongoDB)

* Stores graph (nodes + edges)

---

## 2. Execution Collection

Tracks runtime state:

```ts
Execution {
  executionId
  workflowId
  status
  context
  nodes: {
    nodeId: {
      status
      input
      output
      error
      timestamps
    }
  }
}
```

---

## 3. SQS Queue

* Node-level execution jobs
* Enables retries & scaling

---

## 4. Worker Lambda

* Executes **one node per invocation**
* Pushes next nodes

---

## 5. Scheduler (EventBridge)

* Runs every minute
* Uses `nextRunAt`

---

## 6. Redis Pub/Sub

* Bridges Lambda → WebSocket
* Real-time log streaming

---

## 7. WebSocket Server

* Subscribes to Redis
* Broadcasts logs to UI

---

## 8. React UI

* React Flow graph
* Live node updates

---

# ⚙️ Execution Flow

```text
1. Trigger (manual / cron / webhook)
2. Create execution
3. Push trigger node → SQS
4. Worker executes node
5. Save logs (Mongo)
6. Publish logs (Redis)
7. WS server broadcasts
8. UI updates instantly
9. Push next nodes → SQS
```

---

# 🔁 Scheduler Flow

```text
EventBridge (1 min)
   ↓
Scheduler Lambda
   ↓
Find workflows (nextRunAt <= now)
   ↓
Push to SQS
   ↓
Update nextRunAt
```

---

# 📡 Real-time Logging Flow

```text
Lambda executes node
   ↓
emitLog() → Redis publish
   ↓
WS server receives
   ↓
Broadcast to clients
   ↓
React UI updates instantly
```

---

# 🧪 Running Locally

---

## 1. Install dependencies

```bash
bun install
```

---

## 2. Start MongoDB

```bash
docker run -p 27017:27017 mongo
```

---

## 3. Start Redis

```bash
docker run -p 6379:6379 redis
```

---

## 4. Start WebSocket server

```bash
bun run src/ws-server.ts
```

---

## 5. Run local executor

```bash
bun run dev
```

---

## 6. Environment variables

`.env`:

```env
MONGO_URI=mongodb://localhost:27017/workflows
REDIS_URL=redis://localhost:6379
QUEUE_URL=local
AWS_REGION=ap-south-1
```

---

# 🧪 Local Simulation

Use `local.ts` to simulate SQS:

```bash
bun run dev
```

---

# 📦 Build for Lambda

---

## 1. Build

```bash
bun run build
```

---

## 2. Create zip

```bash
cd dist
zip -r function.zip .
```

---

## 3. Deploy

```bash
aws lambda update-function-code \
  --function-name workflow-executor \
  --zip-file fileb://function.zip
```

---

# ⚙️ AWS Setup

---

## 1. Lambda

* Runtime: Node.js 18+
* Handler: `dist/index.handler`

---

## 2. SQS

* FIFO recommended
* Set `MessageGroupId = executionId`

---

## 3. EventBridge

```text
rate(1 minute)
```

---

## 4. IAM Permissions

```json
{
  "Action": [
    "sqs:SendMessage",
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage"
  ]
}
```

---

# 🔴 Redis Setup (Production)

Use:

* AWS ElastiCache Redis
* Or self-hosted Redis

---

# 🌐 WebSocket Deployment

Options:

### Simple:

* Deploy Node server (EC2 / VPS)

### Advanced:

* Use API Gateway WebSocket

---

# ⚠️ Important Design Principles

---

## 1. Idempotency

```ts
if (node already executed) → skip
```

---

## 2. Delay Handling

Use:

```text
SQS DelaySeconds
```

---

## 3. Stateless Execution

Each node execution is independent

---

## 4. Observability

* Mongo = persistent logs
* WS = real-time logs

---

## 5. Scalability

* SQS handles load
* Lambda scales automatically

---

# 📈 Future Improvements

* Replay execution (rerun failed node)
* Step debugger (pause/resume)
* Execution diff
* Multi-tenant isolation
* Rate limiting
* Auth for WebSocket

---

# 🧠 Summary

This system evolved from:

```text
Single Lambda → Distributed Engine → Real-time Observability Platform
```

---

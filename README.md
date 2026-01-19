# ⚡ n8n-like Workflow Automation Platform (Monorepo)

A **production-grade, event-driven workflow automation platform** inspired by **n8n**, built with **TypeScript**, **Turborepo**, **Next.js**, and **AWS Serverless**.

This repository contains a **full-stack monorepo** that powers a visual workflow builder (frontend) and a scalable backend capable of **trigger polling, queue-based execution, and secure API access**.

---

## 🧠 High-Level Overview

This system allows users to:

* Create workflows made of nodes and triggers
* Periodically evaluate which workflows are ready to run
* Execute workflow nodes asynchronously and reliably
* Scale automatically with zero server management

The architecture is **fully serverless**, **event-driven**, and **cost-efficient**.

---

## 🧱 Architecture Diagram (Conceptual)

```
┌──────────────┐
│   Frontend   │  (Next.js, Vercel)
│  Workflow UI │
└──────┬───────┘
       │ HTTPS
       ▼
┌────────────────────┐
│ API Gateway (HTTP) │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Main API Service   │  (AWS Lambda)
│ - Auth             │
│ - Workflow CRUD    │
│ - User APIs        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ MongoDB Atlas      │
│ (Workflows, Users) │
└────────────────────┘


⏱ EventBridge (every 1 min)
          │
          ▼
┌────────────────────┐
│ Trigger Poller     │  (AWS Lambda)
│ - Scan workflows   │
│ - Detect ready jobs│
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ SQS Queue          │
│ (Execution tasks)  │
└─────────┬──────────┘
          ▼
┌────────────────────┐
│ Worker Service     │  (AWS Lambda)
│ - Execute nodes    │
│ - Update workflow  │
└────────────────────┘
```

---

## 📦 Monorepo Structure

```
.
├── apps/
│   ├── web/                # Next.js frontend (n8n-like UI)
│   ├── api/                # Main backend API (Lambda)
│   ├── trigger-poller/     # Scheduled workflow poller
│   └── worker/             # Queue-based node executor
│
├── packages/
│   ├── db/                 # MongoDB + Mongoose (singleton)
│   └── auth/               # Shared auth middleware & types
│
├── turbo.json
└── README.md
```

---

## 🖥️ Frontend (Next.js)

**Location:** `apps/web`
**Deployed on:** **Vercel**

### Responsibilities

* Visual workflow editor (n8n-like)
* User authentication (NextAuth)
* Workflow creation, editing, deletion
* Trigger and node configuration
* Calls backend APIs securely

### Deployment

* Automatically deployed via Vercel
* Environment variables managed via Vercel dashboard

---

## 🔐 Main Backend API Service

**Location:** `apps/api`
**Deployed on:** **AWS Lambda + API Gateway (HTTP API)**

### Responsibilities

* User authentication & authorization
* Workflow CRUD APIs
* Secure verification of frontend sessions
* MongoDB persistence
* Entry point for all client requests

### Key Characteristics

* Stateless
* Serverless
* Auto-scaling
* Uses MongoDB connection singleton for performance

---

## ⏱ Trigger Poller Service

**Location:** `apps/trigger-poller`
**Deployed on:** **AWS Lambda + EventBridge**

### Why this exists

Running infinite loops in serverless is a **bad practice**.
Instead, this service runs **on a fixed schedule**.

### Responsibilities

* Runs every minute via EventBridge
* Scans workflows in MongoDB
* Determines which workflows or nodes are ready to execute
* Pushes execution tasks to SQS

### Benefits

* No infinite loops
* Predictable execution
* Cheap and reliable
* Easy to scale

---

## 📬 Worker (Node Executor) Service

**Location:** `apps/worker`
**Deployed on:** **AWS Lambda + SQS**

### Responsibilities

* Listens to SQS messages
* Executes workflow nodes
* Handles retries and failures
* Updates execution state in MongoDB

### Why SQS?

* Decouples execution from polling
* Automatic retries
* Backpressure handling
* Horizontal scaling

---

## 🗄️ Shared Packages

### `@repo/db`

* MongoDB + Mongoose
* Type-safe schemas
* Singleton connection (Lambda-safe)
* Shared across all services

### `@repo/auth`

* Auth middleware
* Shared request typing
* JWT verification utilities

---

## 🔐 Secrets & Configuration (Best Practice)

Secrets are **never committed**.

All sensitive values are stored in:

* **AWS SSM Parameter Store**
* **Vercel Environment Variables**

Examples:

* `MONGODB_URI`
* `JWT_SECRET`

Injected at runtime via AWS / Vercel.

---

## 🚀 Deployments Summary

| Service        | Platform      | Method               |
| -------------- | ------------- | -------------------- |
| Frontend       | Vercel        | Git-based deployment |
| API            | AWS Lambda    | Serverless Framework |
| Trigger Poller | AWS Lambda    | EventBridge schedule |
| Worker         | AWS Lambda    | SQS trigger          |
| Database       | MongoDB Atlas | Managed              |

---

## 🧪 Running Locally

### 1️⃣ Install dependencies

```bash
bun install
```

### 2️⃣ Setup environment variables

Create `.env` files where required:

```env
MONGODB_URI=mongodb://localhost:27017/n8n
JWT_SECRET=dev-secret
```

### 3️⃣ Start MongoDB

```bash
docker run -p 27017:27017 mongo
```

### 4️⃣ Run all services in dev mode

```bash
bun run dev
```

Or individually:

```bash
cd apps/web && bun run dev
cd apps/api && bun run dev
cd apps/trigger-poller && bun run dev
cd apps/worker && bun run dev
```

---

## 🧠 Design Principles

* Event-driven, not loop-based
* Serverless-first architecture
* Strong typing everywhere (TypeScript)
* Shared logic via packages
* Cost-efficient & scalable
* Production-grade patterns

---

## ✨ Future Enhancements

* Visual node execution debugger
* Retry & DLQ handling
* Workflow versioning
* Custom triggers (webhooks, cron, email)
* OAuth providers per workflow

---

## 🙌 Final Note

This project is designed to scale from **0 to production** with minimal operational overhead, following **real-world backend engineering best practices**.

If you’re building an automation platform, this architecture is **battle-tested, extensible, and cloud-native**.

Happy building 🚀

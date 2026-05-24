# CLAUDE.md — `apps/workflow-executor`

SQS-triggered Lambda. Reads `{ workflowId, executionId }` from each record, walks the workflow DAG, runs each node through its registered adapter, and persists per-node results to the `Execution` doc.

## Entry point

`src/index.ts` — Lambda handler. For each SQS record: `new ExecutionEngine(executionId, workflowId, nodeRegistry).executeWorkflow()`.

## Build & deploy

```bash
bun run deploy:full    # build → zip → aws lambda update-function-code
bun run test:run       # vitest (44+ tests)
bun run logs           # tail CloudWatch
```

Lambda: `n8n-workflow-executor-dev` · `ap-south-1`.

## File map

```
src/
├── index.ts                       Lambda handler
├── engine/
│   ├── ExecutionEngine.ts         Orchestrator — loads exec, walks tiers, marks branches
│   ├── DagResolver.ts             Topological sort → string[][] tiers
│   ├── ContextManager.ts          In-memory + DB state for node statuses/outputs
│   └── NodeRunner.ts              Resolves expressions → calls adapter → updates context
├── nodes/                         Node adapters — one per FlowNodeType
│   ├── index.ts                   nodeRegistry (THE registration table)
│   ├── BaseNode.ts                abstract execute(inputs, context, meta)
│   ├── ManualTriggerNode.ts       passthrough
│   ├── SchedulerTriggerNode.ts    stamps workflow.lastRunAt; outputs cron metadata
│   ├── HttpRequestNode.ts         fetch wrapper
│   ├── SetVariableNode.ts         passthrough
│   └── IfNode.ts                  evaluates conditions → { passed, results }
└── utils/expression-resolver.ts   {{NodeName.output.field}} interpolation
```

## ExecutionEngine flow (must preserve this order)

1. **Load workflow** (`WorkflowModel.findOne`).
2. **Atomic claim** the execution: `ExecutionModel.findOneAndUpdate({ executionId, status: "PENDING" }, { status: "RUNNING" })`. If null → another Lambda already grabbed this record, return early.
3. **Mark workflow PROCESSING** (the poller had set it QUEUED).
4. **Read `nodes`/`edges` from `execution.workflowSnapshot`** — NOT from the live workflow doc. The snapshot is immutable per run.
5. **DAGResolver.resolve()** → `string[][]` (tiers of nodeIds).
6. **For each tier:** decide runnable vs skipped via live-edge tracking (see "Branching" below). Run runnable nodes in parallel via `Promise.allSettled`. Activate outgoing edges.
7. **On success:** mark execution SUCCESS, workflow READY. For CRON, also recompute `nextRunAt`. For MANUAL/WEBHOOK, stamp `lastRunAt` (CRON's `lastRunAt` is owned by `SchedulerTriggerNode`).
8. **On failure:** mark execution FAILED with error, workflow FAILED.

## Branching (IF node)

The engine tracks `liveEdgeIds: Set<string>`. A node runs iff it's a root **OR** at least one incoming edge is live.

- **Non-IF nodes after success:** all outgoing edges go live.
- **IF nodes after success:** outgoing edges with `sourceHandle === "true"` go live only if `output.passed === true`; `sourceHandle === "false"` only if `passed === false`. Edges without a handle (legacy graphs) stay live.
- **Unreachable nodes:** marked `NodeExecutionStatus = "SKIPPED"` via `ContextManager.setNodeStatus`. Their outgoing edges stay un-activated, so their descendants are also skipped.

## Adding a new node type

1. Create `src/nodes/MyNode.ts` extending `BaseNode` and implementing `execute(inputs, context, meta) → Promise<ResolvedValue>`.
2. Register in `src/nodes/index.ts` under the matching `ActionNodeTypes.*` / `TriggerNodeTypes.*` key.
3. `inputs` is the node's `config` **after** `expressionResolver` has replaced `{{NodeName.output.field}}` placeholders — treat it as already-resolved data.
4. Use `meta.workflowId` / `meta.executionId` for any DB writes you need (e.g. trigger nodes stamping `lastRunAt`).

## SchedulerTriggerNode contract

- **Side effect:** stamps `workflow.lastRunAt = now` (so the engine's tail-end update skips `lastRunAt` for CRON to avoid double-write).
- **Output:** `{ triggeredAt, lastRunAt, cronExpression, nextRunAt, mode, every, unit, time, days, timezone }` — downstream nodes read via `{{Schedule Trigger.output.<field>}}`.

## IfNode contract

- **Inputs:** `{ conditions: [{ left, operator, right? }] }`. Operators: `equals`, `notEquals`, `greaterThan`, `lessThan`, `exists`, `contains`. Equality is loose (`==`) so `"5"` matches `5`.
- **Output:** `{ passed: boolean, results: [{ left, operator, right, passed }] }`. Conditions are AND-combined.

## Gotchas

- **Webhook trigger is aliased to `HttpRequestNode`** in the registry — not a real implementation. Don't rely on it for production.
- `setNodeStatus("SKIPPED")` does NOT call `setNodeOutput` — skipped nodes have no output for downstream nodes to read.
- `Promise.allSettled` is used per tier, but the engine throws on the **first** rejection — there's no partial-success across a tier.

## Don't

- **Don't read live workflow nodes/edges during a run** — always use `execution.workflowSnapshot`.
- **Don't add new fields to the SQS message body** without updating `apps/cron-workflow-poller` and `apps/api`'s `/run` route together.
- **Don't mutate node config in-place** in `NodeRunner` — `inputs` is the resolved snapshot for this execution.

/*


How Pause and Resume Actually Works

Think of it in two separate Lambda invocations with a gap between them:

Invocation 1 — hits the Delay node:
1. Runs tiers 0, 1, 2 normally — outputs written to MongoDB
2. Hits DelayNode in tier 3
3. DelayNode does NOT sleep. Instead:
   - Writes resumeFromNodeId and resumeAt to the execution record
   - Marks execution status as WAITING in MongoDB
   - Schedules a future SQS message (via EventBridge or SQS delay)
   - Throws SuspendExecutionSignal
4. ExecutionEngine catches SuspendExecutionSignal specifically
   — does NOT mark as FAILED
   — just exits cleanly
5. Lambda finishes. Zero cost while waiting.


The gap — nothing is running:
Execution record in MongoDB: status = WAITING, resumeFromNodeId = "node_4"
All previous node outputs are already in nodeResults
Cost: zero
Duration: however long the delay is — seconds, hours, days


Invocation 2 — resume message arrives:
1. SQS delivers the scheduled resume message
2. Lambda starts fresh — new invocation, no memory of invocation 1
3. Worker loads the execution record from MongoDB
4. Sees status = WAITING, resumeFromNodeId = "node_4"
5. DAGResolver produces the full tier list as normal
6. ExecutionEngine skips every node that already has status SUCCESS in nodeResults
7. Picks up from node_4, continues to completion


The key insight: the execution context stored in MongoDB IS the paused state. The Lambda process doesn't need to stay alive — MongoDB holds everything. The second Lambda is completely stateless — it just reads the record and continues from where it left off.
This is why ContextManager writing to MongoDB after every node matters. It's not just for observability. It's what makes resume possible.

The SuspendExecutionSignal
This is why you need a special error class that is not a real error. When DelayNode throws it:
NodeRunner sees it  → does NOT retry, does NOT mark node FAILED
                      re-throws immediately upward

ExecutionEngine sees it → does NOT mark execution FAILED
                          marks it WAITING, exits cleanly
Every other error means "something went wrong." SuspendExecutionSignal means "everything is fine, I'm deliberately pausing." The class distinction is what lets each layer respond differently without string-matching on error messages.

One More Edge Case — What If The Resume Message Never Arrives?
EventBridge or SQS could fail to deliver the scheduled message. The execution stays WAITING forever.
Your cleanup job (the cron poller running every few minutes) handles this. It finds executions in WAITING status where resumeAt has passed but status hasn't changed. It re-enqueues them. Same resume flow, just triggered by the cleanup job instead of the original scheduled message.
This is why resumeAt is stored on the execution record — the cleanup job needs to know whether the wait period has actually elapsed before re-enqueueing.

*/
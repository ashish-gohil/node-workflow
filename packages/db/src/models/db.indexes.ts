/**
 * db.indexes.ts
 *
 * Single source of truth for ALL MongoDB indexes across every collection.
 *
 * WHY A SEPARATE FILE?
 * Mongoose schema-level `.index()` calls only register the index definition
 * in memory. The index is not actually created in MongoDB until either:
 *   (a) autoIndex is true (default in dev, dangerous in prod — can block collection)
 *   (b) you explicitly call Model.ensureIndexes() / Model.syncIndexes()
 *
 * This file gives you:
 *   1. A single auditable place to review every index across the platform
 *   2. An explicit `ensureAllIndexes()` function to call at app startup (API server)
 *      and as a one-off migration when deploying schema changes
 *   3. Comments explaining WHY each index exists and which query it serves
 *
 * USAGE:
 *   // In your API server startup (Express app.ts / lambda handler warmup)
 *   import { ensureAllIndexes } from "@your-pkg/db/indexes";
 *   await ensureAllIndexes();
 *
 *   // As a one-off migration script
 *   npx tsx packages/db/src/db.indexes.ts
 */

import mongoose from "mongoose";
import { UserModel } from "./user.model";
import { WorkflowModel } from "./workflow.model";
import { ExecutionModel } from "./execution.model";
import { WebhookRegistrationModel } from "./webhook-registration.model";
import { CredentialModel } from "./credential.model";
import { PrevRunDataModel } from "./prev-run-data.model";

/* ═══════════════════════════════════════════════════════════════
   USERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — users collection
 *
 *  [Q1] Auth lookup — find user by email on every login attempt:
 *       { email: "<email>" }
 *       → covered by unique index on email (defined in schema)
 *       No extra index needed — email unique is already a B-tree index.
 *
 *  [Q2] OAuth upsert — findOneAndUpdate by email + provider on Google sign-in:
 *       { email: "<email>", provider: "google" }
 *       The email unique index handles this efficiently (single-doc scan after
 *       email match). A compound index would only help if the collection is
 *       enormous — skip for now.
 *
 *  [Q3] Admin — list users by provider type (e.g. how many Google vs credentials):
 *       { provider: "<provider>", createdAt: -1 }
 *       Low-frequency admin query — added as a partial index per provider.
 *
 * users is a low-write collection (one write per signup).
 * The schema-level unique index on email is the only critical one.
 * The index below is a nice-to-have for admin/analytics.
 */
const userIndexes = [
    {
        // [Q3] Admin analytics — group users by auth provider
        // Partial index per provider keeps each index small
        fields: { provider: 1, createdAt: -1 },
        options: { name: "users_by_provider" },
    },
] as const;

/* ═══════════════════════════════════════════════════════════════
   WORKFLOWS
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — workflows collection
 *
 * Query patterns this collection must serve:
 *
 *  [Q1] Cron poller (runs every 60s via EventBridge):
 *       { active: true, triggerType: "CRON", status: "READY", nextRunAt: { $lte: now } }
 *       → findOneAndUpdate to atomically claim a workflow
 *       CRITICAL PATH — must be sub-millisecond
 *
 *  [Q2] List all workflows for a user (dashboard):
 *       { userId: "<id>" }
 *       sort: { updatedAt: -1 }
 *
 *  [Q3] Stuck-workflow cleanup job (runs every 16 min):
 *       { status: { $in: ["QUEUED","PROCESSING"] }, lockedAt: { $lt: cutoff } }
 *
 *  [Q4] Webhook router (on every inbound HTTP request):
 *       handled by webhook_registrations collection — not here
 *
 *  [Q5] Fetch single workflow by workflowId (API + executor):
 *       { workflowId: "<id>" }
 *       → covered by the unique index on workflowId (defined in schema)
 */
const workflowIndexes = [
    {
        // [Q1] Cron poller compound index
        // Prefix order matters: highest-cardinality filters first (status, triggerType),
        // then the range field (nextRunAt) last so MongoDB can do an efficient range scan.
        fields: { active: 1, triggerType: 1, status: 1, nextRunAt: 1 },
        options: {
            name: "cron_poller_query",
            // Partial filter: only index CRON workflows — WEBHOOK/MANUAL never appear
            // in the poller query, so excluding them keeps the index smaller
            partialFilterExpression: {
                triggerType: "CRON",
                active: true,
            },
        },
    },
    {
        // [Q2] User dashboard — list workflows with newest-first sort
        fields: { userId: 1, updatedAt: -1 },
        options: { name: "user_workflows_by_updated" },
    },
    {
        // [Q3] Cleanup job — find workflows stuck in intermediate states
        fields: { status: 1, lockedAt: 1 },
        options: {
            name: "stuck_workflow_cleanup",
            // Only index rows that have a lockedAt value (i.e. were claimed)
            partialFilterExpression: {
                status: { $in: ["QUEUED", "PROCESSING"] },
            },
        },
    },
] as const;

/* ═══════════════════════════════════════════════════════════════
   EXECUTIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — executions collection
 *
 * This is the highest-write collection — every node run appends to nodeResults.
 * Keep the number of indexes minimal to avoid write amplification.
 *
 *  [Q1] Execution history for a workflow (UI panel + API):
 *       { workflowId: "<id>" }
 *       sort: { createdAt: -1 }
 *       limit: 20
 *
 *  [Q2] Fetch single execution by executionId (status polling):
 *       { executionId: "<id>" }
 *       → covered by unique index on executionId (defined in schema)
 *
 *  [Q3] Idempotency check (poller + webhook handler before enqueue):
 *       { idempotencyKey: "<key>" }
 *       → covered by unique sparse index on idempotencyKey (defined in schema)
 *
 *  [Q4] Stuck-execution cleanup job:
 *       { status: "RUNNING", startedAt: { $lt: cutoff } }
 *
 *  [Q5] Admin / analytics — all failed executions across all workflows:
 *       { status: "FAILED", createdAt: -1 }
 *
 *  [Q6] Worker atomic claim — executor flips PENDING → RUNNING:
 *       { executionId: "<id>", status: "PENDING" }
 *       → executionId unique index is sufficient; status is checked in the filter
 *         but the unique index on executionId makes the scan a single-doc lookup
 */
const executionIndexes = [
    {
        // [Q1] Execution history panel — most common read query
        fields: { workflowId: 1, createdAt: -1 },
        options: { name: "execution_history_by_workflow" },
    },
    {
        // [Q4] Cleanup job — find executions whose Lambda timed out
        fields: { status: 1, startedAt: 1 },
        options: {
            name: "stuck_execution_cleanup",
            partialFilterExpression: { status: "RUNNING" },
        },
    },
    {
        // [Q5] Admin dashboard / alerting — recent failures across all workflows
        fields: { status: 1, createdAt: -1 },
        options: {
            name: "failed_executions_recent",
            partialFilterExpression: { status: "FAILED" },
        },
    },
] as const;

/* ═══════════════════════════════════════════════════════════════
   WEBHOOK REGISTRATIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — webhook_registrations collection
 *
 *  [Q1] Webhook router — inbound HTTP request lookup (HOT PATH):
 *       { path: "<slug>", isActive: true }
 *       This fires on EVERY inbound webhook request, before any other logic.
 *       Must resolve in < 2ms.
 *       → covered by unique index on path (schema) + compound below
 *
 *  [Q2] List webhooks for a user (settings page):
 *       { userId: "<id>" }
 *
 *  [Q3] Find webhook registration for a workflow (workflow detail page):
 *       { workflowId: "<id>" }
 *       → covered by index on workflowId (defined in schema)
 */
const webhookIndexes = [
    {
        // [Q1] Router hot path — compound beats two separate indexes here because
        // MongoDB can satisfy the full query from a single index scan with no fetch
        fields: { path: 1, isActive: 1 },
        options: {
            name: "webhook_router_lookup",
            // Partial: only active webhooks participate in routing
            partialFilterExpression: { isActive: true },
        },
    },
    {
        // [Q2] Settings / management page
        fields: { userId: 1, createdAt: -1 },
        options: { name: "user_webhooks" },
    },
] as const;

/* ═══════════════════════════════════════════════════════════════
   CREDENTIALS
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — credentials collection
 *
 *  [Q1] Credential picker in workflow builder (per user, grouped by type):
 *       { userId: "<id>", type: "<type>" }
 *
 *  [Q2] Fetch single credential for decryption during execution:
 *       { credentialId: "<id>" }
 *       → covered by unique index on credentialId (if you add one — see note)
 *
 * NOTE: credentials is a low-volume, low-write collection.
 * userId index (defined in schema) covers most queries.
 * The compound below only adds value once you have many credential types per user.
 */
const credentialIndexes = [
    {
        // [Q1] Credential picker — filter by user AND type simultaneously
        fields: { userId: 1, type: 1 },
        options: { name: "user_credentials_by_type" },
    },
] as const;

/* ═══════════════════════════════════════════════════════════════
   PREV RUN DATA
   ═══════════════════════════════════════════════════════════════ */

/**
 * INDEX PLAN — prev_run_data collection
 *
 *  [Q1] Executor reads $prevRunData before each node execution:
 *       { workflowId: "<id>", nodeId: "<id>" }
 *       → unique compound index (defined in schema) covers this completely
 *
 *  [Q2] Cleanup — delete all prev run data when a workflow is deleted:
 *       { workflowId: "<id>" }
 *       → prefix of the unique compound index satisfies this without extra index
 *
 * No additional indexes needed — the schema-level unique compound index
 * { workflowId: 1, nodeId: 1 } covers all access patterns for this collection.
 */
const prevRunDataIndexes = [] as const; // schema indexes are sufficient

/* ═══════════════════════════════════════════════════════════════
   ENSURE ALL INDEXES
   ═══════════════════════════════════════════════════════════════ */

type IndexResult = {
    collection: string;
    status: "ok" | "error";
    message?: string;
};

/**
 * Creates all indexes across every collection.
 *
 * Safe to call multiple times — MongoDB is idempotent on index creation:
 * existing indexes with the same key pattern and options are left untouched.
 *
 * Call this:
 *   1. During API server / Lambda cold-start (once per process)
 *   2. As a standalone migration when you add new indexes
 *
 * Uses syncIndexes() rather than ensureIndexes():
 *   - ensureIndexes() only ADDS missing indexes
 *   - syncIndexes() ADDS missing + DROPS indexes that are no longer in the schema
 *   Set `sync = false` (default) if you want additive-only behaviour in prod.
 */
export async function ensureAllIndexes(sync = false): Promise<IndexResult[]> {
    const results: IndexResult[] = [];

    const targets = [
        { name: "users", model: UserModel, extraIndexes: userIndexes },
        { name: "workflows", model: WorkflowModel, extraIndexes: workflowIndexes },
        { name: "executions", model: ExecutionModel, extraIndexes: executionIndexes },
        { name: "webhook_registrations", model: WebhookRegistrationModel, extraIndexes: webhookIndexes },
        { name: "credentials", model: CredentialModel, extraIndexes: credentialIndexes },
        { name: "prev_run_data", model: PrevRunDataModel, extraIndexes: prevRunDataIndexes },
    ];

    for (const { name, model, extraIndexes } of targets) {
        try {
            // Register extra indexes onto the schema programmatically
            for (const idx of extraIndexes) {
                model.schema.index(idx.fields, idx.options);
            }

            if (sync) {
                // Drops stale indexes + creates missing ones (use for migrations)
                await model.syncIndexes();
            } else {
                // Only creates missing indexes — never drops (safe for production startup)
                await model.createIndexes();
            }

            results.push({ collection: name, status: "ok" });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            results.push({ collection: name, status: "error", message });
            console.error(`[db.indexes] Failed to sync indexes for "${name}":`, message);
        }
    }

    return results;
}

/* ═══════════════════════════════════════════════════════════════
   STANDALONE MIGRATION RUNNER
   ═══════════════════════════════════════════════════════════════
   Run with:  npx tsx packages/db/src/db.indexes.ts
   ═══════════════════════════════════════════════════════════════ */

async function runMigration() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI env var is not set");

    console.log("[db.indexes] Connecting to MongoDB...");
    await mongoose.connect(uri);

    console.log("[db.indexes] Running syncIndexes (additive + drop stale)...");
    const results = await ensureAllIndexes(true); // sync=true for migration

    for (const r of results) {
        const icon = r.status === "ok" ? "✓" : "✗";
        const suffix = r.message ? ` — ${r.message}` : "";
        console.log(`  ${icon} ${r.collection}${suffix}`);
    }

    const failed = results.filter((r) => r.status === "error");
    await mongoose.disconnect();

    if (failed.length > 0) {
        console.error(`\n[db.indexes] ${failed.length} collection(s) failed. See errors above.`);
        process.exit(1);
    }

    console.log("\n[db.indexes] All indexes synced successfully.");
    process.exit(0);
}

// run
if (require.main === module) {
    runMigration().catch((err) => {
        console.error("[db.indexes] Fatal:", err);
        process.exit(1);
    });
}
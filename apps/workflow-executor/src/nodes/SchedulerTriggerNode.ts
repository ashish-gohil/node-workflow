import { WorkflowModel } from "@repo/db";

import { ExecutionContext, ResolvedValue } from "../utils/expression-resolver";
import { BaseNode, NodeExecutionMeta } from "./BaseNode";

/**
 * Scheduler trigger node — fires once at the start of a cron-driven run.
 *
 * Side effect: stamps `lastRunAt = now` on the workflow document so the UI
 * and the next poll tick can see when this workflow most recently fired.
 *
 * Output: a small snapshot of the schedule that downstream nodes can read
 * via `{{Schedule Trigger.output.<field>}}` expressions.
 */
export class SchedulerTriggerNode extends BaseNode {
    async execute(
        inputs: ResolvedValue,
        _context: ExecutionContext,
        meta: NodeExecutionMeta
    ): Promise<ResolvedValue> {
        const triggeredAt = new Date();

        // Stamp lastRunAt at trigger time so "last run started" reflects
        // when the cron actually fired, not when the workflow finished.
        const wf = await WorkflowModel.findOneAndUpdate(
            { workflowId: meta.workflowId },
            { $set: { lastRunAt: triggeredAt } },
            { returnDocument: "after" }
        );

        const cfg = (inputs ?? {}) as Record<string, ResolvedValue>;

        return {
            triggeredAt: triggeredAt.toISOString(),
            lastRunAt: triggeredAt.toISOString(),
            cronExpression: wf?.cronExpression ?? null,
            nextRunAt: wf?.nextRunAt ? wf.nextRunAt.toISOString() : null,
            mode: (cfg.mode as ResolvedValue) ?? null,
            every: (cfg.every as ResolvedValue) ?? null,
            unit: (cfg.unit as ResolvedValue) ?? null,
            time: (cfg.time as ResolvedValue) ?? null,
            days: (cfg.days as ResolvedValue) ?? null,
            timezone: (cfg.timezone as ResolvedValue) ?? null,
        };
    }
}

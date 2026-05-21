"use client";

import type { ReactNode } from "react";
import {
  CodeNodeSchema,
  CodeNodeUIMeta,
  DelayNodeSchema,
  DelayNodeUIMeta,
  HttpRequestSchema,
  HttpRequestUIMeta,
  IfSchema,
  IfUIMeta,
  ManualTriggerSchema,
  ManualTriggerUIMeta,
  MergeNodeSchema,
  MergeNodeUIMeta,
  SchedulerTriggerSchema,
  SchedulerTriggerUIMeta,
  SetVariableSchema,
  SetVariableUIMeta,
  WebhookTriggerSchema,
  WebhookTriggerUIMeta,
  type NodeUIMeta,
} from "@repo/types";
import {
  Clock,
  Code2,
  GitBranch,
  Globe,
  Layers,
  MousePointerClick,
  Shuffle,
  Timer,
  Webhook,
} from "lucide-react";
import type { ZodType } from "zod";

export interface NodeRegistryEntry {
  schema: ZodType;
  uiMeta: NodeUIMeta;
  icon: ReactNode;
}

const iconClass = "size-5";

/**
 * Maps a workflow node type to its Zod schema and UI metadata. Only nodes
 * whose stored data already matches the shared schema appear here — others
 * stay on the legacy hand-written config dialog until migrated.
 *
 * Keys MUST match the `type` field stored on the React Flow node
 * (ActionNodeTypes / TriggerNodeTypes), not the schema's UIMeta.nodeType —
 * those occasionally diverge (e.g. trigger node types use `scheduler` /
 * `webhook`, while their UIMeta says `schedulerTrigger` / `webhookTrigger`).
 */
export const NODE_REGISTRY: Record<string, NodeRegistryEntry> = {
  /* ---------- Action nodes ---------- */
  httpRequest: {
    schema: HttpRequestSchema as unknown as ZodType,
    uiMeta: HttpRequestUIMeta,
    icon: <Globe className={iconClass} />,
  },
  set: {
    schema: SetVariableSchema as unknown as ZodType,
    uiMeta: SetVariableUIMeta,
    icon: <Shuffle className={iconClass} />,
  },
  if: {
    schema: IfSchema as unknown as ZodType,
    uiMeta: IfUIMeta,
    icon: <GitBranch className={iconClass} />,
  },
  code: {
    schema: CodeNodeSchema as unknown as ZodType,
    uiMeta: CodeNodeUIMeta,
    icon: <Code2 className={iconClass} />,
  },
  delay: {
    schema: DelayNodeSchema as unknown as ZodType,
    uiMeta: DelayNodeUIMeta,
    icon: <Timer className={iconClass} />,
  },
  merge: {
    schema: MergeNodeSchema as unknown as ZodType,
    uiMeta: MergeNodeUIMeta,
    icon: <Layers className={iconClass} />,
  },

  /* ---------- Trigger nodes ---------- */
  manualTrigger: {
    schema: ManualTriggerSchema as unknown as ZodType,
    uiMeta: ManualTriggerUIMeta as NodeUIMeta,
    icon: <MousePointerClick className={iconClass} />,
  },
  scheduler: {
    schema: SchedulerTriggerSchema as unknown as ZodType,
    uiMeta: SchedulerTriggerUIMeta as NodeUIMeta,
    icon: <Clock className={iconClass} />,
  },
  webhook: {
    schema: WebhookTriggerSchema as unknown as ZodType,
    uiMeta: WebhookTriggerUIMeta,
    icon: <Webhook className={iconClass} />,
  },
};

export function getNodeRegistryEntry(nodeType: string): NodeRegistryEntry | undefined {
  return NODE_REGISTRY[nodeType];
}

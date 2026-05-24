import {
  type CreateWorkflowPayload,
  type FlowNodeType,
  type IEdge,
  type INode,
  TriggerNodeTypes,
  type TriggerType,
} from "@repo/types";

import type { FlowEdge, FlowNode } from "@/app/types/flow";

const TRIGGER_NODE_TYPES = new Set<string>(Object.values(TriggerNodeTypes));

/** Derive the workflow-level triggerType from the single trigger node. */
function deriveTriggerType(nodes: FlowNode[]): TriggerType {
  const trigger = nodes.find((n) => TRIGGER_NODE_TYPES.has(n.type ?? ""));
  switch (trigger?.type) {
    case TriggerNodeTypes.SchedulerTrigger:
      return "CRON";
    case TriggerNodeTypes.Webhook:
      return "WEBHOOK";
    case TriggerNodeTypes.ManualTrigger:
    default:
      return "MANUAL";
  }
}

function toINode(node: FlowNode): INode {
  const nodeType = node.type as FlowNodeType;
  const kind: INode["type"] = TRIGGER_NODE_TYPES.has(node.type ?? "")
    ? "trigger"
    : "action";
  return {
    id: node.id,
    name: node.data.label,
    nodeType,
    type: kind,
    position: node.position,
    config: (node.data.config ?? {}) as Record<string, unknown>,
    error: null,
  };
}

function toIEdge(edge: FlowEdge): IEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  };
}

export function buildCreateWorkflowPayload(args: {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}): CreateWorkflowPayload {
  return {
    name: args.name,
    triggerType: deriveTriggerType(args.nodes),
    graph: {
      nodes: args.nodes.map(toINode),
      edges: args.edges.map(toIEdge),
    },
  };
}

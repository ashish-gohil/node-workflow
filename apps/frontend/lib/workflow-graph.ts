import type { FlowEdge, FlowNode } from "@/app/types/flow";

/**
 * Walk the workflow graph backward from `targetId` and return the ancestor
 * nodes ordered closest-first (direct parents come before grandparents).
 * Cycles are guarded by a visited set.
 */
export function getUpstreamNodes(
  targetId: string,
  nodes: FlowNode[],
  edges: FlowEdge[]
): FlowNode[] {
  const nodeIndex = new Map(nodes.map((n) => [n.id, n] as const));
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    const list = incoming.get(edge.target) ?? [];
    list.push(edge.source);
    incoming.set(edge.target, list);
  }

  const visited = new Set<string>();
  const ordered: FlowNode[] = [];
  const queue = [...(incoming.get(targetId) ?? [])];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) {continue;}
    visited.add(id);

    const node = nodeIndex.get(id);
    if (node) {ordered.push(node);}

    for (const parent of incoming.get(id) ?? []) {
      if (!visited.has(parent)) {queue.push(parent);}
    }
  }

  return ordered;
}

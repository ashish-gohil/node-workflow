import { Node, NodeProps, Position } from "@xyflow/react";
import { Square } from "lucide-react";

import { BaseHandle } from "@/components/handles/base-handle";
import { BaseNode, BaseNodeIcon } from "@/components/nodes/base-node";

export type ActionNodeData = Node<{
  label: string;
  description?: string;
}>;

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  return (
    <BaseNode
      selected={selected}
      tone="action"
      label={data.label}
      subtitle={data.description}
    >
      <BaseNodeIcon>
        <Square />
      </BaseNodeIcon>

      <BaseHandle position={Position.Left} type="target" id="action-in" />
      <BaseHandle position={Position.Right} type="source" id="action-out" />
    </BaseNode>
  );
}

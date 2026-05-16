import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Zap } from "lucide-react";

import { BaseNode, BaseNodeIcon } from "@/components/nodes/base-node";

export type TriggerNodeData = Node<{
  label: string;
  description?: string;
}>;

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <BaseNode
      selected={selected}
      tone="trigger"
      label={data.label}
      subtitle={data.description}
    >
      <BaseNodeIcon>
        <Zap />
      </BaseNodeIcon>

      <Handle
        id="trigger-out"
        type="source"
        position={Position.Right}
        className="bg-bg-canvas! border-text-primary! dark:border-border-strong! size-2.5! rounded-full! border-2! hover:border-accent-primary! transition-colors"
      />
    </BaseNode>
  );
}

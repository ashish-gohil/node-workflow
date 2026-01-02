import { Handle, Position, NodeProps, Node, useReactFlow } from "@xyflow/react";
import { CustomHandle } from "../handles/custom-handle";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
} from "@/components/base-node";
import { BaseHandle } from "@/components/base-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";

export type ActionNodeData = Node<{
  label: string;
  description?: string;
}>;

export function ActionNode({ id, data }: NodeProps<ActionNodeData>) {
  return (
    <NodeStatusIndicator
      status="loading" // success, initial, error
      variant="border"
      className="rounded-[10px]"
    >
      <BaseNode className="min-w-[160px]" id={id}>
        {/* Header */}
        <BaseNodeHeader>
          <BaseNodeHeaderTitle className="text-sm leading-tight">
            {data.label}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>

        {/* Content */}
        <BaseNodeContent>
          {data.description && (
            <div className="text-xs text-text-muted">{data.description}</div>
          )}
        </BaseNodeContent>

        {/* Target Handle */}
        <BaseHandle
          position={Position.Left}
          type="target"
          id="action-trigger-handle"
          className="bottom-2"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
}

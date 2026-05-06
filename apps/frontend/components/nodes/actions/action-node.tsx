import { Node, NodeProps, Position } from "@xyflow/react";

import { BaseHandle } from "@/components/handles/base-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import {
  BaseNode,
  BaseNodeDivider,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeSubtitle,
  BaseNodeTitle,
} from "@/components/nodes/base-node";

export type ActionNodeData = Node<{
  label: string;
  description?: string;
}>;

export function ActionNode({ id, data, selected }: NodeProps<ActionNodeData>) {
  return (
    <NodeStatusIndicator status="initial" variant="border">
      <BaseNode selected={selected} className="min-w-[220px]">
        {/* Header */}
        <BaseNodeHeader>
          <BaseNodeTitle>
            <h5 className="text-h5 font-semibold text-text-primary truncate">
              {data.label}
            </h5>
          </BaseNodeTitle>
        </BaseNodeHeader>

        {/* Subtitle */}
        {data.description && (
          <BaseNodeSubtitle>{data.description}</BaseNodeSubtitle>
        )}

        <BaseNodeDivider />

        {/* Footer */}
        <BaseNodeFooter>
          <span className="text-caption text-text-muted">No runs yet</span>
        </BaseNodeFooter>

        {/* Handles */}
        <BaseHandle
          position={Position.Left}
          type="target"
          id="action-in"
        />
        <BaseHandle
          position={Position.Right}
          type="source"
          id="action-out"
        />
      </BaseNode>
    </NodeStatusIndicator>
  );
}

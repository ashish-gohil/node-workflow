import { Handle, Node, NodeProps, Position } from "@xyflow/react";

import {
  BaseNode,
  BaseNodeDivider,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeSubtitle,
  BaseNodeTitle,
} from "@/components/nodes/base-node";

export type TriggerNodeData = Node<{
  label: string;
  description?: string;
}>;

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
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
        <span className="text-caption text-text-muted">Trigger</span>
      </BaseNodeFooter>

      {/* Output handle */}
      <Handle
        id="trigger-out"
        type="source"
        position={Position.Right}
        className="!bg-bg-canvas !border-[1.5px] !border-border-strong !size-2 !rounded-full hover:!border-forest-400 transition-colors"
      />
    </BaseNode>
  );
}

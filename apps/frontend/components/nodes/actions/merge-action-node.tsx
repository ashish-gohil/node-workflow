"use client";

import { NodeProps, Position } from "@xyflow/react";
import { Layers, PlusCircle } from "lucide-react";

import { MergeNodeType } from "@/app/types/actions";
import { BaseHandle } from "@/components/handles/base-handle";
import { ButtonHandle } from "@/components/handles/button-handle";
import { BaseNode, BaseNodeIcon } from "@/components/nodes/base-node";

/* MergeNode keeps the same tile dimensions as every other node so rows
 * line up. Inputs are evenly spread along the left edge; a single output
 * exits the right with the standard ButtonHandle "+" affordance. */

function edgeOffset(index: number, count: number): string {
  if (count <= 1) return "50%";
  const min = 22;
  const max = 78;
  return `${min + (index * (max - min)) / (count - 1)}%`;
}

export function MergeNode({ id, data, selected }: NodeProps<MergeNodeType>) {
  const inputCount = data.inputs ?? 2;

  return (
    <BaseNode
      selected={selected}
      tone="branch"
      label="Merge"
      subtitle={`${inputCount} inputs`}
      onDoubleClick={() => data.onEdit?.(id)}
    >
      <BaseNodeIcon>
        <Layers />
      </BaseNodeIcon>

      {/* Inputs (left edge). */}
      {Array.from({ length: inputCount }).map((_, index) => (
        <BaseHandle
          key={`input-${index}`}
          id={`input-${index}`}
          type="target"
          position={Position.Left}
          style={{ top: edgeOffset(index, inputCount) }}
        />
      ))}

      {/* Single output. */}
      <ButtonHandle
        id="output"
        nodeId={id}
        type="source"
        position={Position.Right}
      >
        <PlusCircle className="text-border-strong group-hover:text-text-secondary size-3" />
      </ButtonHandle>
    </BaseNode>
  );
}

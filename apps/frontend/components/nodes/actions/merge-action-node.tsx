"use client";

import { Position, NodeProps } from "@xyflow/react";
import { PlusCircle, Layers } from "lucide-react";

import { BaseNode } from "@/components/nodes/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { ButtonHandle } from "@/components/handles/button-handle";

import { MergeNodeType } from "@/app/types/actions";
import { BaseHandle } from "@/components/handles/base-handle";

export function MergeNode({ id, data, selected }: NodeProps<MergeNodeType>) {
  const inputCount = data.inputs ?? 2;

  return (
    <div className="group flex gap-2 h-10 justify-between items-center">
      <div className="relative">
        <NodeStatusIndicator
          status="initial"
          variant="border"
          className="rounded-r-[3px] rounded-l-[11px]"
        >
          <BaseNode
            onDoubleClick={() => data.onEdit?.(id)}
            className={`
              w-12 h-10
              ${selected ? "border-border-strong" : ""}
            `}
          >
            {/* -------- INPUT HANDLES (LEFT) -------- */}
            {Array.from({ length: inputCount }).map((_, index) => {
              const top =
                inputCount === 1
                  ? "50%"
                  : `${25 + (index * 50) / (inputCount - 1)}%`;

              return (
                <BaseHandle
                  key={`input-${index}`}
                  id={`input-${index}`}
                  type="target"
                  position={Position.Left}
                  style={{ top }}
                />
              );
            })}

            {/* -------- ICON -------- */}
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="size-5 text-text-secondary" />
            </div>

            {/* -------- OUTPUT HANDLE (RIGHT) -------- */}
            <ButtonHandle
              id="output"
              nodeId={id}
              type="source"
              position={Position.Right}
            >
              <PlusCircle className="size-3 text-border-strong group-hover:text-text-secondary" />
            </ButtonHandle>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

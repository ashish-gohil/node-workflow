"use client";

import { NodeProps, Position } from "@xyflow/react";
import { Layers, PlusCircle } from "lucide-react";

import { MergeNodeType } from "@/app/types/actions";
import { BaseHandle } from "@/components/handles/base-handle";
import { ButtonHandle } from "@/components/handles/button-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { BaseNode } from "@/components/nodes/base-node";

export function MergeNode({ id, data, selected }: NodeProps<MergeNodeType>) {
  const inputCount = data.inputs ?? 2;

  return (
    <div className="group flex h-10 items-center justify-between gap-2">
      <div className="relative">
        <NodeStatusIndicator
          status="initial"
          variant="border"
          className="rounded-l-[11px] rounded-r-[3px]"
        >
          <BaseNode
            onDoubleClick={() => data.onEdit?.(id)}
            className={`
              h-10 w-12
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
            <div className="flex h-full w-full items-center justify-center">
              <Layers className="text-text-secondary size-5" />
            </div>

            {/* -------- OUTPUT HANDLE (RIGHT) -------- */}
            <ButtonHandle
              id="output"
              nodeId={id}
              type="source"
              position={Position.Right}
            >
              <PlusCircle className="text-border-strong group-hover:text-text-secondary size-3" />
            </ButtonHandle>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

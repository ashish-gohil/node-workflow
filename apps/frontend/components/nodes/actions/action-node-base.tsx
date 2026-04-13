"use client";

import { Position } from "@xyflow/react";
import { CircleDot, PlusCircle } from "lucide-react";

import useFlow from "@/app/store/flow-store";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { BaseHandle } from "@/components/handles/base-handle";
import { ButtonHandle } from "@/components/handles/button-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { BaseNode } from "@/components/nodes/base-node";

interface OutputHandle {
  id: string;
  label?: string;
}

interface InputHandle {
  id: string;
  label?: string;
}

interface ActionNodeBaseProps {
  id: string;
  selected: boolean;
  icon: React.ReactNode;
  onEdit?: (id: string) => void;
  outputs: OutputHandle[];
  inputs?: InputHandle[];
}

export function ActionNodeBase({
  id,
  selected,
  icon,
  onEdit,
  outputs,
  inputs,
}: ActionNodeBaseProps) {
  const { nodes } = useFlow();

  const curNode = nodes.find((node) => node.id === id)!;

  return (
    <div className=" flex max-w-[110px] flex-col items-start  gap-2 gap-y-0.5">
      <div className="group relative">
        <NodeStatusIndicator
          status="success"
          variant="border"
          className="rounded-[6px]"
        >
          <BaseNode
            onDoubleClick={() => onEdit?.(id)}
            className={`
              h-10 w-12
              ${selected ? "border-border-strong" : ""}
            `}
          >
            {/* -------- INPUT HANDLES (LEFT) -------- */}
            {(inputs || [{ id: 1 }]).map((_, index) => {
              const top =
                !inputs || inputs.length === 1
                  ? "50%"
                  : `${25 + (index * 50) / (inputs.length - 1)}%`;

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
              {icon}
            </div>

            {/* -------- OUTPUT HANDLES -------- */}
            {outputs.map((output, index) => (
              <ButtonHandle
                key={output.id}
                id={output.id}
                nodeId={id}
                type="source"
                position={Position.Right}
                style={{
                  top: outputs.length === 1 ? "50%" : `${30 + index * 40}%`,
                }}
              >
                <ActionSheet
                  setConfigNodeId={(id) => {}}
                  sourceHandleId={output.id}
                  sourceNode={curNode}
                />
              </ButtonHandle>
            ))}
          </BaseNode>
        </NodeStatusIndicator>
      </div>
      <div className="text-text flex h-auto w-full text-wrap font-normal leading-4">
        Hello world
      </div>
    </div>
  );
}

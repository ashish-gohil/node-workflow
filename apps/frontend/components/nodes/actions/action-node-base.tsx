"use client";

import { Position } from "@xyflow/react";
import { PlusCircle, CircleDot } from "lucide-react";
import { BaseNode } from "@/components/nodes/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { ButtonHandle } from "@/components/handles/button-handle";
import { BaseHandle } from "@/components/handles/base-handle";
import ActionSheet from "@/app/workflow/new/action-sheet";
import useFlow from "@/app/store/flow-store";

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
    <div className=" flex gap-2 gap-y-0.5 max-w-[110px]  items-start flex-col">
      <div className="relative group">
        <NodeStatusIndicator
          status="success"
          variant="border"
          className="rounded-[6px]"
        >
          <BaseNode
            onDoubleClick={() => onEdit?.(id)}
            className={`
              w-12 h-10
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
            <div className="w-full h-full flex items-center justify-center">
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
      <div className="text-text font-normal leading-4 w-full text-wrap h-auto flex">
        Hello world
      </div>
    </div>
  );
}

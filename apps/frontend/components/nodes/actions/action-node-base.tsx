"use client";

import { Position } from "@xyflow/react";
import { PlusCircle, CircleDot } from "lucide-react";
import { BaseNode } from "@/components/nodes/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { ButtonHandle } from "@/components/handles/button-handle";
import { Button } from "@/components/ui/button";
import { BaseHandle } from "@/components/handles/base-handle";

interface OutputHandle {
  id: string;
  label?: string;
}

interface ActionNodeBaseProps {
  id: string;
  selected: boolean;
  icon: React.ReactNode;
  onEdit?: (id: string) => void;
  outputs: OutputHandle[];
}

export function ActionNodeBase({
  id,
  selected,
  icon,
  onEdit,
  outputs,
}: ActionNodeBaseProps) {
  return (
    <div className="group flex gap-2 h-10 justify-between items-center">
      <div className="relative">
        <NodeStatusIndicator
          status="initial"
          variant="border"
          className="rounded-r-[3px] rounded-l-[11px]"
        >
          <BaseNode
            onDoubleClick={() => onEdit?.(id)}
            className={`
              w-12 h-10 rounded-r-xs
              ${selected ? "border-border-strong" : ""}
            `}
          >
            {/* -------- INPUT HANDLE -------- */}
            <BaseHandle
              id="input"
              type="target"
              position={Position.Left}
            ></BaseHandle>

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
                  top: outputs.length === 1 ? "50%" : `${30 + index * 20}%`,
                }}
              >
                <PlusCircle className="size-3 text-border-strong group-hover:text-text-secondary" />
              </ButtonHandle>
            ))}
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

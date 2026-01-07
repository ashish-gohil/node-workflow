"use client";

import { Position, useReactFlow } from "@xyflow/react";
import { PlusCircle } from "lucide-react";

import { BaseNode } from "@/components/nodes/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { ButtonHandle } from "@/components/handles/button-handle";
import { Button } from "@/components/ui/button";
import { ExecutionStatus } from "@/app/types/tirggers";
import ActionSheet from "@/app/workflow/new/action-sheet";

interface TriggerNodeBaseProps {
  id: string;
  selected: boolean;
  icon: React.ReactNode;
  status: ExecutionStatus;
  onEdit?: (id: string) => void;
}

export function TriggerNodeBase({
  id,
  selected,
  icon,
  status,
  onEdit,
}: TriggerNodeBaseProps) {
  const { setNodes } = useReactFlow();
  return (
    <div className="group flex gap-2 h-10 justify-between items-center">
      {/* Execute */}
      <Button
        allowCorners
        cornerSize="xs"
        className="opacity-0 group-hover:opacity-100 h-8 tracking-tight"
      >
        Execute step
      </Button>

      <div className="relative">
        <NodeStatusIndicator
          status={status}
          variant="border"
          className="rounded-r-[3px] rounded-l-[11px]"
        >
          <BaseNode
            onDoubleClick={() => onEdit?.(id)}
            className={`
              w-12 h-10 rounded-r-xs
              ${selected ? "border-border-strong hover:ring-border-default" : ""}
            `}
          >
            {/* -------- ICON -------- */}
            <div className="w-full h-full flex items-center justify-center">
              {icon}
            </div>

            {/* -------- OUTPUT HANDLE -------- */}
            <ButtonHandle
              id="output"
              nodeId={id}
              type="source"
              position={Position.Right}
            >
              <ActionSheet setConfigNodeId={(id) => {}} setNodes={setNodes} />
              {/* <PlusCircle className="size-3 text-border-strong group-hover:text-text-secondary" /> */}
            </ButtonHandle>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

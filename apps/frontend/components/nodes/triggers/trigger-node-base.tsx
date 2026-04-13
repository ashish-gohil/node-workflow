"use client";

import { Position, useReactFlow } from "@xyflow/react";

import useFlow from "@/app/store/flow-store";
import { ExecutionStatus } from "@/app/types/tirggers";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { ButtonHandle } from "@/components/handles/button-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { BaseNode } from "@/components/nodes/base-node";
import { Button } from "@/components/ui/button";

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
  const { nodes } = useFlow();

  const curNode = nodes.find((node) => node.id === id)!;

  return (
    <div className="group flex h-10 items-center justify-between gap-2">
      {/* Execute */}
      <Button
        allowCorners
        cornerSize="xs"
        className="h-8 tracking-tight opacity-0 group-hover:opacity-100"
      >
        Execute step
      </Button>

      <div className="relative">
        <NodeStatusIndicator
          status={status}
          variant="border"
          className="-l-[6px]"
        >
          <BaseNode
            onDoubleClick={() => onEdit?.(id)}
            className={`
              h-10 w-12 
              ${selected ? "border-border-strong hover:ring-border-default" : ""}
            `}
          >
            {/* -------- ICON -------- */}
            <div className="flex h-full w-full items-center justify-center">
              {icon}
            </div>

            {/* -------- OUTPUT HANDLE -------- */}
            <ButtonHandle
              id={`${id}-output`}
              nodeId={id}
              type="source"
              position={Position.Right}
            >
              <ActionSheet
                setConfigNodeId={(id) => {}}
                sourceHandleId={`${id}-output`}
                sourceNode={curNode}
              />
            </ButtonHandle>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

"use client";
import { Position, NodeProps, Node } from "@xyflow/react";
import { PlusCircle, TimerIcon } from "lucide-react";

import { ButtonHandle } from "@/components/button-handle";
import { Button } from "../button";
import { BaseNode } from "@/components/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { SchedulerTriggerNodeType } from "@/app/types/tirggers";

export function SchedulerTriggerNode({
  id,
  data,
  selected,
}: NodeProps<SchedulerTriggerNodeType>) {
  return (
    <div className="group flex gap-2 h-10 justify-between items-center ">
      <Button
        allowCorners={true}
        cornerSize="xs"
        className="opacity-0 group-hover:opacity-100 h-8"
      >
        Execute step
      </Button>
      <div className="relative">
        <NodeStatusIndicator
          status="loading" // success, initial, error
          variant="border"
          className="rounded-r-[3px] rounded-l-[11px] w-full"
        >
          <BaseNode
            className={`w-12 rounded-r-xs h-10 ${selected ? "border-border-strong hover:ring-border-default" : ""}`}
          >
            <div className="w-full h-full flex justify-center items-center">
              <TimerIcon className="text-text-secondary size-5" />
            </div>

            <ButtonHandle
              id="manual-trigger-handle"
              nodeId={id}
              position={Position.Right}
              type="source"
            >
              <div>
                <PlusCircle className="text-border-strong group-hover:text-text-secondary" />
              </div>
            </ButtonHandle>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    </div>
  );
}

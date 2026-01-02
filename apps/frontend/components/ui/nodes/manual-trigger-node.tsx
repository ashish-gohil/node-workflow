"use client";
import { Position, NodeProps, useReactFlow } from "@xyflow/react";
import { MousePointerClick, PlusCircle } from "lucide-react";

import { ButtonHandle } from "@/components/button-handle";
import { Button } from "../button";
import { BaseNode } from "@/components/base-node";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import { type ManualTriggerNodeType } from "@/app/types/tirggers";

export function ManualTriggerNode({
  id,
  data,
  selected,
}: NodeProps<ManualTriggerNodeType>) {
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
          status={data.execution} // success, initial, error
          variant="border"
          className="rounded-r-[3px] rounded-l-[11px] w-full"
        >
          <BaseNode
            className={`w-12 rounded-r-xs h-10 ${selected ? "border-border-strong hover:ring-border-default" : ""}`}
          >
            <div className="w-full h-full flex justify-center items-center">
              <MousePointerClick className="text-text-secondary size-5" />
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

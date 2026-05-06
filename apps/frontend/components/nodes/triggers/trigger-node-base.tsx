"use client";

import { Position, useReactFlow } from "@xyflow/react";
import { Play } from "lucide-react";

import useFlow from "@/app/store/flow-store";
import { ExecutionStatus } from "@/app/types/tirggers";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { ButtonHandle } from "@/components/handles/button-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import {
  BaseNode,
  BaseNodeDivider,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeTitle,
} from "@/components/nodes/base-node";
import { Button } from "@/components/ui/button";

interface TriggerNodeBaseProps {
  id: string;
  selected: boolean;
  icon: React.ReactNode;
  label?: string;
  subtitle?: string;
  status: ExecutionStatus;
  onEdit?: (id: string) => void;
}

export function TriggerNodeBase({
  id,
  selected,
  icon,
  label = "Trigger",
  subtitle,
  status,
  onEdit,
}: TriggerNodeBaseProps) {
  const { nodes } = useFlow();
  const curNode = nodes.find((node) => node.id === id)!;

  return (
    <div className="group flex items-center gap-2">
      {/* Execute step (appears on hover) */}
      <Button
        variant="secondary"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]"
        aria-label="Execute this step"
      >
        <Play className="size-3" aria-hidden="true" />
        Execute
      </Button>

      <NodeStatusIndicator status={status as any} variant="border">
        <BaseNode
          selected={selected}
          onDoubleClick={() => onEdit?.(id)}
          className="min-w-[220px]"
        >
          {/* Header */}
          <BaseNodeHeader>
            <BaseNodeTitle>
              <span className="text-forest-300 shrink-0 [&_svg]:size-4">
                {icon}
              </span>
              <h5 className="text-h5 font-semibold text-text-primary truncate">
                {label}
              </h5>
            </BaseNodeTitle>

            <button
              aria-label="Node options"
              className="text-text-muted hover:text-text-primary hover:bg-white/[0.04] size-6 rounded-sm inline-flex items-center justify-center transition-colors duration-[120ms] shrink-0"
            >
              <span className="text-body-md leading-none">⋯</span>
            </button>
          </BaseNodeHeader>

          {/* Subtitle */}
          {subtitle && (
            <p className="px-4 pb-1 text-mono-sm font-mono text-text-muted truncate">
              {subtitle}
            </p>
          )}

          <BaseNodeDivider />

          {/* Footer / status */}
          <BaseNodeFooter>
            <span className="text-caption text-text-muted">Trigger</span>

            {/* Output handle */}
            <ButtonHandle
              id={`${id}-output`}
              nodeId={id}
              type="source"
              position={Position.Right}
            >
              <ActionSheet
                setConfigNodeId={() => {}}
                sourceHandleId={`${id}-output`}
                sourceNode={curNode}
              />
            </ButtonHandle>
          </BaseNodeFooter>
        </BaseNode>
      </NodeStatusIndicator>
    </div>
  );
}

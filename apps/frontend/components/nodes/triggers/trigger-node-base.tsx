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
        className="opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
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
              <h5 className="text-h5 text-text-primary truncate font-semibold">
                {label}
              </h5>
            </BaseNodeTitle>

            <button
              aria-label="Node options"
              className="text-text-muted hover:text-text-primary hover:bg-accent-subtle inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors duration-[120ms]"
            >
              <span className="text-body-md leading-none">⋯</span>
            </button>
          </BaseNodeHeader>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-mono-sm text-text-muted truncate px-4 pb-1 font-mono">
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

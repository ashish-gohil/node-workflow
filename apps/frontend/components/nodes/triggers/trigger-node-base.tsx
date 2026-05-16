"use client";

import { Position } from "@xyflow/react";
import { Play } from "lucide-react";

import useFlow from "@/app/store/flow-store";
import { ExecutionStatus } from "@/app/types/tirggers";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { ButtonHandle } from "@/components/handles/button-handle";
import {
  BaseNode,
  BaseNodeBadge,
  BaseNodeIcon,
} from "@/components/nodes/base-node";
import { Button } from "@/components/ui/button";

/* Map workflow execution status to BaseNode visual status. */
const STATUS_MAP: Record<
  ExecutionStatus,
  "default" | "running" | "success" | "error"
> = {
  initial: "default",
  loading: "running",
  success: "success",
  error: "error",
};

interface TriggerNodeBaseProps {
  id: string;
  selected: boolean;
  icon: React.ReactNode;
  label?: string;
  subtitle?: string;
  /** Tiny chip rendered top-left of the tile (e.g. "MANUAL", "CRON"). */
  badge?: string;
  status: ExecutionStatus;
  onEdit?: (id: string) => void;
}

export function TriggerNodeBase({
  id,
  selected,
  icon,
  label = "Trigger",
  subtitle,
  badge,
  status,
  onEdit,
}: TriggerNodeBaseProps) {
  const { nodes } = useFlow();
  const curNode = nodes.find((node) => node.id === id)!;

  return (
    <div className="group/node relative">
      {/* Execute step — absolute, hover-only, sits left of the tile so it
       *  doesn't share bounding-box space with the node. */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute top-1/2 right-[calc(100%+8px)] -translate-y-1/2 opacity-0 transition-opacity duration-[140ms] group-hover/node:opacity-100"
        aria-label="Execute this step"
      >
        <Play className="size-3" aria-hidden="true" />
        Execute
      </Button>

      <BaseNode
        selected={selected}
        status={STATUS_MAP[status] ?? "default"}
        tone="trigger"
        label={label}
        subtitle={subtitle}
        badge={badge ? <BaseNodeBadge>{badge}</BaseNodeBadge> : undefined}
        onDoubleClick={() => onEdit?.(id)}
      >
        <BaseNodeIcon className="text-text-secondary">{icon}</BaseNodeIcon>

        {/* Output handle on the right edge of the tile. */}
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
      </BaseNode>
    </div>
  );
}

"use client";

import { Position } from "@xyflow/react";

import useFlow from "@/app/store/flow-store";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { BaseHandle } from "@/components/handles/base-handle";
import { ButtonHandle } from "@/components/handles/button-handle";
import { NodeStatusIndicator } from "@/components/node-status-indicator";
import {
  BaseNode,
  BaseNodeDivider,
  BaseNodeFooter,
  BaseNodeHeader,
  BaseNodeSubtitle,
  BaseNodeTitle,
} from "@/components/nodes/base-node";
import { cn } from "@/lib/utils";

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
  label?: string;
  subtitle?: string;
  onEdit?: (id: string) => void;
  outputs: OutputHandle[];
  inputs?: InputHandle[];
}

export function ActionNodeBase({
  id,
  selected,
  icon,
  label = "Action",
  subtitle,
  onEdit,
  outputs,
  inputs,
}: ActionNodeBaseProps) {
  const { nodes } = useFlow();
  const curNode = nodes.find((node) => node.id === id)!;

  return (
    <NodeStatusIndicator status="initial" variant="border">
      <BaseNode
        selected={selected}
        onDoubleClick={() => onEdit?.(id)}
        className="min-w-[220px]"
      >
        {/* Input handles (left edge) */}
        {(inputs || [{ id: "in" }]).map((input, index) => {
          const top =
            !inputs || inputs.length === 1
              ? "50%"
              : `${25 + (index * 50) / (inputs.length - 1)}%`;

          return (
            <BaseHandle
              key={`input-${index}`}
              id={input.id ?? `input-${index}`}
              type="target"
              position={Position.Left}
              style={{ top }}
            />
          );
        })}

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
        {subtitle && <BaseNodeSubtitle>{subtitle}</BaseNodeSubtitle>}

        <BaseNodeDivider />

        {/* Footer with output handles */}
        <BaseNodeFooter className="relative">
          <span className="text-caption text-text-muted">Action</span>

          {/* Output handles (right edge) */}
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
                setConfigNodeId={() => {}}
                sourceHandleId={output.id}
                sourceNode={curNode}
              />
            </ButtonHandle>
          ))}
        </BaseNodeFooter>
      </BaseNode>
    </NodeStatusIndicator>
  );
}

"use client";

import { Position } from "@xyflow/react";

import useFlow from "@/app/store/flow-store";
import ActionSheet from "@/app/workflows/new/action-sheet";
import { BaseHandle } from "@/components/handles/base-handle";
import { ButtonHandle } from "@/components/handles/button-handle";
import {
  BaseNode,
  BaseNodeBadge,
  BaseNodeIcon,
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
  /** Tiny chip rendered top-left of the tile. */
  badge?: string;
  /** Decorative stripe tone. Defaults to "action". */
  tone?: "default" | "action" | "branch" | "ai";
  onEdit?: (id: string) => void;
  outputs: OutputHandle[];
  inputs?: InputHandle[];
}

/* Evenly distribute handles along the tile edge.
 * One handle → 50%. Two → 28%/72%. N → 22% .. 78%. */
function edgeOffset(index: number, count: number): string {
  if (count <= 1) return "50%";
  const min = 22;
  const max = 78;
  return `${min + (index * (max - min)) / (count - 1)}%`;
}

export function ActionNodeBase({
  id,
  selected,
  icon,
  label = "Action",
  subtitle,
  badge,
  tone = "action",
  onEdit,
  outputs,
  inputs,
}: ActionNodeBaseProps) {
  const { nodes, setEditingActionNodeId } = useFlow();
  const curNode = nodes.find((node) => node.id === id)!;

  const inputList = inputs ?? [{ id: "in" }];

  return (
    <BaseNode
      selected={selected}
      tone={tone}
      label={label}
      subtitle={subtitle}
      badge={badge ? <BaseNodeBadge>{badge}</BaseNodeBadge> : undefined}
      onDoubleClick={() => (onEdit ? onEdit(id) : setEditingActionNodeId(id))}
    >
      <BaseNodeIcon>{icon}</BaseNodeIcon>

      {/* Input handles (left edge). */}
      {inputList.map((input, index) => (
        <BaseHandle
          key={input.id ?? `input-${index}`}
          id={input.id ?? `input-${index}`}
          type="target"
          position={Position.Left}
          style={{ top: edgeOffset(index, inputList.length) }}
        />
      ))}

      {/* Output handles (right edge). Each carries an ActionSheet trigger. */}
      {outputs.map((output, index) => (
        <ButtonHandle
          key={output.id}
          id={output.id}
          nodeId={id}
          type="source"
          position={Position.Right}
          style={{ top: edgeOffset(index, outputs.length) }}
        >
          <ActionSheet
            setConfigNodeId={setEditingActionNodeId}
            sourceHandleId={output.id}
            sourceNode={curNode}
          />
        </ButtonHandle>
      ))}

      {/* Inline output labels for multi-output nodes (e.g. If: true/false). */}
      {outputs.length > 1 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -right-1 flex flex-col justify-around"
        >
          {outputs.map((output) => (
            <span
              key={`${output.id}-label`}
              className={cn(
                "text-text-muted translate-x-full pl-3 font-mono text-[9px] font-semibold tracking-[0.06em] uppercase",
                "whitespace-nowrap"
              )}
            >
              {output.label ?? output.id}
            </span>
          ))}
        </div>
      )}
    </BaseNode>
  );
}

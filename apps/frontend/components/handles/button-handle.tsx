"use client";
import { type HandleProps, Position, useReactFlow } from "@xyflow/react";

import { BaseHandle } from "@/components/handles/base-handle";
import { cn } from "@/lib/utils";

/* ============================================================
   BUTTON HANDLE — output handle with a trailing "add next step"
   button. The line extends outward from the tile edge; clicking
   the button opens an action picker.

   Only renders the trailing UI when the handle isn't already
   connected (matches n8n's behaviour).
   ============================================================ */

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]:
    "flex-col left-1/2 translate-y-[10px] -translate-x-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]:
    "top-1/2 -translate-y-1/2 translate-x-[10px]",
};

export function ButtonHandle({
  nodeId,
  position = Position.Bottom,
  children,
  ...props
}: HandleProps & { nodeId?: string }) {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;

  const { getEdges } = useReactFlow();
  const edges = getEdges();
  const isHandleConnected = edges.some(
    (edge) => edge.source === nodeId && edge.sourceHandle === props.id
  );

  return (
    <BaseHandle position={position} id={props.id} {...props}>
      {!isHandleConnected && (
        <div
          className={cn(
            "group absolute flex items-center pointer-events-none",
            wrapperClassName
          )}
        >
          {/* Connector stub — line from the handle outward to the button. */}
          <div
            className={cn(
              "bg-border-strong group-hover:bg-accent-primary transition-colors duration-[160ms]",
              vertical ? "h-8 w-px" : "h-px w-10"
            )}
          />
          <div className="nodrag nopan pointer-events-auto">{children}</div>
        </div>
      )}
    </BaseHandle>
  );
}

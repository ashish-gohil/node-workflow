"use client";
import { Position, useReactFlow, type HandleProps } from "@xyflow/react";
import { BaseHandle } from "@/components/base-handle";

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]: "flex-col left-1/2 translate-y-[10px] -translate-x-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]: "top-1/2 -translate-y-1/2 translate-x-[10px]",
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

  const edges = getEdges(); // this can not be used to update edge state its just give snapshot not an actual edges state

  const isHandleConnected = edges.some(
    (edge) => edge.source === nodeId && edge.sourceHandle === props.id
  );

  return (
    <BaseHandle position={position} id={props.id} {...props}>
      {!isHandleConnected && (
        <div
          className={`group absolute flex items-center ${wrapperClassName} pointer-events-none`}
        >
          <div
            className={`bg-border-strong group-hover:bg-text-secondary ${vertical ? "h-10 w-px" : "h-px w-10"}`}
          />
          <div className="nodrag nopan pointer-events-auto">{children}</div>
        </div>
      )}
    </BaseHandle>
  );
}

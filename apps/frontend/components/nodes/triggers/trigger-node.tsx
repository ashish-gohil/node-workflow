import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export type TriggerNodeData = Node<{
  label: string;
  description?: string;
}>;

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <div
      className={`
        bg-surface-elevated border-border text-text-primarys relative min-w-[160px]  rounded-lg  border px-4 py-3  transition-colors  ${selected ? "border-border-strong" : ""} `}
    >
      {/* Title */}
      <div className="text-sm font-medium leading-tight">{data.label}</div>

      {/* Optional subtitle */}
      {data.description && (
        <div className="text-text-muted mt-1 text-xs">{data.description}</div>
      )}

      {/* Single output handle (right side) */}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className=" bg-accent-primary h-2.5 w-2.5 rounded-full border-0"
      />
    </div>
  );
}

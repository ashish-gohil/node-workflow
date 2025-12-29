import { Handle, Position, NodeProps, Node } from '@xyflow/react'

export type TriggerNodeData = Node<{
  label: string
  description?: string
}>

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  return (
    <div
      className={`
        relative min-w-[160px] rounded-lg border bg-surface-elevated  border-border  px-4 py-3 text-text-primarys  transition-colors  ${selected ? 'border-border-strong' : ''} `}
    >
      {/* Title */}
      <div className="text-sm font-medium leading-tight">{data.label}</div>

      {/* Optional subtitle */}
      {data.description && (
        <div className="mt-1 text-xs text-text-muted">{data.description}</div>
      )}

      {/* Single output handle (right side) */}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className=" w-2.5 h-2.5 bg-accent-primary border-0 rounded-full"
      />
    </div>
  )
}

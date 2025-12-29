import { Handle, Position, NodeProps, Node } from '@xyflow/react'

export type ActionNodeData = Node<{
  label: string
  description?: string
}>

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  return (
    <div
      className={`
        relative min-w-[160px] rounded-lg border bg-surface-elevated border-border  px-4 py-3 text-text-primarys  transition-colors  ${selected ? 'border-border-strong' : ''} `}
    >
      {/* Title */}
      <div className="text-sm font-medium leading-tight">{data.label}</div>

      {/* Optional subtitle */}
      {data.description && (
        <div className="mt-1 text-xs text-text-muted">{data.description}</div>
      )}

      <Handle
        id="out-1"
        type="target"
        position={Position.Left}
        className=" w-2.5 h-2.5 bg-accent-primary border-0 rounded-full "
        style={{ top: 16 }}
      />
      <Handle
        id="out-2"
        type="target"
        position={Position.Left}
        className=" w-2.5 h-2.5 bg-accent-primary border-0 rounded-full "
        style={{ top: 32 }}
      />
    </div>
  )
}

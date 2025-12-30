import { Handle, Position, NodeProps, Node } from '@xyflow/react'
import { PlusIcon } from 'lucide-react'

export type ManualTriggerData = Node<{
  label: string
  description?: string
}>

export function ManualTriggerNode({
  id,
  data,
  selected,
}: NodeProps<ManualTriggerData>) {
  return (
    <div
      key={id}
      className={`
        relative min-w-[160px] rounded-lg border-[3px] bg-surface-elevated  border-border  px-4 py-3 text-text-primary  transition-colors  ${selected ? 'border-border-strong' : 'border-border-default'} `}
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
        className="absolute -right-[7px] top-1/2 -translate-y-1/2 h-3 w-3 bg-accent-primary border-0 rounded-full"
      />
      <button
        onClick={e => {
          e.stopPropagation()
          //   data.onAdd?.(id)
          console.log('open action node sheet')
        }}
        className="absolute -right-6 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center border border-border-strong bg-surface text-text-primary hover:bg-state-hover transition-colors"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

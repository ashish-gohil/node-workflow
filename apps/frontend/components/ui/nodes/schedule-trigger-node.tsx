import { Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { Timer } from 'lucide-react'

import { CustomHandle } from '../handles/custom-handle'

export type SchedulerTriggerData = Node<{
  label: string
  description?: string
}>

export function SchedulerTriggerNode({
  id,
  selected,
}: NodeProps<SchedulerTriggerData>) {
  const { getEdges } = useReactFlow()

  const edges = getEdges()
  console.log(edges)
  console.log(
    edges[0]?.source === id &&
      edges[0]?.sourceHandle === 'manual-trigger-handle-1'
  )

  console.log(
    edges[0]?.source === id &&
      edges[0]?.sourceHandle === 'manual-trigger-handle-2'
  )

  const isHandleConnected = (handleId: string) =>
    edges.some(edge => edge.source === id && edge.sourceHandle === handleId)
  return (
    <div
      key={id}
      className={`
        relative w-12 h-10 rounded-l-xl rounded-r-xs border-[3px] bg-surface-elevated  border-border   text-text-primary  transition-colors  ${selected ? 'border-border-strong' : 'border-border-default'} `}
    >
      <div className="w-full h-full flex justify-center items-center">
        <Timer className="text-text-secondary size-5" />
      </div>
      <div className="flex flex-col h-10 gap-2">
        <CustomHandle
          position={Position.Right}
          type="source"
          showPlus={!isHandleConnected('manual-trigger-handle-1')}
          handleId="manual-trigger-handle-1"
        />
      </div>
    </div>
  )
}

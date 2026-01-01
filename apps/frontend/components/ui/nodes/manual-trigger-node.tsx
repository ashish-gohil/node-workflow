import { Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { MousePointerClick, PlusCircle } from 'lucide-react'

import { ButtonHandle } from '@/components/button-handle'
import { Button } from '../button'
import { BaseNode } from '@/components/base-node'

export type ManualTriggerData = Node<{
  label: string
  description?: string
}>

export function ManualTriggerNode({
  id,
  selected,
}: NodeProps<ManualTriggerData>) {
  const { getEdges, getNodes } = useReactFlow()

  const edges = getEdges()
  const nodes = getNodes()

  console.log(edges)
  console.log(nodes)
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
    <div className="group flex gap-2 h-10 justify-between items-center ">
      <Button
        allowCorners={true}
        cornerSize="xs"
        className="opacity-0 group-hover:opacity-100 h-8"
        // className="relative rounded-none"
      >
        Execute step
      </Button>
      <BaseNode className="w-12 rounded-r-xs h-10">
        <div className="w-full h-full flex justify-center items-center">
          <MousePointerClick className="text-text-secondary size-5" />
        </div>

        <ButtonHandle
          id="manual-trigger-handle"
          showButton={!isHandleConnected('manual-trigger-handle')}
          position={Position.Right}
          type="source"
        >
          <div>
            <PlusCircle className="text-border-strong hover:text-text-secondary" />
          </div>
        </ButtonHandle>
      </BaseNode>
    </div>
  )
}

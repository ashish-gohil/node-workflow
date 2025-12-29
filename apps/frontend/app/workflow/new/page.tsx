'use client'
import React from 'react'
import { useState, useCallback } from 'react'
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
  type DefaultEdgeOptions,
  Background,
  BackgroundVariant,
} from '@xyflow/react'
// import { useTheme } from 'next-themes'
import { ThemeHydrated } from '@/components/ui/theme-wraper'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from '@/components/ui/nodes/trigger-node'
import { ActionNode } from '@/components/ui/nodes/action-node'
import DottedBackground from '@/components/ui/dotted-background'
import { Button } from '@/components/ui/button'
import TriggerSheet from '@/components/ui/trigger/trigger-sheeet'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    data: { label: 'Node 1', description: 'this is trigger node' },
    position: { x: 5, y: 5 },
    type: 'trigger',
  },
  {
    id: '1-1',
    data: { label: 'Node 2', description: 'this is trigger node 2' },
    position: { x: 20, y: 20 },
    type: 'trigger',
  },
  {
    id: '2',
    data: { label: 'Node 3' },
    position: { x: 5, y: 100 },
    type: 'action',
  },
]

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

const onNodeDrag: OnNodeDrag = (_, node) => {
  console.log('drag event', node.data)
}

export default function NewWorkflow() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [triggerSheetOpen, setTriggerSheetOpen] = useState<boolean>(false)

  const onNodesChange: OnNodesChange = useCallback(
    changes => setNodes(nds => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    changes => setEdges(eds => applyEdgeChanges(changes, eds)),
    [setEdges]
  )
  const onConnect: OnConnect = useCallback(
    connection => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )

  return (
    <div className="z-50 bg-transparent w-screen h-[calc(100vh-80px)]">
      <DottedBackground className="w-full h-full">
        {nodes.length > 0 ? (
          <ThemeHydrated>
            <ReactFlow
              className=""
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDrag={onNodeDrag}
              fitView
              fitViewOptions={fitViewOptions}
              defaultEdgeOptions={defaultEdgeOptions}
              nodeTypes={nodeTypes}
            >
              {/* <Background
                id="1"
                gap={10}
                color="var(--color-bg-muted)"
                variant={BackgroundVariant.Dots}
              /> */}
            </ReactFlow>
          </ThemeHydrated>
        ) : (
          <TriggerSheet
            isOpen={triggerSheetOpen}
            setIsOpen={val => setTriggerSheetOpen(val)}
          />
        )}
      </DottedBackground>
    </div>
  )
}

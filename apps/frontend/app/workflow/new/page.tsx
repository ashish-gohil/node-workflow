'use client'
import React from 'react'
import { useCallback } from 'react'
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type FitViewOptions,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
  type DefaultEdgeOptions,
  Connection,
  OnConnectEnd,
} from '@xyflow/react'
// import { useTheme } from 'next-themes'
import { ThemeHydrated } from '@/components/ui/theme-wraper'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from '@/components/ui/nodes/trigger-node'
import { ActionNode } from '@/components/ui/nodes/action-node'
import DottedBackground from '@/components/ui/dotted-background'

import FirstTriggerSheet, {
  nodeTypes,
} from '@/components/ui/triggers/trigger-sheet'
import { useWorkflow } from '@/hooks/use-workflow'

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
  const { nodes, edges, setNodes, setEdges } = useWorkflow()

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

  // When drag stops (either connected or cancelled)
  const onConnectEnd: OnConnectEnd = useCallback(event => {
    console.log('Drag ended at:', event?.clientX, event?.clientY)
  }, [])

  return (
    <div className="z-20 bg-transparent w-screen h-[calc(100vh-80px)]">
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
              onConnectEnd={onConnectEnd}
              // onMove={(e)=> {console.log(e.)}}
              // onMouseDown={e => {
              //   console.log(e.clientX)
              //   console.log(e.clientY)
              // }}
              // onMoveEnd={(e)=>{console.log(e?.)}}
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
          <FirstTriggerSheet />
        )}
      </DottedBackground>
    </div>
  )
}

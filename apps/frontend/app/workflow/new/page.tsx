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
  ReactFlowProvider,
  Node,
  useReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
// import { useTheme } from 'next-themes'
import { ThemeHydrated } from '@/components/ui/theme-wraper'
import '@xyflow/react/dist/style.css'

import DottedBackground from '@/components/ui/dotted-background'

import FirstTriggerSheet, {
  nodeTypes,
} from '@/components/ui/triggers/trigger-sheet'
import { TriggerNodeTypes } from '@/app/types/tirggers'

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
  const { screenToFlowPosition } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // const onNodesChange: OnNodesChange = useCallback(
  //   changes => setNodes(nds => applyNodeChanges(changes, nds)),
  //   [setNodes]
  // )
  // const onEdgesChange: OnEdgesChange = useCallback(
  //   changes => setEdges(eds => applyEdgeChanges(changes, eds)),
  //   [setEdges]
  // )
  const onConnect: OnConnect = useCallback(
    connection => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )
  console.log('nodes added')
  // When drag stops (create create action node if its valid position...)
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position

        const { clientX, clientY } =
          'changedTouches' in event
            ? (event.changedTouches[0] as { clientX: number; clientY: number })
            : (event as { clientX: number; clientY: number })
        const nodeId = Math.random().toString()
        const newNode: Node = {
          id: nodeId,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: { label: `Node ${nodeId}` },
          origin: [0.5, 0.0],
          type: TriggerNodeTypes.Webhook,
        }

        // apply logic to remove custom handle button from previous node.

        setNodes(nds => [...nds, newNode])
        setEdges(eds =>
          eds.concat({
            id: nodeId,
            source: connectionState.fromNode!.id,
            target: nodeId,
            sourceHandle: connectionState.fromHandle?.id,
          })
        )
      }
    },
    [screenToFlowPosition]
  )

  return (
    <div className="z-20 bg-transparent w-screen h-[calc(100vh-80px)]">
      <div className="w-full h-full">
        {/* <DottedBackground className="w-full h-full"> */}
        <ThemeHydrated>
          <ReactFlow
            className="w-full h-full bg-red-200"
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
          >
            <Background
              id="1"
              gap={10}
              color="var(--color-bg-muted)"
              variant={BackgroundVariant.Dots}
            />

            {nodes.length === 0 && (
              <div className="flex justify-center items-center h-full w-full">
                <FirstTriggerSheet />
              </div>
            )}
          </ReactFlow>
        </ThemeHydrated>
        {/* </DottedBackground> */}
      </div>
    </div>
  )
}

'use client'

import React, { createContext, useState, ReactNode } from 'react'
import type { Node, Edge } from '@xyflow/react'

const initialNodes: Node[] = [
  //   {
  //     id: '1',
  //     data: { label: 'Node 1', description: 'this is trigger node' },
  //     position: { x: 5, y: 5 },
  //     type: 'trigger',
  //   },
  //   {
  //     id: '1-1',
  //     data: { label: 'Node 2', description: 'this is trigger node 2' },
  //     position: { x: 20, y: 20 },
  //     type: 'trigger',
  //   },
  //   {
  //     id: '2',
  //     data: { label: 'Node 3' },
  //     position: { x: 5, y: 100 },
  //     type: 'action',
  //   },
]

type FlowContextType = {
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
}

const FlowContext = createContext<FlowContextType | null>(null)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>([])

  return (
    <FlowContext.Provider
      value={{
        nodes,
        edges,
        setNodes,
        setEdges,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}

export { FlowContext }

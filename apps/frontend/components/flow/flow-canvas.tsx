"use client";

import { useEffect } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import useFlow from "@/app/store/flow-store";
import { FlowEdge, FlowNode } from "@/app/types/flow";

type Props = {
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];

  readOnly?: boolean;

  className?: string;

  onChange?: (data: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
};

export default function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  readOnly = false,
  className,
  onChange,
}: Props) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useFlow();

  /**
   * Initialize store when component mounts
   * Works for both:
   * - new workflow
   * - edit workflow
   */
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  /**
   * Notify parent when nodes/edges change
   */
  useEffect(() => {
    onChange?.({ nodes, edges });
  }, [nodes, edges, onChange]);

  return (
    <div className={className ?? "w-full h-full"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

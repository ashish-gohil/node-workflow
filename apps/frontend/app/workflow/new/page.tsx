"use client";
import React, { useState } from "react";
import { useCallback } from "react";
import {
  ReactFlow,
  addEdge,
  type FitViewOptions,
  type OnConnect,
  type OnNodeDrag,
  type DefaultEdgeOptions,
  OnConnectEnd,
  Node,
  useReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Edge,
} from "@xyflow/react";
// import { useTheme } from 'next-themes'
import { ThemeHydrated } from "@/components/ui/theme-wraper";
import "@xyflow/react/dist/style.css";

import { TriggerNode, TriggerNodeTypes } from "@/app/types/tirggers";
import { ManualTriggerNode } from "@/components/nodes/manual-trigger-node";
import { SchedulerTriggerNode } from "@/components/nodes/schedule-trigger-node";
import { ActionNode } from "@/components/nodes/action-node";
import TriggerSheet from "@/app/workflow/new/trigger-sheet";
import WorkflowCanvas from "./workflow-canvas";
import TriggerConfigDialog from "./trigger-config/trigger-config-dialog";

export const nodeTypes = {
  [TriggerNodeTypes.ManualTrigger]: ManualTriggerNode,
  [TriggerNodeTypes.SchedulerTrigger]: SchedulerTriggerNode,
  [TriggerNodeTypes.Webhook]: ActionNode,
};
const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

export default function NewWorkflow() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<TriggerNode>([]); //  evantually it will also have action nodes as well.
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // When drag stops (create create action node if its valid position...)
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position

        const { clientX, clientY } =
          "changedTouches" in event
            ? (event.changedTouches[0] as { clientX: number; clientY: number })
            : (event as { clientX: number; clientY: number });
        const nodeId = Math.random().toString();

        // open sheet of posible actions and handle below logic there

        // const newNode: Node = {
        //   id: nodeId,
        //   position: screenToFlowPosition({
        //     x: clientX,
        //     y: clientY,
        //   }),
        //   data: { label: `Node ${nodeId}` },
        //   origin: [0.5, 0.0],
        //   type: TriggerNodeTypes.Webhook,
        // };

        // setNodes((nds) => [...nds, newNode]);
        // setEdges((eds) =>
        //   eds.concat({
        //     id: nodeId,
        //     source: connectionState.fromNode!.id,
        //     target: nodeId,
        //     sourceHandle: connectionState.fromHandle?.id,
        //   })
        // );
      }
    },
    [screenToFlowPosition]
  );

  const updateNodeData = (configNodeId: string, data: any) => {
    const selectedNode = nodes.find((node) => node.id === configNodeId)!;
    selectedNode.data = data;
    setNodes((nds) => [
      ...nds.filter((node) => node.id === configNodeId),
      selectedNode,
    ]);
  };

  return (
    <div className="z-20 bg-transparent w-screen h-[calc(100vh-80px)]">
      <div className="w-full h-full">
        <ThemeHydrated>
          <ReactFlow
            className="w-full h-full bg-red-200"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // onNodeDrag={onNodeDrag}
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
              <div className="flex justify-center flex-col gap-2 items-center h-full w-full">
                <TriggerSheet
                  setNodes={setNodes}
                  setConfigNodeId={setConfigNodeId}
                />
                <div className="text-text-muted text-2xl">Add trigger</div>
              </div>
            )}
          </ReactFlow>
        </ThemeHydrated>
      </div>

      {configNodeId && (
        <TriggerConfigDialog
          node={nodes.find((node) => node.id === configNodeId)!}
          onSave={(data) => updateNodeData(configNodeId, data)}
          onClose={() => setConfigNodeId(null)}
        />
      )}
    </div>
  );
}

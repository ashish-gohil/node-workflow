"use client";
import React, { useState } from "react";
import { useCallback } from "react";
import { OnConnectEnd, useReactFlow } from "@xyflow/react";
// import { useTheme } from 'next-themes'
import { ThemeHydrated } from "@/components/ui/theme-wraper";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "@/app/types/tirggers";
import { useShallow } from "zustand/react/shallow";
import TriggerSheet from "@/app/workflows/new/trigger-sheet";
import TriggerConfigDialog from "./trigger-config/trigger-config-dialog";
import { ActionNodeTypes, DelayNodeType } from "@/app/types/actions";
import useFlow, { FlowState } from "@/app/store/flow-store";
import FlowCanvas from "@/components/flow/flow-canvas";

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
});

export default function NewWorkflow() {
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, edges, setNodes, setEdges } = useFlow(useShallow(selector));
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  // When drag stops (create create action node if its valid position...)
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        let clientX = 0;
        let clientY = 0;

        if (event instanceof TouchEvent) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        } else if (event instanceof MouseEvent) {
          clientX = event.clientX;
          clientY = event.clientY;
        }

        const nodeId = crypto.randomUUID();

        // this will open new action sheet to select new node...
        const newNode: DelayNodeType = {
          id: nodeId,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: {
            type: ActionNodeTypes.Delay,
            label: "Delay",
            config: { mode: "seconds", seconds: 20 },
          },
          origin: [0.5, 0.0],
          type: ActionNodeTypes.Delay,
        };

        setNodes((nds) => [...nds, newNode]);

        setEdges((eds) =>
          eds.concat({
            id: nodeId,
            source: connectionState.fromNode!.id,
            target: nodeId,
            sourceHandle: connectionState.fromHandle?.id,
          })
        );
      }
    },
    [screenToFlowPosition, setNodes, setEdges]
  );

  const updateNodeData = (configNodeId: string, data: any) => {
    const selectedNode = nodes.find((node) => node.id === configNodeId)!;
    selectedNode.data = data;
    setNodes((nds) => [
      ...nds.filter((node) => node.id === configNodeId),
      selectedNode,
    ]);
  };

  console.log("nodes from page.tsx ");
  console.log(nodes);
  console.log("edges from page.tsx ");
  console.log(edges);

  return (
    <div className="z-20 bg-transparent w-screen h-[calc(100vh-80px)]">
      <div className="w-full h-full">
        <ThemeHydrated>
          <FlowCanvas
            fitView
            className="w-full h-full"
            readOnly={false}
            onConnectEnd={onConnectEnd}
          >
            {nodes.length === 0 && (
              <div className="flex justify-center flex-col gap-2 items-center h-full w-full">
                <TriggerSheet setConfigNodeId={setConfigNodeId} />
                <div className="text-text-muted text-2xl">Add trigger</div>
              </div>
            )}
          </FlowCanvas>
        </ThemeHydrated>
      </div>

      {configNodeId && (
        <TriggerConfigDialog
          node={nodes.find((node) => node.id === configNodeId)! as TriggerNode}
          onSave={(data) => updateNodeData(configNodeId, data)}
          onClose={() => setConfigNodeId(null)}
        />
      )}
    </div>
  );
}

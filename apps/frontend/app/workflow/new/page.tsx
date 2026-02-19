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
import { ManualTriggerNode } from "@/components/nodes/triggers/manual-trigger-node";
import { SchedulerTriggerNode } from "@/components/nodes/triggers/schedule-trigger-node";
import { useShallow } from "zustand/react/shallow";
import TriggerSheet from "@/app/workflow/new/trigger-sheet";
import TriggerConfigDialog from "./trigger-config/trigger-config-dialog";
import { WebhookTriggerNode } from "@/components/nodes/triggers/webhook-trigger-node";
import {
  ActionNode,
  ActionNodeTypes,
  DelayNodeType,
} from "@/app/types/actions";
import { HttpRequestNode } from "@/components/nodes/actions/http-action-node";
import { IfNode } from "@/components/nodes/actions/if-condition-action-node";
import { MergeNode } from "@/components/nodes/actions/merge-action-node";
import { SetNode } from "@/components/nodes/actions/set-transform-action-node";
import { DelayNode } from "@/components/nodes/actions/delay-action-node";
import { FlowEdge, FlowNode } from "@/app/types/flow";
import { useStore } from "zustand";
import useFlow, { FlowState } from "@/app/store/flow-store";

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
});
export const nodeTypes = {
  [TriggerNodeTypes.ManualTrigger]: ManualTriggerNode,
  [TriggerNodeTypes.SchedulerTrigger]: SchedulerTriggerNode,
  [TriggerNodeTypes.Webhook]: WebhookTriggerNode,
  [ActionNodeTypes.Delay]: DelayNode,
  [ActionNodeTypes.HttpRequest]: HttpRequestNode,
  [ActionNodeTypes.If]: IfNode,
  [ActionNodeTypes.Merge]: MergeNode,
  [ActionNodeTypes.Set]: SetNode,
};
const fitViewOptions: FitViewOptions = {
  padding: 1,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
};

export default function NewWorkflow() {
  const { screenToFlowPosition } = useReactFlow();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
  } = useFlow(useShallow(selector));
  // const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  // const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
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
                <TriggerSheet setConfigNodeId={setConfigNodeId} />
                <div className="text-text-muted text-2xl">Add trigger</div>
              </div>
            )}
          </ReactFlow>
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

"use client";
import { useCallback, useState } from "react";
import { OnConnectEnd, useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";

import useFlow, { FlowState } from "@/app/store/flow-store";
import { ActionNodeDataTypes, ActionNodeTypes, DelayNodeType } from "@/app/types/actions";
import { FlowNode } from "@/app/types/flow";
import { TriggerNode } from "@/app/types/tirggers";
import TriggerSheet from "@/app/workflows/new/trigger-sheet";
import FlowCanvas from "@/components/flow/flow-canvas";
import { ThemeHydrated } from "@/components/ui/theme-wraper";

import ActionConfigDialog from "./action-config/action-config-dialog";
import TriggerConfigDialog from "./trigger-config/trigger-config-dialog";

import "@xyflow/react/dist/style.css";

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  editingActionNodeId: state.editingActionNodeId,
  setEditingActionNodeId: state.setEditingActionNodeId,
});

export default function NewWorkflow() {
  const { screenToFlowPosition } = useReactFlow();
  const { nodes, setNodes, setEdges, editingActionNodeId, setEditingActionNodeId } = useFlow(useShallow(selector));
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  /* Drop-to-create: when the user drags a connection into empty canvas,
     spawn a Delay node and wire it up to the source handle. */
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        return;
      }

      const { clientX, clientY } =
        event instanceof TouchEvent
          ? event.changedTouches[0]
          : (event as MouseEvent);

      const nodeId = crypto.randomUUID();

      const newNode: DelayNodeType = {
        id: nodeId,
        position: screenToFlowPosition({ x: clientX, y: clientY }),
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
          id: `edge-${crypto.randomUUID()}`,
          source: connectionState.fromNode!.id,
          target: nodeId,
          sourceHandle: connectionState.fromHandle?.id,
        })
      );
    },
    [screenToFlowPosition, setNodes, setEdges]
  );

  const updateNodeData = (id: string, data: FlowNode["data"]) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? ({ ...node, data } as FlowNode) : node
      )
    );
  };

  return (
    <div className="z-20 h-full w-full bg-transparent">
      <div className="h-full w-full">
        <ThemeHydrated>
          <FlowCanvas
            fitView
            className="h-full w-full"
            readOnly={false}
            onConnectEnd={onConnectEnd}
          >
            {nodes.length === 0 && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
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

      {editingActionNodeId && (() => {
        const editNode = nodes.find((n) => n.id === editingActionNodeId);
        return editNode ? (
          <ActionConfigDialog
            node={editNode}
            onSave={(data: ActionNodeDataTypes) => {
              updateNodeData(editingActionNodeId, data);
              setEditingActionNodeId(null);
            }}
            onClose={() => setEditingActionNodeId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

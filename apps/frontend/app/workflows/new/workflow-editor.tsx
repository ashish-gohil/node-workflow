"use client";

import { useCallback, useEffect, useState } from "react";
import { OnConnectEnd, useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";

import useFlow, { FlowState } from "@/app/store/flow-store";
import { ActionNodeDataTypes } from "@/app/types/actions";
import { FlowEdge, FlowNode } from "@/app/types/flow";
import { TriggerNode } from "@/app/types/tirggers";
import FlowCanvas from "@/components/flow/flow-canvas";
import { ThemeHydrated } from "@/components/ui/theme-wraper";
import { api } from "@/lib/api";
import { buildCreateWorkflowPayload } from "@/lib/workflow-payload";

import ActionConfigDialog from "./action-config/action-config-dialog";
import ActionSheet from "./action-sheet";
import EditorExecutionsPanel from "./editor-executions-panel";
import EditorHeader, { EditorTab } from "./editor-header";
import EditorSidebar from "./editor-sidebar";
import EditorThemeFab from "./editor-theme-fab";
import EditorZoomControls from "./editor-zoom-controls";
import TriggerConfigDialog from "./trigger-config/trigger-config-dialog";
import TriggerSheet from "./trigger-sheet";

import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  editingActionNodeId: state.editingActionNodeId,
  setEditingActionNodeId: state.setEditingActionNodeId,
  reset: state.reset,
});

export type WorkflowEditorProps = {
  /** When set, the editor is in "edit" mode for an existing workflow. */
  workflowId?: string;
  initialName?: string;
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
};

export default function WorkflowEditor({
  workflowId,
  initialName,
  initialNodes,
  initialEdges,
}: WorkflowEditorProps) {
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    editingActionNodeId,
    setEditingActionNodeId,
    reset,
  } = useFlow(useShallow(selector));

  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  const [pendingConnection, setPendingConnection] = useState<{
    sourceNodeId: string;
    sourceHandleId?: string;
    position: { x: number; y: number };
  } | null>(null);

  const [workflowName, setWorkflowName] = useState(
    initialName ?? "My workflow"
  );
  const [activeTab, setActiveTab] = useState<EditorTab>("editor");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);
  const router = useRouter();

  // Hydrate the flow store with the workflow being edited. Reset on unmount so
  // the next page (e.g. /workflows/new) starts from a blank canvas.
  useEffect(() => {
    if (initialNodes) setNodes(initialNodes);
    if (initialEdges) setEdges(initialEdges);
    if (initialName !== undefined) setWorkflowName(initialName);
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  async function handleSave() {
    try {
      const payload = buildCreateWorkflowPayload({
        name: workflowName,
        nodes,
        edges,
      });
      if (workflowId) {
        await api.put(`workflows/${workflowId}`, payload);
      } else {
        const response = await api.post("workflows", payload);
        console.log(response);
        router.push(`${response.workflowId}`);
      }
    } catch {
      // silently fail — real toast notification would go here
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName, workflowId]);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;

      const fromNode = connectionState.fromNode;
      if (!fromNode) return;

      const { clientX, clientY } =
        "changedTouches" in event
          ? event.changedTouches[0]
          : (event as MouseEvent);

      setPendingConnection({
        sourceNodeId: fromNode.id,
        sourceHandleId: connectionState.fromHandle?.id ?? undefined,
        position: screenToFlowPosition({ x: clientX, y: clientY }),
      });
    },
    [screenToFlowPosition]
  );

  const pendingSourceNode = pendingConnection
    ? (nodes.find((n) => n.id === pendingConnection.sourceNodeId) ?? null)
    : null;

  const updateNodeData = (id: string, data: FlowNode["data"]) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? ({ ...node, data } as FlowNode) : node
      )
    );
  };

  const hasTrigger = nodes.some((n) =>
    ["manualTrigger", "schedulerTrigger", "webhook"].includes(n.type ?? "")
  );

  return (
    <div className="bg-bg-canvas flex h-screen flex-col">
      <EditorHeader
        workflowName={workflowName}
        onWorkflowNameChange={setWorkflowName}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onSave={handleSave}
        canSave={nodes.length >= 2}
      />

      <div className="relative flex min-h-0 flex-1">
        <EditorSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          onShowLogs={() => setActiveTab("executions")}
        />

        <div className="bg-bg-canvas relative flex-1 overflow-hidden">
          {activeTab === "editor" ? (
            <>
              <ThemeHydrated>
                <FlowCanvas
                  fitView
                  className="h-full w-full"
                  readOnly={false}
                  locked={canvasLocked}
                  onConnectEnd={onConnectEnd}
                >
                  {nodes.length === 0 && (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                      <TriggerSheet
                        open={triggerSheetOpen}
                        onOpenChange={setTriggerSheetOpen}
                        setConfigNodeId={setConfigNodeId}
                      />
                      <p className="text-text-muted text-[15px]">
                        Add a trigger to start your workflow
                      </p>
                    </div>
                  )}
                </FlowCanvas>
              </ThemeHydrated>

              <EditorZoomControls
                canvasLocked={canvasLocked}
                onToggleLock={() => setCanvasLocked((v) => !v)}
              />
            </>
          ) : (
            <EditorExecutionsPanel hasTrigger={hasTrigger} />
          )}
        </div>
      </div>

      <EditorThemeFab />

      {configNodeId && (
        <TriggerConfigDialog
          node={nodes.find((n) => n.id === configNodeId)! as TriggerNode}
          onSave={(data) => updateNodeData(configNodeId, data)}
          onClose={() => setConfigNodeId(null)}
        />
      )}

      {editingActionNodeId &&
        (() => {
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

      {pendingConnection && pendingSourceNode && (
        <ActionSheet
          open
          onOpenChange={(o) => {
            if (!o) setPendingConnection(null);
          }}
          sourceNode={pendingSourceNode}
          sourceHandleId={pendingConnection.sourceHandleId}
          dropPosition={pendingConnection.position}
          setConfigNodeId={(id) => {
            setEditingActionNodeId(id);
            setPendingConnection(null);
          }}
        />
      )}
    </div>
  );
}

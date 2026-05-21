"use client";

import { useCallback, useEffect, useState } from "react";
import { OnConnectEnd, useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";

import useFlow, { FlowState } from "@/app/store/flow-store";
import { ActionNodeDataTypes } from "@/app/types/actions";
import { FlowNode } from "@/app/types/flow";
import { TriggerNode } from "@/app/types/tirggers";
import FlowCanvas from "@/components/flow/flow-canvas";
import { ThemeHydrated } from "@/components/ui/theme-wraper";
import { api } from "@/lib/api";

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

/* ─────────────────────────────────────────────────────────────── */
/*  Store selector                                                  */
/* ─────────────────────────────────────────────────────────────── */

const selector = (state: FlowState) => ({
  nodes: state.nodes,
  edges: state.edges,
  setNodes: state.setNodes,
  editingActionNodeId: state.editingActionNodeId,
  setEditingActionNodeId: state.setEditingActionNodeId,
});

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */

export default function NewWorkflow() {
  /* ReactFlow hooks — must be inside ReactFlowProvider (root layout) */
  const { screenToFlowPosition } = useReactFlow();

  /* flow store */
  const {
    nodes,
    edges,
    setNodes,
    editingActionNodeId,
    setEditingActionNodeId,
  } = useFlow(useShallow(selector));

  console.log(nodes);

  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  /**
   * When the user drags from a node's source handle and drops on empty
   * canvas, capture the source + drop coords here. Opening the action
   * sheet driven off this state spawns the chosen node at `position`
   * already wired up to `sourceNodeId`.
   */
  const [pendingConnection, setPendingConnection] = useState<{
    sourceNodeId: string;
    sourceHandleId?: string;
    position: { x: number; y: number };
  } | null>(null);

  /* editor UI */
  const [workflowName, setWorkflowName] = useState("My workflow");
  const [activeTab, setActiveTab] = useState<EditorTab>("editor");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [canvasLocked, setCanvasLocked] = useState(false);

  /* controlled trigger sheet (so the toolbar "+" button can open it) */
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);

  /* ─── handlers ─── */

  async function handleSave() {
    try {
      await api.post("/workflows", {
        name: workflowName,
        graph: {
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            config: n.data.config,
          })),
          edges,
        },
      });
    } catch {
      // silently fail — real toast notification would go here
    }
  }

  /* ⌘S / Ctrl+S */
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
  }, [nodes, edges, workflowName]);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // If the drag landed on a valid handle, ReactFlow's onConnect already
      // wired the edge — nothing for us to do here.
      if (connectionState.isValid) {
        return;
      }

      // Dropped on empty canvas → open the action sheet so the user can
      // pick which node to spawn at the cursor position.
      const fromNode = connectionState.fromNode;
      if (!fromNode) {
        return;
      }

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

  /* Resolve the source node for the pending connection. If the source
   * disappeared (deleted while sheet was open), close the sheet. */
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

  /* ─────────────────────────────────────────────────────────────── */
  /*  Render                                                         */
  /* ─────────────────────────────────────────────────────────────── */

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

      {/* ══════════════════════════════ BODY ════════════════════════════════ */}
      <div className="relative flex min-h-0 flex-1">
        <EditorSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          onShowLogs={() => setActiveTab("executions")}
        />

        {/* ── Canvas / Executions area ── */}
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

      {/* ════════════════════════════ DIALOGS ════════════════════════════════ */}
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

      {/* ──── Controlled action sheet for "drag handle → drop on canvas" ──── */}
      {pendingConnection && pendingSourceNode && (
        <ActionSheet
          open
          onOpenChange={(o) => {
            if (!o) {
              setPendingConnection(null);
            }
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

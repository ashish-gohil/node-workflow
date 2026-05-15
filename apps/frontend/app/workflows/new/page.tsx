"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { OnConnectEnd, useReactFlow, useViewport } from "@xyflow/react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  CreditCard,
  Download,
  HelpCircle,
  Home,
  ListOrdered,
  Lock,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Plus,
  Save,
  Settings,
  Share2,
  Sun,
  Trash2,
  Unlock,
  Upload,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import useFlow, { FlowState } from "@/app/store/flow-store";
import {
  ActionNodeDataTypes,
  ActionNodeTypes,
  DelayNodeType,
} from "@/app/types/actions";
import { FlowNode } from "@/app/types/flow";
import { TriggerNode } from "@/app/types/tirggers";
import FlowCanvas from "@/components/flow/flow-canvas";
import { ThemeHydrated } from "@/components/ui/theme-wraper";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import ActionConfigDialog from "./action-config/action-config-dialog";
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
  setEdges: state.setEdges,
  editingActionNodeId: state.editingActionNodeId,
  setEditingActionNodeId: state.setEditingActionNodeId,
});

type Tab = "editor" | "executions";

/* ─────────────────────────────────────────────────────────────── */
/*  Small shared sub-components                                     */
/* ─────────────────────────────────────────────────────────────── */

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-2.5 py-[7px] text-left text-[13px] font-medium transition-colors duration-120ms",
        active
          ? "border-l-2 border-accent-primary bg-bg-canvas pl-[9px] text-text-primary"
          : "text-text-secondary hover:bg-bg-canvas/60 hover:text-text-primary"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-text-brand" : "text-text-muted"
        )}
      />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="inline-flex items-center border border-[rgba(94,177,239,0.3)] bg-[rgba(94,177,239,0.14)] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-info">
          {badge}
        </span>
      )}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  kbd,
  destructive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  kbd?: string[];
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-[120ms]",
        destructive
          ? "text-error hover:bg-[rgba(229,72,77,0.06)]"
          : "text-text-primary hover:bg-bg-inset"
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          destructive ? "text-error" : "text-text-muted"
        )}
      />
      <span className="flex-1">{label}</span>
      {kbd && (
        <span className="ml-auto inline-flex gap-1">
          {kbd.map((k) => (
            <kbd
              key={k}
              className="inline-grid h-[18px] min-w-[18px] place-items-center border border-border-default bg-bg-inset px-1 font-mono text-[10px] text-text-secondary"
            >
              {k}
            </kbd>
          ))}
        </span>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Executions panel — shown when the "Executions" tab is active   */
/* ─────────────────────────────────────────────────────────────── */

function ExecutionsPanel({ hasTrigger }: { hasTrigger: boolean }) {
  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex items-center gap-3 border-b border-border-subtle px-6 py-3">
        <span className="text-[13px] font-semibold text-text-primary">
          Execution history
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
          <span className="size-1.5 rounded-full bg-text-disabled" />
          inactive
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8">
        <div className="btn-stamp inline-grid size-16 place-items-center">
          <ListOrdered className="size-7 text-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-text-primary">
            No executions yet
          </p>
          <p className="mt-1 max-w-xs text-[13px] text-text-muted">
            {hasTrigger
              ? "Save and activate this workflow to start seeing execution history here."
              : "Add a trigger node to your workflow, then save and activate it."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main page component                                            */
/* ─────────────────────────────────────────────────────────────── */

export default function NewWorkflow() {
  const router = useRouter();

  /* ReactFlow hooks — must be inside ReactFlowProvider (root layout) */
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  /* theme */
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* flow store */
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    editingActionNodeId,
    setEditingActionNodeId,
  } = useFlow(useShallow(selector));

  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  /* editor UI */
  const [workflowName, setWorkflowName] = useState("My workflow");
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [canvasLocked, setCanvasLocked] = useState(false);

  /* controlled trigger sheet (so the toolbar "+" button can open it) */
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);

  /* refs for menu containers (close on outside click) */
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  /* close menus when clicking outside them */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        saveMenuRef.current &&
        !saveMenuRef.current.contains(e.target as Node)
      ) {
        setSaveMenuOpen(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target as Node)
      ) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  /* ─── handlers ─── */

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {return;}
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

  async function handleSave() {
    setSaveMenuOpen(false);
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

  const hasTrigger = nodes.some((n) =>
    ["manualTrigger", "schedulerTrigger", "webhook"].includes(n.type ?? "")
  );

  const zoomPercent = Math.round((zoom || 1) * 100);

  /* ─────────────────────────────────────────────────────────────── */
  /*  Render                                                         */
  /* ─────────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-screen flex-col bg-bg-canvas">

      {/* ════════════════════════════════ HEADER ════════════════════════════════ */}
      <header className="relative z-50 flex h-16 shrink-0 items-stretch border-b-[1.5px] border-border-stamp bg-bg-canvas">

        {/* Logo */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="btn-stamp inline-grid size-7 place-items-center bg-accent-primary text-accent-on shadow-[2px_2px_0_0_var(--hard-shadow-color)] hover:btn-stamp-hover"
            aria-label="Go home"
          >
            <Zap className="size-3.5 fill-current" />
          </button>
        </div>

        {/* Workflow name + status */}
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            aria-label="Workflow name"
            className="h-7 max-w-60 border border-transparent bg-transparent px-2 text-[13px] font-semibold text-text-primary outline-none transition-colors duration-[120ms] hover:border-border-subtle hover:bg-bg-elevated focus:border-border-subtle focus:bg-bg-elevated"
          />
        </div>

        {/* ── Center: tabs floating over the header/canvas seam ── */}
        <div className="pointer-events-auto absolute bottom-[-19px] left-1/2 z-51 -translate-x-1/2">
          <div
            role="tablist"
            aria-label="Workflow view"
            className="inline-flex h-[38px] items-stretch border-[1.5px] border-border-stamp bg-bg-elevated shadow-[3px_3px_0_0_var(--hard-shadow-color)]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "editor"}
              onClick={() => setActiveTab("editor")}
              className={cn(
                "inline-flex h-full items-center border-r-[1.5px] border-border-stamp px-5 text-[13px] font-semibold transition-colors duration-[120ms]",
                activeTab === "editor"
                  ? "bg-accent-primary text-accent-on"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              Editor
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "executions"}
              onClick={() => setActiveTab("executions")}
              className={cn(
                "inline-flex h-full items-center gap-2 px-5 text-[13px] font-semibold transition-colors duration-120ms",
                activeTab === "executions"
                  ? "bg-accent-primary text-accent-on"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              Executions
              <span className="flex h-[18px] min-w-[20px] place-items-center border border-border-default bg-bg-canvas px-1.5 font-mono text-[11px] font-semibold text-text-muted ">
                0
              </span>
            </button>
          </div>
        </div>

        {/* ── Right: save + more ── */}
        <div className="flex shrink-0 items-center gap-2 px-4">

          {/* Save split button */}
          <div ref={saveMenuRef} className="relative">
            <div className="inline-flex h-9 items-stretch border-[1.5px] border-border-stamp bg-accent-primary text-accent-on shadow-[3px_3px_0_0_var(--hard-shadow-color)] transition-[transform,box-shadow] duration-[120ms] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--hard-shadow-color)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
              <button
                type="button"
                onClick={handleSave}
                disabled={nodes.length < 2}
                className="inline-flex items-center gap-2 px-4 text-[13px] font-bold transition-colors duration-[120ms] hover:bg-accent-hover disabled:opacity-50"
              >
                <Save className="size-3.5" />
                Save workflow
              </button>
              <button
                type="button"
                onClick={() => setSaveMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={saveMenuOpen}
                aria-label="More save options"
                className="inline-flex w-8 items-center justify-center border-l border-[rgba(10,14,12,0.35)] transition-colors duration-120ms hover:bg-accent-hover"
              >
                <ChevronDown className="size-3" />
              </button>
            </div>

            {saveMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-100 min-w-[280px] border-[1.5px] border-border-stamp bg-bg-elevated p-1.5 shadow-[4px_4px_0_0_var(--hard-shadow-color)]"
              >
                <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Save options
                </p>
                <MenuItem
                  icon={Save}
                  label="Save draft"
                  kbd={["⌘", "S"]}
                  onClick={handleSave}
                />
                <MenuItem
                  icon={Zap}
                  label="Publish & activate"
                  kbd={["⇧", "P"]}
                  onClick={() => setSaveMenuOpen(false)}
                />
                <MenuItem
                  icon={XCircle}
                  label="Unpublish"
                  kbd={["⌘", "U"]}
                  onClick={() => setSaveMenuOpen(false)}
                />
                <div className="my-1 h-px bg-border-subtle" />
                <MenuItem
                  icon={Copy}
                  label="Duplicate workflow"
                  onClick={() => setSaveMenuOpen(false)}
                />
                <MenuItem
                  icon={Download}
                  label="Export as JSON"
                  onClick={() => setSaveMenuOpen(false)}
                />
              </div>
            )}
          </div>

          {/* More ⋯ menu */}
          <div ref={moreMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              aria-label="More actions"
              className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active inline-grid size-9 place-items-center"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {moreMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-[100] min-w-[240px] border-[1.5px] border-border-stamp bg-bg-elevated p-1.5 shadow-[4px_4px_0_0_var(--hard-shadow-color)]"
              >
                <MenuItem
                  icon={Settings}
                  label="Workflow settings"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <MenuItem
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <MenuItem
                  icon={Share2}
                  label="Share workflow"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div className="my-1 h-px bg-border-subtle" />
                <MenuItem
                  icon={Upload}
                  label="Import from file"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <MenuItem
                  icon={HelpCircle}
                  label="Help & shortcuts"
                  onClick={() => setMoreMenuOpen(false)}
                />
                <div className="my-1 h-px bg-border-subtle" />
                <MenuItem
                  icon={Trash2}
                  label="Delete workflow"
                  destructive
                  onClick={() => setMoreMenuOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════ BODY ════════════════════════════════ */}
      <div className="relative flex min-h-0 flex-1">

        {/* ── Sidebar ── */}
        <aside
          aria-label="Workspace navigation"
          className={cn(
            "flex shrink-0 flex-col overflow-hidden border-r-[1.5px] border-border-stamp bg-bg-elevated transition-[width,padding] duration-200",
            sidebarOpen ? "w-60 gap-1 px-3 py-4" : "w-0 border-r-0"
          )}
        >
          <p className="px-2.5 pb-1 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Workspace
          </p>
          <NavItem
            icon={Home}
            label="Overview"
            onClick={() => router.push("/")}
          />
          <NavItem icon={User} label="Personal" active />
          <NavItem icon={MessageSquare} label="Chat" badge="Preview" />

          <p className="mt-3 px-2.5 pb-1 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Workflow
          </p>
          <NavItem icon={CreditCard} label="Credentials" />
          <NavItem icon={Calendar} label="Schedules" />
          <NavItem
            icon={Clock}
            label="Logs"
            onClick={() => setActiveTab("executions")}
          />

          <div className="mt-auto flex items-center gap-2 border-t border-border-subtle px-1 pt-3">
            <span className="font-mono text-[11px] text-text-muted">
              v2.14.0
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
              <span className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_rgba(82,183,136,0.15)]" />
              synced
            </span>
          </div>
        </aside>

        {/* ── Sidebar toggle ── */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          className={cn(
            "absolute top-3.5 z-40 inline-grid size-7 place-items-center border-[1.5px] border-border-stamp bg-bg-elevated text-text-secondary shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-all duration-200 hover:-translate-y-px hover:text-text-primary active:translate-x-px active:translate-y-px active:shadow-none",
            sidebarOpen ? "left-[226px]" : "left-3"
          )}
        >
          <ChevronLeft
            className={cn(
              "size-3.5 transition-transform duration-200",
              !sidebarOpen && "rotate-180"
            )}
          />
        </button>

        {/* ── Canvas / Executions area ── */}
        <div className="relative flex-1 overflow-hidden bg-bg-canvas">

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

              {/* ── Zoom controls (bottom-left) — wired to ReactFlow API ── */}
              <div className="absolute bottom-6 left-6 z-10 inline-flex items-stretch border-[1.5px] border-border-stamp bg-bg-elevated shadow-[3px_3px_0_0_var(--hard-shadow-color)]">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => zoomOut({ duration: 200 })}
                  className="inline-grid size-[34px] place-items-center border-r border-border-subtle text-text-secondary transition-colors duration-[120ms] hover:bg-bg-canvas hover:text-text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {/* Live zoom percentage */}
                <button
                  type="button"
                  aria-label="Reset zoom to 100%"
                  title="Reset to 100%"
                  onClick={() =>
                    fitView({ duration: 300, padding: 0.15 })
                  }
                  className="inline-flex w-12 items-center justify-center border-r border-border-subtle font-mono text-[11px] text-text-secondary transition-colors duration-[120ms] hover:bg-bg-canvas hover:text-text-primary"
                >
                  {zoomPercent}%
                </button>

                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => zoomIn({ duration: 200 })}
                  className="inline-grid size-[34px] place-items-center border-r border-border-subtle text-text-secondary transition-colors duration-[120ms] hover:bg-bg-canvas hover:text-text-primary"
                >
                  <Plus className="size-3.5" />
                </button>

                <button
                  type="button"
                  aria-label="Fit view"
                  title="Fit all nodes in view"
                  onClick={() => fitView({ duration: 400, padding: 0.2 })}
                  className="inline-grid size-[34px] place-items-center border-r border-border-subtle text-text-secondary transition-colors duration-[120ms] hover:bg-bg-canvas hover:text-text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <polyline points="4 14 4 20 10 20" />
                    <polyline points="20 10 20 4 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>

                {/* Canvas lock — disables drag/pan/zoom when active */}
                <button
                  type="button"
                  aria-label={canvasLocked ? "Unlock canvas" : "Lock canvas"}
                  aria-pressed={canvasLocked}
                  title={canvasLocked ? "Unlock canvas" : "Lock canvas (disable dragging & panning)"}
                  onClick={() => setCanvasLocked((v) => !v)}
                  className={cn(
                    "inline-grid size-[34px] place-items-center text-text-secondary transition-colors duration-[120ms] hover:bg-bg-canvas hover:text-text-primary",
                    canvasLocked && "bg-accent-subtle text-text-brand"
                  )}
                >
                  {canvasLocked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <ExecutionsPanel hasTrigger={hasTrigger} />
          )}
        </div>
      </div>

      {/* ════════════════════════ THEME FAB (bottom-right) ════════════════════════ */}
      {mounted && (
        <button
          type="button"
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active fixed bottom-6 right-6 z-60 inline-grid size-10 place-items-center shadow-[3px_3px_0_0_var(--hard-shadow-color)]"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>
      )}

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
    </div>
  );
}

"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  Background,
  BackgroundVariant,
  type Edge,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type OnEdgesChange,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import { GitBranch, Globe, LayoutList, Shuffle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

/* ── Types ── */
type HeroStatus = "idle" | "running" | "success";

interface HeroData extends Record<string, unknown> {
  label: string;
  sub?: string;
  status: HeroStatus;
  iconColor: string;
  icon: "timer" | "globe" | "shuffle" | "branch" | "sheet";
  isTrigger?: boolean;
  warning?: boolean;
  outputs?: { id: string; label?: string }[];
}

/* ── Icon map ── */
const ICON_MAP = {
  timer: Timer,
  globe: Globe,
  shuffle: Shuffle,
  branch: GitBranch,
  sheet: LayoutList,
} as const;

/* ── Zap SVG (error/trigger indicator) ── */
function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/* ── Warning badge ── */
function WarnBadge() {
  return (
    <span className="absolute -right-2 -bottom-2 text-error">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3 L22 20 L2 20 Z" />
        <line x1="12" y1="10" x2="12" y2="14" stroke="#0a0e0c" strokeWidth="2" />
        <circle cx="12" cy="17.5" r="1" fill="#0a0e0c" />
      </svg>
    </span>
  );
}

/* ── Hero node — shared visual for all nodes in the demo canvas ── */
const HeroNode = memo(function HeroNode({ data }: NodeProps) {
  const d = data as HeroData;
  const Icon = ICON_MAP[d.icon] ?? Globe;
  const outputs = d.outputs ?? [{ id: "out" }];
  const isRunning = d.status === "running";
  const isDone = d.status === "success";

  const bodyBox = cn(
    "relative flex h-[90px] w-[96px] items-center justify-center rounded-node border bg-bg-elevated",
    "transition-all duration-[200ms]",
    d.isTrigger && "rounded-l-[48px]",
    isRunning && "border-forest-300",
    isDone && "border-border-default",
    !isRunning && !isDone && "border-border-default",
  );

  return (
    <div className="flex flex-col items-center">
      {/* Input port */}
      {!d.isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ top: "38px" }}
          className="!size-2.5 !rounded-full !border-[1.5px] !border-border-strong !bg-bg-canvas"
        />
      )}

      {/* Output ports */}
      {outputs.map((o, i) => (
        <Handle
          key={o.id}
          type="source"
          id={o.id}
          position={Position.Right}
          style={{
            top:
              outputs.length === 1
                ? "38px"
                : i === 0
                  ? "22px"
                  : "56px",
          }}
          className="!size-2.5 !rounded-full !border-[1.5px] !border-border-strong !bg-bg-canvas"
        />
      ))}

      {/* Node body */}
      <div
        className={bodyBox}
        style={{
          boxShadow: isRunning
            ? "inset 2px 0 0 0 var(--accent-primary), 0 0 0 2px rgba(79,201,122,0.18), 0 1px 3px rgba(0,0,0,0.4)"
            : isDone
              ? "inset 2px 0 0 0 var(--color-success), 0 1px 2px rgba(0,0,0,0.4)"
              : "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        <Icon size={34} strokeWidth={1.5} style={{ color: d.iconColor }} />

        {/* Zap indicator on running trigger */}
        {isRunning && d.isTrigger && (
          <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-error">
            <ZapIcon />
          </span>
        )}

        {d.warning && <WarnBadge />}

        {/* Pulse ring when running */}
        {isRunning && (
          <span
            className="pointer-events-none absolute -inset-px rounded-node border border-forest-300 animate-pulse"
            aria-hidden
          />
        )}
      </div>

      {/* Label + subtitle below */}
      <div className="mt-2 w-[130px] text-center">
        <div className="truncate text-[11px] font-semibold leading-tight text-text-primary">
          {d.label}
        </div>
        {d.sub && (
          <div className="mt-0.5 truncate font-mono text-[9px] text-text-muted">
            {d.sub}
          </div>
        )}
      </div>
    </div>
  );
});

/* ── Plus terminator (end of branch) ── */
const PlusNode = memo(function PlusNode() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!size-2.5 !rounded-full !border-[1.5px] !border-border-strong !bg-bg-canvas"
      />
      <div className="flex size-5 items-center justify-center border border-border-default bg-bg-elevated text-text-muted">
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    </>
  );
});

const nodeTypes = { heroNode: HeroNode, plus: PlusNode };

/* ── Execution animation ── */
const EXEC_ORDER = ["sched", "fetch", "transform", "check", "sheet_a", "sheet_b"];
const STEP_MS = 1200;
const PAUSE_MS = 2000;

/* Maps each animated edge to the target node it leads into */
const EDGE_TARGET_NODE: Record<string, string> = {
  e1: "fetch",
  e2: "transform",
  e3: "check",
  e4: "sheet_a",
  e5: "sheet_b",
};

/* ── Initial nodes ── */
type HeroFlowNode = Node<HeroData>;

const INITIAL_NODES: HeroFlowNode[] = [
  {
    id: "sched",
    type: "heroNode",
    position: { x: 0, y: 70 },
    data: {
      label: "Schedule Trigger",
      sub: "Every 15 min",
      icon: "timer",
      iconColor: "#a1ada6",
      status: "idle",
      isTrigger: true,
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "fetch",
    type: "heroNode",
    position: { x: 230, y: 70 },
    data: {
      label: "Fetch Data",
      sub: "GET: api.flow.dev/orders",
      icon: "globe",
      iconColor: "#7c8cff",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "transform",
    type: "heroNode",
    position: { x: 460, y: 70 },
    data: {
      label: "Transform Data",
      sub: "manual",
      icon: "shuffle",
      iconColor: "#9b8cff",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "check",
    type: "heroNode",
    position: { x: 690, y: 70 },
    data: {
      label: "Check Condition",
      sub: "amount > $500",
      icon: "branch",
      iconColor: "#4fc97a",
      status: "idle",
      outputs: [
        { id: "true", label: "true" },
        { id: "false", label: "false" },
      ],
    },
  },
  {
    id: "sheet_a",
    type: "heroNode",
    position: { x: 950, y: -10 },
    data: {
      label: "Add to Sheet A",
      sub: "append: sheet",
      icon: "sheet",
      iconColor: "#34a853",
      status: "idle",
      warning: true,
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "sheet_b",
    type: "heroNode",
    position: { x: 950, y: 155 },
    data: {
      label: "Add to Sheet B",
      sub: "append: sheet",
      icon: "sheet",
      iconColor: "#34a853",
      status: "idle",
      warning: true,
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "plus_a",
    type: "plus",
    position: { x: 1098, y: 33 },
    data: {} as HeroData,
  },
  {
    id: "plus_b",
    type: "plus",
    position: { x: 1098, y: 198 },
    data: {} as HeroData,
  },
];

const INITIAL_EDGES = [
  {
    id: "e1",
    source: "sched",
    sourceHandle: "out",
    target: "fetch",
    targetHandle: "in",
    animated: true,
    style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
  },
  {
    id: "e2",
    source: "fetch",
    sourceHandle: "out",
    target: "transform",
    targetHandle: "in",
    animated: true,
    style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
  },
  {
    id: "e3",
    source: "transform",
    sourceHandle: "out",
    target: "check",
    targetHandle: "in",
    animated: true,
    style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
  },
  {
    id: "e4",
    source: "check",
    sourceHandle: "true",
    target: "sheet_a",
    targetHandle: "in",
    animated: true,
    label: "true",
    labelStyle: {
      fill: "var(--color-text-muted)",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 10,
    },
    labelBgStyle: { fill: "transparent" },
    style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
  },
  {
    id: "e5",
    source: "check",
    sourceHandle: "false",
    target: "sheet_b",
    targetHandle: "in",
    animated: true,
    label: "false",
    labelStyle: {
      fill: "var(--color-text-muted)",
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 10,
    },
    labelBgStyle: { fill: "transparent" },
    style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
  },
  {
    id: "e6",
    source: "sheet_a",
    sourceHandle: "out",
    target: "plus_a",
    targetHandle: "in",
    animated: false,
    style: { stroke: "var(--border-subtle)", strokeWidth: 1.5 },
  },
  {
    id: "e7",
    source: "sheet_b",
    sourceHandle: "out",
    target: "plus_b",
    targetHandle: "in",
    animated: false,
    style: { stroke: "var(--border-subtle)", strokeWidth: 1.5 },
  },
];

/* ── Zoom panel (must be inside ReactFlowProvider) ── */
function ZoomPanel() {
  const { zoomIn, zoomOut } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <Panel position="bottom-left" style={{ margin: "12px" }}>
      <div
        className="flex h-[24px] items-stretch border-[1.5px] border-border-stamp bg-bg-elevated"
        style={{ boxShadow: "2px 2px 0 0 var(--hard-shadow-color)" }}
      >
        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="inline-flex w-[22px] cursor-pointer items-center justify-center border-r border-border-subtle text-[13px] text-text-secondary transition-colors hover:bg-bg-inset"
          title="Zoom out"
        >
          −
        </button>
        <span className="inline-flex w-[38px] items-center justify-center border-r border-border-subtle font-mono text-[9px] text-text-secondary">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="inline-flex w-[22px] cursor-pointer items-center justify-center text-[13px] text-text-secondary transition-colors hover:bg-bg-inset"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </Panel>
  );
}

/* ── Inner canvas (needs ReactFlowProvider context) ── */
function HeroFlowInner() {
  const [nodes, setNodes] = useState<HeroFlowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES as Edge[]);

  const onNodesChange = useCallback(
    (changes: NodeChange<HeroFlowNode>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as HeroFlowNode[]),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  /* Running workflow animation */
  useEffect(() => {
    let step = 0;
    let doneIds: string[] = [];
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      step = 0;
      doneIds = [];
      setNodes((prev) =>
        prev.map((n) => ({ ...n, data: { ...n.data, status: "idle" as HeroStatus } })),
      );
      setEdges(INITIAL_EDGES as Edge[]);
    };

    const advance = () => {
      if (step >= EXEC_ORDER.length) {
        timer = setTimeout(() => {
          reset();
          timer = setTimeout(advance, 500);
        }, PAUSE_MS);
        return;
      }

      const currentId = EXEC_ORDER[step];
      const snapshotDone = [...doneIds];

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === currentId)
            return { ...n, data: { ...n.data, status: "running" as HeroStatus } };
          if (snapshotDone.includes(n.id))
            return { ...n, data: { ...n.data, status: "success" as HeroStatus } };
          return { ...n, data: { ...n.data, status: "idle" as HeroStatus } };
        }),
      );

      /* Highlight edges based on running/done nodes */
      setEdges((prev) =>
        prev.map((e) => {
          const target = EDGE_TARGET_NODE[e.id];
          if (!target) return e; // e6, e7 are static, leave them alone
          if (target === currentId) {
            return {
              ...e,
              animated: true,
              style: { stroke: "var(--accent-primary)", strokeWidth: 2, strokeOpacity: 1 },
            };
          } else if (snapshotDone.includes(target)) {
            return {
              ...e,
              animated: false,
              style: { stroke: "var(--color-success)", strokeWidth: 1.5, strokeOpacity: 0.85 },
            };
          } else {
            return {
              ...e,
              animated: true,
              style: { stroke: "var(--border-strong)", strokeWidth: 1.5, strokeOpacity: 0.7 },
            };
          }
        }),
      );

      timer = setTimeout(() => {
        doneIds = [...doneIds, currentId];
        step++;
        advance();
      }, STEP_MS);
    };

    timer = setTimeout(advance, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.28 }}
      nodesDraggable
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      minZoom={0.3}
      maxZoom={1.5}
      style={{ background: "transparent" }}
    >
      <Background
        gap={18}
        size={1.2}
        color="var(--border-subtle)"
        variant={BackgroundVariant.Dots}
      />
      <ZoomPanel />
    </ReactFlow>
  );
}

/* ── Public export ── */
export function HeroFlowCanvas({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full", className)}>
      <ReactFlowProvider>
        <HeroFlowInner />
      </ReactFlowProvider>
    </div>
  );
}

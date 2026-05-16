"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Edge,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnEdgesChange,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import {
  GitBranch,
  Globe,
  LayoutList,
  Mail,
  MessageSquare,
  Shuffle,
  Sparkles,
  Timer,
  Webhook,
} from "lucide-react";

import {
  BaseNode,
  BaseNodeBadge,
  BaseNodeIcon,
} from "@/components/nodes/base-node";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

/* ── Types ── */
type HeroStatus = "idle" | "running" | "success";

type HeroIcon =
  | "timer"
  | "globe"
  | "shuffle"
  | "branch"
  | "sheet"
  | "webhook"
  | "ai"
  | "slack"
  | "email";

interface HeroData extends Record<string, unknown> {
  label: string;
  sub?: string;
  status: HeroStatus;
  icon: HeroIcon;
  isTrigger?: boolean;
  badge?: string;
  outputs?: { id: string; label?: string }[];
}

/* ── Icon map ── */
const ICON_MAP: Record<HeroIcon, React.ComponentType<{ className?: string }>> = {
  timer: Timer,
  globe: Globe,
  shuffle: Shuffle,
  branch: GitBranch,
  sheet: LayoutList,
  webhook: Webhook,
  ai: Sparkles,
  slack: MessageSquare,
  email: Mail,
};

/* ── Tone per icon — matches the action/trigger families in the editor. ── */
function toneFor(d: HeroData): "trigger" | "branch" | "ai" | "action" {
  if (d.isTrigger) {return "trigger";}
  if (d.icon === "branch") {return "branch";}
  if (d.icon === "ai") {return "ai";}
  return "action";
}

/* ── Hero node — wraps the real BaseNode so the marketing canvas matches
       the editor 1:1 (label-below-tile, tone stripe, status corner dot,
       stamp shadow). ── */
const HeroNode = memo(function HeroNode({ data }: NodeProps) {
  const d = data as HeroData;
  const Icon = ICON_MAP[d.icon] ?? Globe;
  const outputs = d.outputs ?? [{ id: "out" }];

  const baseStatus: "default" | "running" | "success" =
    d.status === "running"
      ? "running"
      : d.status === "success"
        ? "success"
        : "default";

  return (
    <BaseNode
      status={baseStatus}
      tone={toneFor(d)}
      label={d.label}
      subtitle={d.sub}
      badge={d.badge ? <BaseNodeBadge>{d.badge}</BaseNodeBadge> : undefined}
    >
      <BaseNodeIcon>
        <Icon />
      </BaseNodeIcon>

      {/* Input port — left edge, vertically centered on the 80px tile. */}
      {!d.isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ top: "50%" }}
          className="!size-2.5 !rounded-full !border-[1.5px] !border-border-strong !bg-bg-canvas"
        />
      )}

      {/* Output ports — single: centered. Multi: spread along right edge. */}
      {outputs.map((o, i) => (
        <Handle
          key={o.id}
          type="source"
          id={o.id}
          position={Position.Right}
          style={{
            top:
              outputs.length === 1
                ? "50%"
                : `${28 + (i * (72 - 28)) / (outputs.length - 1)}%`,
          }}
          className="!size-2.5 !rounded-full !border-[1.5px] !border-border-strong !bg-bg-canvas"
        />
      ))}

      {/* Inline mono labels next to multi-output handles (true / false). */}
      {outputs.length > 1 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -right-1 flex flex-col justify-around"
        >
          {outputs.map((o) => (
            <span
              key={`${o.id}-lbl`}
              className="text-text-muted translate-x-full pl-3 font-mono text-[9px] font-semibold tracking-[0.06em] uppercase whitespace-nowrap"
            >
              {o.label ?? o.id}
            </span>
          ))}
        </div>
      )}
    </BaseNode>
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

/* ── Execution animation — runs the "paid plan" branch end-to-end, then
       loops. The "free plan" branch is left idle (subtle animated edges)
       so the demo communicates: "this is a real, branching workflow." ── */
const EXEC_ORDER = [
  "webhook",
  "fetch",
  "ai",
  "set",
  "if_plan",
  "slack",
  "crm",
  "sheet_p",
];
const STEP_MS = 1100;
const PAUSE_MS = 1800;

/* Maps each animated edge to the target node it leads into. Edges that
   live on the dormant branch (e9, e10, e11) are intentionally absent —
   they stay at their initial ambient style throughout the run. */
const EDGE_TARGET_NODE: Record<string, string> = {
  e1: "fetch",
  e2: "ai",
  e3: "set",
  e4: "if_plan",
  e5: "slack",
  e6: "crm",
  e7: "sheet_p",
};

/* ── Initial nodes — multi-stage signup routing workflow.

       Main path:  Webhook → Fetch user → AI classify → Set fields → If paid?
       Yes branch: Slack #sales → Push to CRM → Add to Sheet (Premium) → +
       No branch:  Delay 5m → Send welcome email → Add to Sheet (Free)  → + */
type HeroFlowNode = Node<HeroData>;

const INITIAL_NODES: HeroFlowNode[] = [
  /* ── Main path ── */
  {
    id: "webhook",
    type: "heroNode",
    position: { x: 0, y: 120 },
    data: {
      label: "On Sign-up",
      sub: "POST /webhook",
      icon: "webhook",
      status: "idle",
      isTrigger: true,
      badge: "HOOK",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "fetch",
    type: "heroNode",
    position: { x: 200, y: 120 },
    data: {
      label: "Fetch User",
      sub: "api.flow.dev/users",
      icon: "globe",
      status: "idle",
      badge: "GET",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "ai",
    type: "heroNode",
    position: { x: 400, y: 120 },
    data: {
      label: "Classify Intent",
      sub: "GPT-4o · 3 labels",
      icon: "ai",
      status: "idle",
      badge: "LLM",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "set",
    type: "heroNode",
    position: { x: 600, y: 120 },
    data: {
      label: "Merge Fields",
      sub: "user · intent · plan",
      icon: "shuffle",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "if_plan",
    type: "heroNode",
    position: { x: 800, y: 120 },
    data: {
      label: "If Paid Plan",
      sub: 'plan === "paid"',
      icon: "branch",
      status: "idle",
      badge: "IF",
      outputs: [
        { id: "yes", label: "yes" },
        { id: "no", label: "no" },
      ],
    },
  },

  /* ── Yes branch (top) ── */
  {
    id: "slack",
    type: "heroNode",
    position: { x: 1040, y: 0 },
    data: {
      label: "Slack #sales",
      sub: "Notify team",
      icon: "slack",
      status: "idle",
      badge: "OPS",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "crm",
    type: "heroNode",
    position: { x: 1240, y: 0 },
    data: {
      label: "Push to CRM",
      sub: "POST /contacts",
      icon: "globe",
      status: "idle",
      badge: "POST",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "sheet_p",
    type: "heroNode",
    position: { x: 1440, y: 0 },
    data: {
      label: "Log Premium",
      sub: "Append: Sheet",
      icon: "sheet",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "plus_p",
    type: "plus",
    position: { x: 1582, y: 33 },
    data: {} as HeroData,
  },

  /* ── No branch (bottom) ── */
  {
    id: "delay",
    type: "heroNode",
    position: { x: 1040, y: 240 },
    data: {
      label: "Wait 5 min",
      sub: "Cool-off",
      icon: "timer",
      status: "idle",
      badge: "WAIT",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "email",
    type: "heroNode",
    position: { x: 1240, y: 240 },
    data: {
      label: "Send Welcome",
      sub: "hi@flow.dev",
      icon: "email",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "sheet_f",
    type: "heroNode",
    position: { x: 1440, y: 240 },
    data: {
      label: "Log Free Tier",
      sub: "Append: Sheet",
      icon: "sheet",
      status: "idle",
      outputs: [{ id: "out" }],
    },
  },
  {
    id: "plus_f",
    type: "plus",
    position: { x: 1582, y: 273 },
    data: {} as HeroData,
  },
];

const EDGE_BASE = {
  stroke: "var(--border-strong)",
  strokeWidth: 1.5,
  strokeOpacity: 0.7,
};

const INITIAL_EDGES = [
  /* Main path */
  { id: "e1", source: "webhook",  sourceHandle: "out", target: "fetch",   targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e2", source: "fetch",    sourceHandle: "out", target: "ai",      targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e3", source: "ai",       sourceHandle: "out", target: "set",     targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e4", source: "set",      sourceHandle: "out", target: "if_plan", targetHandle: "in", animated: true, style: EDGE_BASE },

  /* Yes branch */
  { id: "e5", source: "if_plan",  sourceHandle: "yes", target: "slack",   targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e6", source: "slack",    sourceHandle: "out", target: "crm",     targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e7", source: "crm",      sourceHandle: "out", target: "sheet_p", targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e8", source: "sheet_p",  sourceHandle: "out", target: "plus_p",  targetHandle: "in", animated: false, style: { stroke: "var(--border-subtle)", strokeWidth: 1.5 } },

  /* No branch */
  { id: "e9",  source: "if_plan", sourceHandle: "no",  target: "delay",   targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e10", source: "delay",   sourceHandle: "out", target: "email",   targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e11", source: "email",   sourceHandle: "out", target: "sheet_f", targetHandle: "in", animated: true, style: EDGE_BASE },
  { id: "e12", source: "sheet_f", sourceHandle: "out", target: "plus_f",  targetHandle: "in", animated: false, style: { stroke: "var(--border-subtle)", strokeWidth: 1.5 } },
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
            {return { ...n, data: { ...n.data, status: "running" as HeroStatus } };}
          if (snapshotDone.includes(n.id))
            {return { ...n, data: { ...n.data, status: "success" as HeroStatus } };}
          return { ...n, data: { ...n.data, status: "idle" as HeroStatus } };
        }),
      );

      /* Highlight edges based on running/done nodes */
      setEdges((prev) =>
        prev.map((e) => {
          const target = EDGE_TARGET_NODE[e.id];
          if (!target) {return e;} // e6, e7 are static, leave them alone
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
      fitViewOptions={{ padding: 0.12 }}
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

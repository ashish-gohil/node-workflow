"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  Clock,
  Cloud,
  Code2,
  Database,
  FileJson,
  Globe,
  Pause,
  Play,
  RotateCcw,
  Search,
  SendHorizontal,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

import CornerIcons from "@/components/ui/corners";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────── */
/*  Shared card wrapper                         */
/* ──────────────────────────────────────────── */

function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`bento-card group flex flex-col ${className}`}
    >
      <CornerIcons size="md" className="z-10" />
      {children}
    </motion.article>
  );
}

/* Both `BentoVisual` (top) and `CardBody` (bottom) are pinned to the same
 * fixed height so every card reads as a clean 2-tile composition regardless
 * of content length. Tall enough that no description truncates even in the
 * narrowest col-span-4 cards. */

function BentoVisual({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-[260px] w-full overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

/* Hook: fires true when the nearest .group card is hovered. */
function useGroupHover<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const card = node.closest(".group");
    if (!card) {
      return;
    }
    const on = () => setHovered(true);
    const off = () => setHovered(false);
    card.addEventListener("mouseenter", on);
    card.addEventListener("mouseleave", off);
    return () => {
      card.removeEventListener("mouseenter", on);
      card.removeEventListener("mouseleave", off);
    };
  }, []);

  return { ref, hovered };
}

/* ──────────────────────────────────────────── */
/*  Card 1 — "LLMs are just nodes."             */
/*  Phased agent-loop visualisation using       */
/*  HeroNode-style demo nodes:                  */
/*                                              */
/*    [Webhook] ─► [AI Agent] ─► [Output]       */
/*                  ▲ ▼                         */
/*           [Search] [GPT-4o] [Memory]         */
/*                                              */
/*  Each phase highlights one node, animates a  */
/*  packet along its edge to AI Agent, and back │
/*  the loop runs 3 iterations before firing    │
/*  the Output. That visible loop is the aha:   │
/*  the agent is "thinking" by walking the      │
/*  graph, not by being a black box.            │
/* ──────────────────────────────────────────── */

type DemoStatus = "idle" | "running" | "success";
type AINodeId =
  | "trigger"
  | "agent"
  | "output"
  | "search"
  | "model"
  | "memory";

interface DemoNodeSpec {
  id: AINodeId;
  icon: React.ElementType;
  label: string;
  iconColor: string;
  /** Percent-coordinate centre of the node within the visual. */
  cx: number;
  cy: number;
}

/* Node sizes — AI Agent is the visual anchor so it's slightly bigger. */
const NODE_PX = 52;
const AGENT_PX = 62;

/* Layout: top row Webhook / AI Agent / Output evenly spaced at cy=30;
 * bottom row Search / GPT-4o / Memory at cy=78, GPT-4o aligned with AI Agent
 * so the vertical edge reads as a clean column. */
const AI_NODES: DemoNodeSpec[] = [
  { id: "trigger", icon: Zap,        label: "Webhook",     iconColor: "var(--color-warning)",    cx: 13, cy: 30 },
  { id: "agent",   icon: Bot,        label: "AI Agent",    iconColor: "var(--accent-primary)",   cx: 50, cy: 30 },
  { id: "output",  icon: ArrowRight, label: "Output",      iconColor: "var(--color-success)",    cx: 87, cy: 30 },
  { id: "search",  icon: Search,     label: "Web Search",  iconColor: "var(--color-forest-300)", cx: 22, cy: 80 },
  { id: "model",   icon: Brain,      label: "GPT-4o",      iconColor: "var(--color-info)",       cx: 50, cy: 80 },
  { id: "memory",  icon: Database,   label: "Memory",      iconColor: "#a78bfa",                 cx: 78, cy: 80 },
];

/* Edges drawn in 0-100 viewBox coords so they scale. Curve paths land on the
 * agent's centre (50,30) and on each tool's centre. */
const TOOL_EDGES = {
  search: "M 50 30 C 50 55 22 55 22 80",
  model:  "M 50 30 L 50 80",
  memory: "M 50 30 C 50 55 78 55 78 80",
} as const;

const TRIGGER_EDGE = "M 13 30 L 50 30";
const OUTPUT_EDGE  = "M 50 30 L 87 30";

/* ── Sparkles — deterministic positions so SSR + client render match. ──
 *
 * Light "starfield" texture for the visual area. Each sparkle pulses with
 * its own delay so the field twinkles continuously. Positions are derived
 * from a fixed seed (no Math.random — would hydration-mismatch). */
type Sparkle = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  accent: boolean;
};

const SPARKLES: Sparkle[] = Array.from({ length: 22 }, (_, i) => {
  // Two independent linear-congruential streams for x/y.
  const a = ((i * 9301 + 49297) % 233280) / 233280;
  const b = ((i * 5347 + 12911) % 233280) / 233280;
  return {
    x: 2 + a * 96,
    y: 4 + b * 90,
    size: 0.9 + ((i * 0.31) % 1.4),
    delay: (i * 0.327) % 4.5,
    duration: 2 + ((i * 0.21) % 2.4),
    accent: i % 5 === 0, // ~1 in 5 are brand-coloured for variety
  };
});

function SparkleField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Subtle base dot grid for texture. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle, var(--color-text-muted) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      {/* Twinkling sparkles. */}
      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: [0, s.accent ? 0.85 : 0.55, 0],
            scale: [0.6, 1, 0.6],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "absolute rounded-full",
            s.accent ? "bg-accent-primary" : "bg-text-muted"
          )}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            boxShadow: s.accent
              ? "0 0 6px color-mix(in oklab, var(--accent-primary) 70%, transparent)"
              : "0 0 3px color-mix(in oklab, var(--color-text-muted) 40%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Phase machine ──
 *   0  trigger      — Webhook fires, packet → AI Agent
 *   1  tool: search — AI Agent → Search → AI Agent (iter 1)
 *   2  tool: model  — AI Agent → GPT-4o → AI Agent (iter 2)
 *   3  tool: memory — AI Agent → Memory → AI Agent (iter 3)
 *   4  output       — AI Agent → Output (final)
 *   5  hold         — pause on success
 */
type AIPhase = 0 | 1 | 2 | 3 | 4 | 5;

const PHASE_TOOL: Record<AIPhase, AINodeId | null> = {
  0: null,
  1: "search",
  2: "model",
  3: "memory",
  4: null,
  5: null,
};

/* Demo node visual — matches HeroNode (icon square + label) sized down for
 * the bento context. No ReactFlow context required. AI Agent is rendered
 * slightly larger so it anchors the composition. */
function DemoNode({
  spec,
  status,
  brand = false,
}: {
  spec: DemoNodeSpec;
  status: DemoStatus;
  brand?: boolean;
}) {
  const Icon = spec.icon;
  const isRunning = status === "running";
  const isDone = status === "success";
  const size = brand ? AGENT_PX : NODE_PX;
  const iconPx = brand ? 26 : 22;

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${spec.cx}%`,
        top: `${spec.cy}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        animate={{
          scale: isRunning ? 1.05 : 1,
          y: isRunning ? -1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "rounded-node bg-bg-elevated relative flex items-center justify-center border transition-colors duration-[200ms]",
          isRunning
            ? "border-forest-300"
            : isDone
              ? "border-border-default"
              : brand
                ? "border-accent-primary/40"
                : "border-border-default"
        )}
        style={{
          width: size,
          height: size,
          boxShadow: isRunning
            ? "inset 2px 0 0 0 var(--accent-primary), 0 0 0 2px rgba(79,201,122,0.18), 0 2px 6px rgba(0,0,0,0.35)"
            : isDone
              ? "inset 2px 0 0 0 var(--color-success), 0 1px 3px rgba(0,0,0,0.3)"
              : brand
                ? "inset 2px 0 0 0 var(--accent-primary), 0 2px 6px rgba(0,0,0,0.35)"
                : "0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        <Icon size={iconPx} strokeWidth={1.5} style={{ color: spec.iconColor }} />
        {isRunning && (
          <span
            aria-hidden
            className="border-forest-300 rounded-node animate-pulse pointer-events-none absolute -inset-px border"
          />
        )}
      </motion.div>
      {/* Fixed label width = uniform alignment across the row. */}
      <div className="text-text-primary mt-2 w-[92px] truncate text-center text-[10px] leading-tight font-semibold">
        {spec.label}
      </div>
    </div>
  );
}

/* Animated edge — static subtle track + a single "packet" dash that runs
 * along it when active. Uses the same palette as the workflow editor (subtle
 * track + accent-primary running highlight). `forward=false` reverses
 * direction (used for the inbound trip back to the AI Agent). */
function FlowEdge({
  d,
  active,
  forward = true,
  duration = 0.5,
}: {
  d: string;
  active: boolean;
  forward?: boolean;
  duration?: number;
}) {
  return (
    <g>
      {/* Static track — same neutral subtle stroke the editor uses for idle edges. */}
      <path
        d={d}
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth="0.55"
        strokeLinecap="round"
      />
      {/* Active highlight — accent-primary just like a running edge in the editor. */}
      <motion.path
        d={d}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth="0.7"
        strokeLinecap="round"
        animate={{ opacity: active ? 0.9 : 0 }}
        transition={{ duration: 0.18 }}
      />
      {/* Single bright packet riding along the active edge. */}
      {active && (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="3 200"
          initial={{ strokeDashoffset: forward ? 0 : -203 }}
          animate={{ strokeDashoffset: forward ? -203 : 0 }}
          transition={{ duration, ease: "easeInOut" }}
        />
      )}
    </g>
  );
}

function AIVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [phase, setPhase] = useState<AIPhase>(0);
  /* Outbound vs inbound sub-step within a tool phase. */
  const [direction, setDirection] = useState<"out" | "in">("out");

  useEffect(() => {
    /* Hover speeds the loop up — slow & calm by default so the page breathes. */
    const stepMs = hovered ? 480 : 950;
    const holdMs = hovered ? 700 : 1400;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = (nextPhase: AIPhase, nextDir: "out" | "in" = "out") => {
      if (cancelled) {return;}
      setPhase(nextPhase);
      setDirection(nextDir);

      /* Phase scheduling — tool phases split into out then in. */
      if (nextPhase === 0) {
        timer = setTimeout(() => tick(1, "out"), stepMs);
      } else if (nextPhase >= 1 && nextPhase <= 3) {
        if (nextDir === "out") {
          timer = setTimeout(() => tick(nextPhase, "in"), stepMs);
        } else {
          timer = setTimeout(
            () => tick(((nextPhase + 1) as AIPhase), "out"),
            stepMs
          );
        }
      } else if (nextPhase === 4) {
        timer = setTimeout(() => tick(5), stepMs);
      } else {
        // hold then reset
        timer = setTimeout(() => tick(0), holdMs);
      }
    };

    timer = setTimeout(() => tick(0), 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hovered]);

  /* Derive each node's status from current phase. */
  const statusFor = (id: AINodeId): DemoStatus => {
    const isToolPhase = phase >= 1 && phase <= 3;
    const activeTool = PHASE_TOOL[phase];

    if (id === "trigger") {
      if (phase === 0) {return "running";}
      return "success";
    }
    if (id === "agent") {
      if (phase === 0) {return "idle";}
      if (phase === 5) {return "success";}
      return "running"; // thinking through every tool phase + output
    }
    if (id === "output") {
      if (phase === 4) {return "running";}
      if (phase === 5) {return "success";}
      return "idle";
    }
    // tools
    if (isToolPhase && activeTool === id) {return "running";}
    if (phase > 3) {return "success";}
    /* Tools that already fired in earlier iterations are "success". */
    const order: AINodeId[] = ["search", "model", "memory"];
    const myIdx = order.indexOf(id);
    const currentIdx = isToolPhase ? phase - 1 : -1;
    if (myIdx >= 0 && myIdx < currentIdx) {return "success";}
    return "idle";
  };

  const iter = phase >= 1 && phase <= 3 ? phase : 0;
  const activeTool = PHASE_TOOL[phase];

  return (
    <BentoVisual>
      <div ref={ref} className="absolute inset-0 overflow-hidden">
        {/* Sparkling dot field — subtle dot grid + 22 twinkling stars. */}
        <SparkleField />

        {/* Brand glow behind AI Agent */}
        <motion.div
          aria-hidden
          animate={{
            opacity: phase === 0 ? 0.14 : 0.32,
            scale: hovered ? 1.12 : 1,
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute"
          style={{
            left: "50%",
            top: "30%",
            width: 220,
            height: 160,
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(ellipse at 50% 50%, var(--accent-primary), transparent 65%)",
            filter: "blur(36px)",
          }}
        />

        {/* SVG edges — single track/highlight palette like the editor. */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <FlowEdge d={TRIGGER_EDGE} active={phase === 0} duration={0.55} />
          {(["search", "model", "memory"] as const).map((tool) => {
            const d = TOOL_EDGES[tool];
            const isActive = activeTool === tool;
            return (
              <g key={tool}>
                <FlowEdge
                  d={d}
                  active={isActive && direction === "out"}
                  forward
                  duration={0.45}
                />
                <FlowEdge
                  d={d}
                  active={isActive && direction === "in"}
                  forward={false}
                  duration={0.45}
                />
              </g>
            );
          })}
          <FlowEdge d={OUTPUT_EDGE} active={phase === 4} duration={0.6} />
        </svg>

        {/* Demo nodes */}
        {AI_NODES.map((spec) => (
          <DemoNode
            key={spec.id}
            spec={spec}
            status={statusFor(spec.id)}
            brand={spec.id === "agent"}
          />
        ))}

        {/* Iteration counter — small pill anchored above the AI Agent. */}
        <motion.div
          aria-hidden
          animate={{
            opacity: phase >= 1 && phase <= 3 ? 1 : 0,
            y: phase >= 1 && phase <= 3 ? 0 : -4,
          }}
          transition={{ duration: 0.22 }}
          className="border-border-default bg-bg-elevated text-text-secondary absolute flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.05em] uppercase"
          style={{
            left: "50%",
            top: "5%",
            transform: "translate(-50%, 0)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        >
          <span className="bg-accent-primary size-1 rounded-full" />
          iter <span className="text-text-primary tabular-nums">{iter}/3</span>
        </motion.div>
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 2 — Agents                             */
/*  Tool-call log — shows the agent loop:       */
/*  each iteration lights up a tool call row.   */
/* ──────────────────────────────────────────── */

const TOOL_CALLS = [
  {
    icon: <Search />,
    tool: "web_search",
    arg: "latest GPT benchmarks",
    status: "done",
    ms: "312ms",
  },
  {
    icon: <Code2 />,
    tool: "run_code",
    arg: "parse_json(response)",
    status: "done",
    ms: "18ms",
  },
  {
    icon: <Globe />,
    tool: "http_request",
    arg: "POST /v1/summarise",
    status: "running",
    ms: "…",
  },
  {
    icon: <Database />,
    tool: "memory_write",
    arg: "store context[3]",
    status: "pending",
    ms: "",
  },
  {
    icon: <ArrowRight />,
    tool: "respond",
    arg: "stream reply to user",
    status: "pending",
    ms: "",
  },
] as const;

function AgentsVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeIdx, setActiveIdx] = useState(2);

  useEffect(() => {
    const ms = hovered ? 600 : 1400;
    const iv = setInterval(
      () => setActiveIdx((i) => (i + 1) % TOOL_CALLS.length),
      ms
    );
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual className="flex flex-col">
      {/* Agent header strip */}
      <div className="border-border-default bg-bg-surface flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        <motion.div
          animate={{
            scale: hovered ? [1, 1.25, 1] : [1, 1.1, 1],
            backgroundColor: hovered
              ? [
                  "var(--accent-primary)",
                  "var(--color-success)",
                  "var(--accent-primary)",
                ]
              : ["var(--accent-primary)"],
          }}
          transition={{
            duration: hovered ? 1 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="size-2 rounded-full"
          style={{ backgroundColor: "var(--accent-primary)" }}
        />
        <span className="text-text-secondary font-mono text-[11px] font-semibold">
          AI Agent
        </span>
        <span className="text-text-muted ml-auto font-mono text-[10px]">
          loop · iter {activeIdx + 1}
        </span>
      </div>

      {/* Tool call rows — flex-1 so they fill remaining visual height */}
      <div ref={ref} className="flex flex-1 flex-col">
        {TOOL_CALLS.map((call, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <motion.div
              key={i}
              animate={{
                backgroundColor: isActive
                  ? "rgba(79,201,122,0.06)"
                  : "transparent",
                x: isActive ? 3 : 0,
              }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="border-border-subtle flex flex-1 items-center gap-2.5 border-b px-4 last:border-b-0"
            >
              {/* Status dot */}
              <motion.span
                animate={{
                  scale:
                    call.status === "running" && isActive ? [1, 1.5, 1] : 1,
                  opacity: call.status === "pending" && !isActive ? 0.3 : 1,
                }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="size-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: isPast
                    ? "var(--color-success)"
                    : isActive
                      ? "var(--accent-primary)"
                      : "var(--color-border-strong)",
                }}
              />

              {/* Tool chip */}
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-bold",
                  "[&_svg]:size-2.5",
                  isActive || isPast
                    ? "border-border-default bg-bg-elevated text-text-primary"
                    : "border-border-subtle text-text-disabled bg-transparent"
                )}
              >
                {call.icon}
                {call.tool}
              </span>

              {/* Arg */}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-[10px]",
                  isActive
                    ? "text-text-primary"
                    : isPast
                      ? "text-text-secondary"
                      : "text-text-disabled"
                )}
              >
                {call.arg}
              </span>

              {/* Timing */}
              <span
                className={cn(
                  "shrink-0 font-mono text-[9px]",
                  isPast ? "text-success" : "text-text-muted"
                )}
              >
                {isPast ? call.ms : isActive ? "…" : ""}
              </span>
            </motion.div>
          );
        })}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 3: API Orchestration                   */
/* ──────────────────────────────────────────── */

const API_ROWS = [
  {
    verb: "GET",
    path: "/v1/users/:id",
    ms: "42ms",
    verbBg: "bg-info text-bg-canvas",
  },
  {
    verb: "POST",
    path: "/v1/orders",
    ms: "81ms",
    verbBg: "bg-accent-primary text-accent-on",
  },
  {
    verb: "PUT",
    path: "/v1/inventory",
    ms: "37ms",
    verbBg: "bg-warning text-bg-canvas",
  },
  {
    verb: "DEL",
    path: "/v1/sessions/x",
    ms: "12ms",
    verbBg: "bg-error text-cream-50",
  },
  {
    verb: "POST",
    path: "/v1/notify",
    ms: "90ms",
    verbBg: "bg-accent-primary text-accent-on",
  },
] as const;

function APIVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeRow, setActiveRow] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveRow(-1);
      return;
    }
    let i = 0;
    setActiveRow(0);
    const iv = setInterval(() => {
      i = (i + 1) % API_ROWS.length;
      setActiveRow(i);
    }, 600);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual>
      <div
        ref={ref}
        className="flex h-full flex-col justify-evenly p-5 font-mono"
      >
        {API_ROWS.map((row, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            animate={{
              x: activeRow === i ? 6 : 0,
              backgroundColor:
                activeRow === i ? "var(--accent-subtle)" : "transparent",
            }}
            className="flex cursor-default items-center gap-3 px-2 py-1.5"
          >
            <span
              className={`border-border-stamp w-9 shrink-0 border px-1.5 py-0.5 text-center text-[10px] font-bold ${row.verbBg}`}
            >
              {row.verb}
            </span>
            <span className="text-text-secondary flex-1 truncate text-[11px]">
              {row.path}
            </span>
            <span className="text-text-muted shrink-0 text-[10px]">
              {row.ms}
            </span>
          </motion.div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 4: Schedule / Cron                     */
/* ──────────────────────────────────────────── */

const CRON_LINES = [
  { expr: "0 * * * *", label: "hourly", hour: 30, minute: 0 },
  { expr: "*/15 * * * *", label: "every 15min", hour: 45, minute: 30 },
  { expr: "0 9 * * 1-5", label: "weekdays 9am", hour: 20, minute: 40 },
  { expr: "0 0 1 * *", label: "monthly", hour: 0, minute: 80 },
] as const;

function CronVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!hovered) {
      setActiveIdx(0);
      return;
    }
    const t = setInterval(
      () => setActiveIdx((i) => (i + 1) % CRON_LINES.length),
      1400
    );
    return () => clearInterval(t);
  }, [hovered]);

  const active = CRON_LINES[activeIdx];

  return (
    <BentoVisual className="flex items-center gap-5 p-6">
      <div ref={ref} className="contents">
        <div className="relative size-24 shrink-0">
          <div className="border-text-primary dark:border-border-default bg-bg-elevated absolute inset-0 rounded-full border-2" />
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="bg-text-primary absolute size-1 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translate(-50%, -42%)`,
              }}
            />
          ))}
          <motion.div
            className="bg-text-primary absolute bottom-1/2 left-1/2 h-6 w-[2px] origin-bottom"
            style={{ x: "-50%" }}
            animate={{ rotate: active.hour }}
            transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.div
            className="bg-accent-primary absolute bottom-1/2 left-1/2 h-9 w-[2px] origin-bottom"
            style={{ x: "-50%" }}
            animate={{ rotate: active.minute }}
            transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
          />
          <div className="bg-accent-primary border-text-primary dark:border-border-default absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" />
        </div>

        <div className="flex-1 space-y-2 overflow-hidden">
          {CRON_LINES.map((line, i) => (
            <motion.div
              key={i}
              animate={{
                x: hovered && i === activeIdx ? 4 : 0,
                opacity: hovered ? (i === activeIdx ? 1 : 0.45) : 1,
              }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2"
            >
              <span
                className={`w-28 shrink-0 truncate font-mono text-[10px] font-semibold transition-colors duration-200ms ${hovered && i === activeIdx ? "text-accent-primary" : "text-text-brand"}`}
              >
                {line.expr}
              </span>
              <span
                className={`truncate text-[10px] transition-colors duration-200ms ${hovered && i === activeIdx ? "text-text-primary" : "text-text-muted"}`}
              >
                {line.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 5: Email Automation                    */
/* ──────────────────────────────────────────── */

const EMAIL_STEPS = [
  { icon: "✉", label: "Trigger" },
  { icon: "⚙", label: "Segment" },
  { icon: "✶", label: "AI Personalise" },
  { icon: "↗", label: "Send" },
  { icon: "▦", label: "Analytics" },
];

function EmailVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveStep(-1);
      return;
    }
    let i = 0;
    setActiveStep(0);
    const iv = setInterval(() => {
      i = (i + 1) % EMAIL_STEPS.length;
      setActiveStep(i);
    }, 500);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual className="flex items-center justify-between gap-1 p-6">
      <div ref={ref} className="flex w-full items-start justify-between">
        {EMAIL_STEPS.map((step, i) => (
          <div
            key={step.label}
            className="flex flex-1 items-center gap-1.5 last:flex-initial"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              animate={
                activeStep === i
                  ? {
                      backgroundColor: "var(--accent-primary)",
                      color: "var(--accent-on)",
                      y: -3,
                      scale: 1.06,
                    }
                  : {
                      backgroundColor: "var(--bg-elevated)",
                      color: "var(--text-primary)",
                      y: 0,
                      scale: 1,
                    }
              }
              className="border-text-primary dark:border-border-default flex size-10 flex-col items-center justify-center border-[1.5px] text-base shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-[box-shadow] duration-[200ms]"
            >
              {step.icon}
            </motion.div>
            {i < EMAIL_STEPS.length - 1 && (
              <div className="bg-border-strong relative h-px w-full flex-1 overflow-hidden">
                <motion.div
                  className="bg-accent-primary absolute inset-y-0 left-0"
                  initial={{ width: "0%" }}
                  animate={{ width: hovered && activeStep > i ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 6: Data Pipelines (wide)               */
/*                                              */
/*  Live, interactive ETL demo:                 */
/*    • Auto-cycles through stages every ~1.1s  │
/*    • Hover a stage to override the cycle     │
/*    • Click a stage to pin it (shows PINNED)  │
/*    • Click an item chip to disable it        │
/*    • Run/Pause + Restart controls in ribbon  │
/*                                              */
/*  Connectors use the same FlowEdge palette    │
/*  as card 1 — subtle track + accent packet    │
/*  riding along the active edge.               │
/* ──────────────────────────────────────────── */

interface PipelineItem {
  id: string;
  icon: React.ElementType;
  label: string;
}

interface PipelineStage {
  id: string;
  title: string;
  items: PipelineItem[];
  /** Pretty-printed throughput shown in the stage footer. */
  ratePerSec: number;
}

const PIPELINE: PipelineStage[] = [
  {
    id: "source",
    title: "Source",
    ratePerSec: 2.3,
    items: [
      { id: "webhook", icon: Zap,      label: "Webhook" },
      { id: "cron",    icon: Clock,    label: "Cron" },
      { id: "db",      icon: Database, label: "DB poll" },
    ],
  },
  {
    id: "transform",
    title: "Transform",
    ratePerSec: 2.3,
    items: [
      { id: "parse",    icon: FileJson,    label: "Parse JSON" },
      { id: "validate", icon: ShieldCheck, label: "Validate" },
      { id: "map",      icon: Shuffle,     label: "Map" },
    ],
  },
  {
    id: "enrich",
    title: "Enrich",
    ratePerSec: 1.8,
    items: [
      { id: "classify", icon: Sparkles, label: "AI classify" },
      { id: "lookup",   icon: Search,   label: "Lookup" },
      { id: "tag",      icon: Tag,      label: "Tag" },
    ],
  },
  {
    id: "sink",
    title: "Sink",
    ratePerSec: 1.8,
    items: [
      { id: "postgres", icon: Database,        label: "Postgres" },
      { id: "s3",       icon: Cloud,           label: "S3" },
      { id: "out",      icon: SendHorizontal,  label: "Webhook" },
    ],
  },
];

function formatRows(n: number): string {
  return n.toLocaleString("en-US");
}

/* ── Connector between two stage cards ── */
function PipelineConnector({
  active,
  flowing,
}: {
  active: boolean;
  flowing: boolean;
}) {
  return (
    <div className="relative flex w-6 shrink-0 items-center justify-center">
      <div className="bg-border-subtle relative h-px w-full">
        {active && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            className="bg-accent-primary absolute inset-y-[-0.5px] left-0 w-full"
          />
        )}
        {active && flowing && (
          <motion.span
            aria-hidden
            className="bg-accent-primary absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full"
            style={{
              boxShadow:
                "0 0 6px color-mix(in oklab, var(--accent-primary) 60%, transparent)",
            }}
            initial={{ left: "0%" }}
            animate={{ left: "100%" }}
            transition={{
              duration: 0.7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
      <ChevronRight
        aria-hidden
        className={cn(
          "absolute top-1/2 right-[-3px] size-3 -translate-y-1/2 transition-colors duration-[160ms]",
          active ? "text-accent-primary" : "text-text-muted/50"
        )}
        strokeWidth={2}
      />
    </div>
  );
}

/* ── Stage card — interactive: hover, click-to-pin, item enable/disable ── */
function PipelineStageCard({
  stage,
  active,
  pinned,
  disabledItems,
  onHover,
  onLeave,
  onPin,
  onToggleItem,
}: {
  stage: PipelineStage;
  active: boolean;
  pinned: boolean;
  disabledItems: Set<string>;
  onHover: () => void;
  onLeave: () => void;
  onPin: () => void;
  onToggleItem: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={pinned}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onPin}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPin();
        }
      }}
      className={cn(
        "bg-bg-elevated focus-visible:ring-accent-primary group/stage relative flex flex-1 cursor-pointer flex-col border transition-colors duration-[160ms] focus:outline-none focus-visible:ring-1",
        active ? "border-accent-primary/60" : "border-border-default",
        pinned && "border-accent-primary"
      )}
      style={{
        boxShadow: active
          ? "inset 2px 0 0 0 var(--accent-primary), 0 2px 6px rgba(0,0,0,0.18)"
          : "0 1px 2px rgba(0,0,0,0.10)",
      }}
    >
      {/* Stage header */}
      <div className="border-border-subtle flex items-center justify-between border-b px-2.5 py-1.5">
        <span
          className={cn(
            "font-mono text-[9px] font-bold tracking-[0.12em] uppercase transition-colors duration-[160ms]",
            active ? "text-text-primary" : "text-text-muted"
          )}
        >
          {stage.title}
        </span>
        {pinned && (
          <span className="border-accent-primary text-accent-primary bg-accent-primary/10 border px-1 font-mono text-[8px] font-bold tracking-[0.08em] uppercase">
            pinned
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        {stage.items.map((item, idx) => {
          const Icon = item.icon;
          const disabled = disabledItems.has(item.id);
          const lit = active && !disabled;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleItem(item.id);
              }}
              animate={
                lit
                  ? { x: [0, 2, 0] }
                  : { x: 0 }
              }
              transition={
                lit
                  ? {
                      duration: 0.55,
                      delay: idx * 0.08,
                      repeat: 0,
                    }
                  : { duration: 0.15 }
              }
              className={cn(
                "bg-bg-canvas flex items-center gap-1.5 border px-2 py-1 text-left transition-colors duration-[160ms]",
                disabled
                  ? "border-border-subtle text-text-disabled opacity-50"
                  : lit
                    ? "border-border-default text-text-primary"
                    : "border-border-subtle text-text-secondary hover:border-border-default hover:text-text-primary"
              )}
            >
              <Icon
                className={cn(
                  "size-3 shrink-0 transition-colors duration-[160ms]",
                  disabled
                    ? "text-text-disabled"
                    : lit
                      ? "text-accent-primary"
                      : "text-text-muted"
                )}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "truncate text-[10px] font-medium",
                  disabled && "line-through"
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Footer rate */}
      <div
        className={cn(
          "border-border-subtle flex items-center justify-between border-t px-2.5 py-1 font-mono text-[9px] transition-colors duration-[160ms]",
          active ? "text-text-secondary" : "text-text-muted"
        )}
      >
        <span className="tracking-[0.1em] uppercase">events/s</span>
        <span className="tabular-nums font-semibold">
          {stage.ratePerSec.toFixed(1)}k
        </span>
      </div>
    </div>
  );
}

function PipelineVisual() {
  const [autoIdx, setAutoIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const [disabledItems, setDisabledItems] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(true);
  const [rowCount, setRowCount] = useState(12_847);
  const [throughput, setThroughput] = useState(2.3);

  /* Cycle auto-active stage. Pin freezes auto-cycle so the pinned stage
   * stays highlighted. */
  useEffect(() => {
    if (!running || pinnedIdx !== null) {return;}
    const t = setInterval(() => {
      setAutoIdx((i) => (i + 1) % PIPELINE.length);
    }, 1100);
    return () => clearInterval(t);
  }, [running, pinnedIdx]);

  /* Live row counter + sinusoidal throughput jitter. */
  useEffect(() => {
    if (!running) {return;}
    const t = setInterval(() => {
      setRowCount((c) => c + 20 + Math.floor((Date.now() / 200) % 35));
      setThroughput(2.0 + 0.45 * Math.sin(Date.now() / 850));
    }, 220);
    return () => clearInterval(t);
  }, [running]);

  /* Hover > pinned > auto. */
  const effectiveIdx = hoverIdx ?? pinnedIdx ?? autoIdx;

  const toggleItem = (id: string) => {
    setDisabledItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {next.delete(id);}
      else {next.add(id);}
      return next;
    });
  };

  const restart = () => {
    setRowCount(0);
    setPinnedIdx(null);
    setDisabledItems(new Set());
    setAutoIdx(0);
  };

  const togglePin = (i: number) => {
    setPinnedIdx((prev) => (prev === i ? null : i));
  };

  return (
    <BentoVisual className="flex flex-col">
      {/* Status ribbon */}
      <div className="border-border-subtle bg-bg-canvas/50 flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="text-text-secondary flex items-center gap-2.5 font-mono text-[11px]">
          <span className="text-text-muted text-[10px] font-bold tracking-[0.14em] uppercase">
            ETL
          </span>
          <span className="bg-border-default size-1 rounded-full" />
          <span className="tabular-nums">
            <span className="text-text-primary font-semibold">
              {formatRows(rowCount)}
            </span>{" "}
            rows
          </span>
          <span className="bg-border-default size-1 rounded-full" />
          <span className="tabular-nums">
            <span className="text-accent-primary font-semibold">
              {throughput.toFixed(1)}k
            </span>
            /s
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            aria-pressed={running}
            className={cn(
              "border-border-default bg-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors duration-[160ms] [&_svg]:size-2.5"
            )}
          >
            {running ? (
              <Pause strokeWidth={2.5} />
            ) : (
              <Play strokeWidth={2.5} />
            )}
            <span className="tracking-[0.08em] uppercase">
              {running ? "Running" : "Paused"}
            </span>
            <span className="relative ml-0.5 inline-flex size-1.5 items-center justify-center">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  running ? "bg-success" : "bg-text-muted"
                )}
              />
              {running && (
                <span className="bg-success absolute inline-flex size-1.5 animate-ping rounded-full opacity-75" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={restart}
            aria-label="Restart"
            className="border-border-default bg-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary grid size-6 place-items-center border transition-colors duration-[160ms] [&_svg]:size-3"
          >
            <RotateCcw />
          </button>
        </div>
      </div>

      {/* Stages row */}
      <div
        className="flex flex-1 items-stretch gap-2 p-3"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {PIPELINE.map((stage, i) => (
          <div key={stage.id} className="flex flex-1 items-stretch">
            <PipelineStageCard
              stage={stage}
              active={effectiveIdx === i}
              pinned={pinnedIdx === i}
              disabledItems={disabledItems}
              onHover={() => setHoverIdx(i)}
              onLeave={() => setHoverIdx((curr) => (curr === i ? null : curr))}
              onPin={() => togglePin(i)}
              onToggleItem={toggleItem}
            />
            {i < PIPELINE.length - 1 && (
              <PipelineConnector
                active={effectiveIdx === i || effectiveIdx === i + 1}
                flowing={running}
              />
            )}
          </div>
        ))}
      </div>
    </BentoVisual>
  );
}

/* ──────────────────────────────────────────── */
/*  Card body                                   */
/* ──────────────────────────────────────────── */

function CardBody({
  eyebrow,
  num,
  title,
  desc,
  mutedDesc = false,
}: {
  eyebrow: string;
  num: string;
  title: string;
  desc: string;
  mutedDesc?: boolean;
}) {
  return (
    <div
      className={cn(
        // Match top section height. `min-h` so unexpectedly long copy can grow.
        "bg-bg-surface border-text-primary dark:border-border-default",
        "flex min-h-[260px] flex-col justify-center border-t-[1.5px] px-7 py-7"
      )}
    >
      <p className="text-text-muted mb-3 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase">
        <span className="bg-accent-primary text-accent-on border-border-stamp border px-1.5 py-0.5 font-bold">
          {num}
        </span>
        {eyebrow}
      </p>
      <h3 className="text-text-primary mb-2 text-[20px] leading-[1.2] font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <p
        className={cn(
          "text-body-sm leading-relaxed",
          mutedDesc ? "text-text-muted" : "text-text-secondary"
        )}
      >
        {desc}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  Section                                     */
/* ──────────────────────────────────────────── */

export default function BentoFeatures() {
  return (
    <section className="py-24">
      <div className="section-container">
        <div className="mb-14 flex flex-col gap-8 md:flex-row md:items-end">
          <div className="flex-1">
            <p className="text-text-primary mb-5 inline-flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
              <span className="bg-accent-primary h-px w-6" />
              Things people actually build
            </p>
            <h2 className="text-text-primary max-w-[680px] text-[clamp(36px,4.6vw,56px)] leading-[1.0] font-semibold tracking-[-0.04em]">
              One editor.
              <br />
              Six kinds of work.
            </h2>
          </div>
          <p className="text-body-md text-text-secondary max-w-sm">
            The same canvas handles a daily report, an agent that escalates to a
            human, and the webhook stitching them together.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <BentoCard className="md:col-span-8">
            <AIVisual />
            <CardBody
              num="01"
              eyebrow="Models & retrieval"
              title="LLMs are just nodes."
              desc="One node interface for OpenAI, Anthropic, or whatever runs behind Ollama. Memory and retrieval live in separate nodes, so swapping a model never touches the graph."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <AgentsVisual />
            <CardBody
              num="02"
              eyebrow="Tool-use loops"
              title="Agents with a stop button."
              desc="Pause the loop on any tool call. Read the trace, edit the response, hit resume — same canvas, no separate debugger."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <APIVisual />
            <CardBody
              num="03"
              eyebrow="HTTP"
              title="HTTP without the wrappers."
              desc="Retries, exponential backoff, OAuth refresh, and rate-limit handling live inside the HTTP node. Parallel branches are edges, not code."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <CronVisual />
            <CardBody
              num="04"
              eyebrow="Triggers"
              title="Trigger it however."
              desc="Cron strings for the 3am jobs. Webhooks for partner pushes. Queue listeners for SQS and RabbitMQ. The trigger is just a node — the rest of the graph never knows."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <EmailVisual />
            <CardBody
              num="05"
              eyebrow="Email"
              title="Drip campaigns without the SaaS."
              desc="Segment from a SQL query, rewrite copy per recipient with an LLM node, send through Resend or SES. Opens and clicks land back as events on the next run."
            />
          </BentoCard>

          <BentoCard className="md:col-span-12">
            <PipelineVisual />
            <CardBody
              num="06"
              eyebrow="ETL"
              title="Pipelines that fit on one screen."
              desc="Branch on a column, run twenty stages in parallel, retry only the flaky one. Postgres in, S3 or another Postgres out, with run history pinned next to your code."
              mutedDesc
            />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Brain,
  Clock,
  Code2,
  Database,
  Globe,
  Search,
  Zap,
} from "lucide-react";
import {
  motion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";

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
        "relative min-h-[240px] w-full flex-1 overflow-hidden",
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
/*  Mini node — mirrors actual BaseNode style   */
/*  Used inside bento illustrations only.       */
/* ──────────────────────────────────────────── */

interface MiniNodeProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  accentColor?: string;
  brand?: boolean;
  className?: string;
  style?: React.CSSProperties;
  animate?: TargetAndTransition;
  transition?: Transition;
}

function MiniNode({
  icon,
  label,
  subtitle,
  accentColor = "transparent",
  brand = false,
  className,
  style,
  animate,
  transition,
}: MiniNodeProps) {
  return (
    <motion.div
      animate={animate}
      transition={transition}
      className={cn(
        "absolute flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 select-none",
        brand
          ? "bg-accent-primary border-border-stamp text-accent-on"
          : "bg-bg-elevated border-border-default text-text-primary",
        className
      )}
      style={{
        boxShadow: `inset 2px 0 0 0 ${accentColor}, 2px 2px 0 0 var(--hard-shadow-color)`,
        ...style,
      }}
    >
      <span
        className={cn(
          "shrink-0 [&_svg]:size-3",
          brand ? "text-accent-on" : "text-text-muted"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] leading-tight font-semibold">
          {label}
        </div>
        {subtitle && (
          <div
            className={cn(
              "truncate font-mono text-[9px] leading-tight",
              brand ? "opacity-70" : "text-text-muted"
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────── */
/*  Card 1 — AI Workflow Builder                */
/*  n8n-style mini canvas: nodes + edges.       */
/* ──────────────────────────────────────────── */

/*
  Virtual layout (% of container 100×100):

  Row 1 (top):  [Webhook]          [AI Agent]          [Output]
  Row 2 (bot):  [GPT-4o]           [Web Search]        [Memory]

  Edge endpoints in % coordinates (viewBox="0 0 100 100"):
  - Webhook right-center   → AI Agent left-center
  - AI Agent right-center  → Output left-center
  - GPT-4o  top-center     → AI Agent bottom-left
  - Search  top-center     → AI Agent bottom-center
  - Memory  top-center     → AI Agent bottom-right
*/

const AI_NODES = [
  {
    id: "trigger",
    icon: <Zap />,
    label: "Webhook",
    subtitle: "POST /chat",
    accentColor: "var(--color-warning)",
    style: { left: "1%", top: "7%" },
  },
  {
    id: "agent",
    icon: <Bot />,
    label: "AI Agent",
    subtitle: "gpt-4o · tools",
    accentColor: "var(--accent-primary)",
    brand: true,
    style: { left: "36%", top: "26%" },
  },
  {
    id: "output",
    icon: <ArrowRight />,
    label: "Output",
    subtitle: "→ response",
    accentColor: "var(--color-success)",
    style: { left: "72%", top: "7%" },
  },
  {
    id: "model",
    icon: <Brain />,
    label: "GPT-4o",
    subtitle: "model",
    accentColor: "var(--color-info)",
    style: { left: "1%", top: "67%" },
  },
  {
    id: "search",
    icon: <Search />,
    label: "Web Search",
    subtitle: "tool",
    accentColor: "var(--color-forest-300)",
    style: { left: "36%", top: "67%" },
  },
  {
    id: "memory",
    icon: <Database />,
    label: "Memory",
    subtitle: "buffer",
    accentColor: "#a78bfa",
    style: { left: "70%", top: "67%" },
  },
];

// Each edge: { path (SVG d attr in 0-100 space), color, dashLen+gap = period }
const AI_EDGES = [
  // Webhook right → AI Agent left
  {
    d: "M 19 12.5 C 27 12.5 28 34 36 34",
    color: "var(--color-warning)",
    delay: 0,
  },
  // AI Agent right → Output left
  {
    d: "M 55 34 C 63 34 64 12.5 72 12.5",
    color: "var(--color-success)",
    delay: 0.4,
  },
  // GPT-4o top-center → AI Agent bottom-left
  {
    d: "M 11 67 C 11 53 42 49 42 44",
    color: "var(--color-info)",
    delay: 0.15,
  },
  // Search top-center → AI Agent bottom-center
  {
    d: "M 46.5 67 C 46.5 56 46 50 46 44",
    color: "var(--color-forest-300)",
    delay: 0.25,
  },
  // Memory top-center → AI Agent bottom-right
  {
    d: "M 80 67 C 80 55 52 50 52 44",
    color: "#a78bfa",
    delay: 0.35,
  },
];

function AIVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();

  return (
    <BentoVisual>
      <div ref={ref} className="absolute inset-0">
        {/* Brand glow behind AI Agent node */}
        <motion.div
          aria-hidden
          animate={{ opacity: hovered ? 0.45 : 0.18, scale: hovered ? 1.1 : 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute"
          style={{
            left: "36%",
            top: "26%",
            width: 200,
            height: 140,
            transform: "translate(-20%, -15%)",
            background:
              "radial-gradient(ellipse at 40% 50%, var(--accent-primary), transparent 68%)",
            filter: "blur(28px)",
          }}
        />

        {/* SVG connection edges */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {AI_EDGES.map((edge, i) => (
            <g key={i}>
              {/* Static track */}
              <path
                d={edge.d}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="0.55"
              />
              {/* Animated flow dots */}
              <motion.path
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeWidth="0.55"
                strokeLinecap="round"
                strokeDasharray="3 7"
                initial={{ strokeDashoffset: 0, strokeOpacity: 0.4 }}
                animate={{
                  strokeDashoffset: -100,
                  strokeOpacity: hovered ? 0.95 : 0.45,
                }}
                transition={{
                  strokeDashoffset: {
                    duration: hovered ? 1.4 : 3.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: edge.delay,
                  },
                  strokeOpacity: { duration: 0.35 },
                }}
              />
            </g>
          ))}
        </svg>

        {/* Mini nodes */}
        {AI_NODES.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.82 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              delay: i * 0.07,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute"
            style={node.style}
          >
            <MiniNode
              icon={node.icon}
              label={node.label}
              subtitle={node.subtitle}
              accentColor={node.accentColor}
              brand={node.brand}
              animate={{ y: hovered ? -3 : 0 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: hovered ? i * 0.04 : 0,
              }}
              style={
                node.brand && hovered
                  ? {
                      boxShadow: `inset 2px 0 0 0 ${node.accentColor}, 2px 2px 0 0 var(--hard-shadow-color), 0 0 20px 3px rgba(79,201,122,0.35)`,
                    }
                  : undefined
              }
            />
          </motion.div>
        ))}
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
/* ──────────────────────────────────────────── */

const PIPELINE_STAGES = [
  { label: "Ingest", items: ["Webhook", "Cron", "DB poll"] },
  { label: "Transform", items: ["Parse JSON", "Validate", "Map"] },
  { label: "Enrich", items: ["AI classify", "Lookup", "Tag"] },
  { label: "Load", items: ["Postgres", "S3", "Webhook out"] },
] as const;

function PipelineVisual() {
  const { ref, hovered } = useGroupHover<HTMLDivElement>();
  const [activeStage, setActiveStage] = useState(-1);

  useEffect(() => {
    if (!hovered) {
      setActiveStage(-1);
      return;
    }
    let i = 0;
    setActiveStage(0);
    const iv = setInterval(() => {
      i = (i + 1) % PIPELINE_STAGES.length;
      setActiveStage(i);
    }, 700);
    return () => clearInterval(iv);
  }, [hovered]);

  return (
    <BentoVisual className="p-5">
      <div ref={ref} className="flex h-full items-stretch gap-3">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex flex-1 items-center gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              animate={
                activeStage === i
                  ? { backgroundColor: "var(--accent-primary)", y: -3 }
                  : { backgroundColor: "var(--bg-elevated)", y: 0 }
              }
              className="border-text-primary dark:border-border-default flex-1 border-[1.5px] p-3 shadow-[2px_2px_0_0_var(--hard-shadow-color)] transition-[box-shadow] duration-[250ms]"
            >
              <p
                className={`mb-2 text-[9px] font-bold tracking-wider uppercase transition-colors duration-[250ms] ${activeStage === i ? "text-accent-on" : "text-text-muted"}`}
              >
                {stage.label}
              </p>
              <div className="space-y-1">
                {stage.items.map((item) => (
                  <div
                    key={item}
                    className={`truncate font-mono text-[10px] transition-colors duration-[250ms] ${activeStage === i ? "text-accent-on/80" : "text-text-secondary"}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
            {i < PIPELINE_STAGES.length - 1 && (
              <motion.div
                animate={{
                  scale: activeStage === i ? 1.4 : 1,
                  opacity: activeStage === i ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
                className="flex shrink-0 flex-col items-center gap-0.5"
              >
                <div className="bg-text-primary dark:bg-border-default h-px w-4" />
                <div className="border-l-text-primary dark:border-l-border-default h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent" />
              </motion.div>
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
    <div className="border-text-primary dark:border-border-default shrink-0 border-t-[1.5px] px-7 py-5">
      <p className="text-text-muted mb-2.5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase">
        <span className="bg-accent-primary text-accent-on border-border-stamp border px-1.5 py-0.5 font-bold">
          {num}
        </span>
        {eyebrow}
      </p>
      <h3 className="text-text-primary mb-1.5 text-[20px] leading-[1.15] font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <p
        className={cn(
          "text-body-sm line-clamp-2 leading-relaxed",
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
              Use cases · 06
            </p>
            <h2 className="text-text-primary max-w-[680px] text-[clamp(36px,4.6vw,56px)] leading-[1.0] font-semibold tracking-[-0.04em]">
              One canvas.
              <br />
              Every kind of workflow.
            </h2>
          </div>
          <p className="text-body-md text-text-secondary max-w-sm">
            Whether you're orchestrating LLM agents, syncing CRMs, or processing
            webhooks at scale — FLOW gives you primitives, not opinions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <BentoCard className="md:col-span-8">
            <AIVisual />
            <CardBody
              num="01"
              eyebrow="AI · LLM agents"
              title="AI workflow builder."
              desc="Drop in OpenAI, Anthropic, or local models. Compose retrieval, tools, and memory without writing glue code."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <AgentsVisual />
            <CardBody
              num="02"
              eyebrow="Autonomy"
              title="Agents that take action."
              desc="Multi-step agents plan, call tools, observe results, and iterate — with approval breakpoints where you need them."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <APIVisual />
            <CardBody
              num="03"
              eyebrow="Integration"
              title="API orchestration."
              desc="Chain HTTP calls with retries, auth, and rate-limiting baked in. Fan-out, fan-in, and parallel branches first-class."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <CronVisual />
            <CardBody
              num="04"
              eyebrow="Schedule · cron"
              title="Scheduled & event-driven."
              desc="Cron expressions, intervals, webhooks, queue events — every workflow triggered on time, on-demand, or in response to your stack."
            />
          </BentoCard>

          <BentoCard className="md:col-span-4">
            <EmailVisual />
            <CardBody
              num="05"
              eyebrow="Email automation"
              title="Smart email pipelines."
              desc="Trigger sequences, AI-personalize content, and track opens — all from a single visual pipeline with zero-glue delivery."
            />
          </BentoCard>

          <BentoCard className="md:col-span-12">
            <PipelineVisual />
            <CardBody
              num="06"
              eyebrow="Data pipelines"
              title="Ingest, transform, enrich, and load."
              desc="End-to-end pipelines with branching, parallel execution, retries, and built-in observability."
              mutedDesc
            />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

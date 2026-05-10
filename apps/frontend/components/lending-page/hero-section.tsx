"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "motion/react";

/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* ── Animated word-swap headline — typewriter erase + retype with tilt ── */
const SWAP_WORDS = ["think", "work"] as const;

function AnimatedWord() {
  const [wordIdx, setWordIdx] = useState(0);
  const [typedChars, setTypedChars] = useState(SWAP_WORDS[0].length);
  const [phase, setPhase] = useState<"hold" | "erasing" | "typing">("hold");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const word = SWAP_WORDS[wordIdx];

    if (phase === "hold") {
      timer = setTimeout(() => setPhase("erasing"), 1800);
    } else if (phase === "erasing") {
      if (typedChars > 0) {
        timer = setTimeout(() => setTypedChars((c) => c - 1), 70);
      } else {
        const nextIdx = (wordIdx + 1) % SWAP_WORDS.length;
        timer = setTimeout(() => {
          setWordIdx(nextIdx);
          setPhase("typing");
        }, 220);
      }
    } else if (phase === "typing") {
      if (typedChars < word.length) {
        timer = setTimeout(() => setTypedChars((c) => c + 1), 110);
      } else {
        setPhase("hold");
      }
    }

    return () => clearTimeout(timer);
  }, [wordIdx, typedChars, phase]);

  const word = SWAP_WORDS[wordIdx];
  const visible = word.slice(0, typedChars);

  return (
    <span
      className="bg-accent-primary text-accent-on relative mx-2 inline-block px-3 py-0.5 align-middle not-italic"
      style={{
        transform: "rotate(-2.5deg)",
        transformOrigin: "left center",
      }}
    >
      <span className="inline-block min-w-[3.2ch] whitespace-nowrap">
        {visible}
        {/* Caret — solid while typing/erasing, blinks during hold */}
        <span
          aria-hidden
          className={
            "bg-accent-on ml-0.5 inline-block h-[0.85em] w-[3px] align-middle " +
            (phase === "hold" ? "animate-cursor" : "")
          }
        />
      </span>
    </span>
  );
}

/* ── Mockup node data ── */
const NODES = [
  {
    id: "webhook",
    label: "Webhook",
    sub: "POST /api/orders",
    status: "success",
    color: "info",
    style: { left: "5%", top: "18%" },
  },
  {
    id: "validate",
    label: "Validate Schema",
    sub: "order.json · v3",
    status: "success",
    color: "warning",
    style: { left: "34%", top: "18%" },
  },
  {
    id: "classify",
    label: "Classify with AI",
    sub: "gpt-4o · temp 0.2",
    status: "running",
    color: "forest",
    style: { left: "34%", top: "47%" },
  },
  {
    id: "ifhigh",
    label: "If high-value",
    sub: "amount > $500",
    status: "branch",
    color: "info",
    style: { left: "5%", top: "47%" },
  },
  {
    id: "postgres",
    label: "Postgres",
    sub: "INSERT orders",
    status: "success",
    color: "success",
    style: { left: "34%", top: "75%" },
  },
  {
    id: "slack",
    label: "Slack alert",
    sub: "#orders-priority",
    status: "idle",
    color: "info",
    style: { left: "72%", top: "18%" },
  },
  {
    id: "email",
    label: "Send email",
    sub: "template_v3",
    status: "queued",
    color: "error",
    style: { left: "72%", top: "75%" },
  },
] as const;

type NodeColor = "info" | "warning" | "forest" | "success" | "error";
type NodeStatus = "success" | "running" | "branch" | "idle" | "queued";

const COLOR_MAP: Record<NodeColor, string> = {
  info: "bg-info-surface text-info",
  warning: "bg-warning-surface text-warning",
  forest: "bg-forest-500/20 text-forest-300",
  success: "bg-success-surface text-success",
  error: "bg-error-surface text-error",
};

const STATUS_MAP: Record<NodeStatus, { dot: string; label: string }> = {
  success: { dot: "bg-success", label: "Success" },
  running: { dot: "bg-info animate-pulse-status", label: "Running" },
  branch: { dot: "bg-warning", label: "Branch" },
  idle: { dot: "bg-neutral-500", label: "Idle" },
  queued: { dot: "bg-neutral-500", label: "Queued" },
};

function MockupNode({
  label,
  sub,
  status,
  color,
}: {
  label: string;
  sub: string;
  status: NodeStatus;
  color: NodeColor;
}) {
  const s = STATUS_MAP[status];
  return (
    <div className="absolute w-[148px] rounded-sm border border-neutral-300/50 bg-neutral-200 shadow-sm select-none">
      <div className="flex items-center gap-1.5 border-b border-neutral-300/40 px-2.5 py-2">
        <span
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded-xs text-[9px] ${COLOR_MAP[color]}`}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4" />
          </svg>
        </span>
        <span className="truncate text-[10px] leading-none font-semibold text-neutral-800">
          {label}
        </span>
      </div>
      <div className="px-2.5 py-1.5">
        <p className="mb-1.5 truncate font-mono text-[9px] text-neutral-600">
          {sub}
        </p>
        <div className="flex items-center gap-1">
          <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
          <span className="text-[9px] text-neutral-600">{s.label}</span>
        </div>
      </div>
    </div>
  );
}

function AppMockup() {
  return (
    /* Force dark colors inside the mockup regardless of page theme */
    <div
      data-theme="dark"
      className="border-border-stamp overflow-hidden border-[1.5px] bg-neutral-50"
      style={{
        boxShadow:
          "8px 8px 0 0 var(--hard-shadow-color), 0 32px 80px rgba(0,0,0,0.45)",
      }}
    >
      {/* ── Window chrome ── */}
      <div className="flex items-center gap-3 border-b-2 border-neutral-200/60 bg-neutral-100 px-4 py-2.5">
        {/* Traffic lights */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="bg-mac-red size-2.5 rounded-full" />
          <span className="bg-mac-yellow size-2.5 rounded-full" />
          <span className="bg-mac-green size-2.5 rounded-full" />
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 overflow-hidden font-mono text-[10px] text-neutral-700">
          <span className="truncate text-neutral-600">northwind</span>
          <span className="shrink-0 text-neutral-500">/</span>
          <span className="truncate font-bold text-neutral-800">
            Order processing
          </span>
          <span className="shrink-0 text-neutral-500">/</span>
          <span className="shrink-0 text-neutral-500">v.142</span>
        </div>

        {/* Status pills */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="bg-success/10 border-success/20 text-success flex items-center gap-1 rounded-xs border px-2 py-0.5 text-[9px] font-semibold">
            <span className="bg-success animate-pulse-status size-1.5 rounded-full" />
            Running
          </span>
          <span className="flex items-center gap-1 rounded-xs border border-neutral-300/40 bg-neutral-200/60 px-2 py-0.5 text-[9px] font-medium text-neutral-600">
            <span className="size-1.5 rounded-full bg-neutral-500" />
            Saved
          </span>
        </div>
      </div>

      {/* ── App body ── */}
      <div className="flex" style={{ height: 340 }}>
        {/* Sidebar */}
        <div className="w-[130px] shrink-0 overflow-hidden border-r-2 border-neutral-200/60 bg-neutral-100 p-3">
          <p className="mb-2 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
            Workflow
          </p>
          {["Order processing", "Refund pipeline", "Customer sync"].map(
            (w, i) => (
              <div
                key={w}
                className={`mb-0.5 flex items-center gap-1.5 truncate rounded-xs px-2 py-1.5 text-[10px] ${i === 0 ? "bg-accent-primary/20 text-forest-300 font-semibold" : "text-neutral-600 hover:bg-neutral-200/50"}`}
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${i === 0 ? "bg-forest-400" : "bg-neutral-500"}`}
                />
                {w}
              </div>
            )
          )}
          <p className="mt-4 mb-2 text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
            Library
          </p>
          {["Triggers", "HTTP", "AI / LLM", "Database", "Logic"].map((l) => (
            <div
              key={l}
              className="mb-0.5 flex cursor-default items-center gap-1.5 truncate rounded-xs px-2 py-1.5 text-[10px] text-neutral-600 hover:bg-neutral-200/50"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-neutral-500/60" />
              {l}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="relative flex-1 overflow-hidden bg-neutral-50">
          {/* Dot grid */}
          <div className="canvas-grid absolute inset-0 opacity-30" />

          {/* SVG connections */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 800 340"
            preserveAspectRatio="none"
          >
            {/* Webhook → Validate */}
            <path
              d="M 174 80 C 230 80, 230 80, 270 80"
              fill="none"
              strokeWidth="1.5"
              strokeOpacity="0.8"
              className="conn-animate stroke-forest-400"
            />
            {/* Validate → AI */}
            <path
              d="M 430 80 C 490 80, 490 160, 270 160"
              fill="none"
              strokeWidth="1.5"
              strokeOpacity="0.8"
              className="conn-animate stroke-forest-400"
              style={{ animationDelay: "0.3s" }}
            />
            {/* AI → Postgres */}
            <path
              d="M 430 160 C 490 160, 490 254, 270 254"
              fill="none"
              strokeWidth="1.5"
              strokeOpacity="0.6"
              strokeDasharray="5 3"
              className="stroke-success"
            />
            {/* Postgres → Slack */}
            <path
              d="M 430 254 C 530 254, 530 80, 578 80"
              fill="none"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              className="stroke-neutral-700"
            />
            {/* AI → Slack (branch) */}
            <path
              d="M 430 160 C 530 160, 530 80, 578 80"
              fill="none"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              className="stroke-neutral-700"
            />
          </svg>

          {/* Nodes */}
          {NODES.map((node) => (
            <div key={node.id} className="absolute" style={node.style}>
              <MockupNode
                label={node.label}
                sub={node.sub}
                status={node.status}
                color={node.color}
              />
            </div>
          ))}

          {/* Collaborator avatars */}
          <div className="absolute top-2 right-3 flex items-center -space-x-1.5">
            {(
              [
                ["M", "bg-forest-600"],
                ["J", "bg-warning"],
                ["A", "bg-info"],
              ] as [string, string][]
            ).map(([initials, bg], i) => (
              <div
                key={i}
                className={`flex size-6 items-center justify-center rounded-full border-2 border-neutral-50 text-[9px] font-bold text-neutral-50 ${bg}`}
              >
                {initials}
              </div>
            ))}
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-dashed border-neutral-100 bg-neutral-200 text-[9px] font-bold text-neutral-600">
              +
            </div>
          </div>

          {/* Live cursor A */}
          <motion.div
            animate={{
              x: ["55%", "42%", "55%", "60%", "55%"],
              y: ["30%", "36%", "44%", "30%", "30%"],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute flex items-center gap-1"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className="fill-info stroke-cream-50"
            >
              <path d="M2 2L14 8L8 9L7 14L2 2Z" strokeWidth="0.8" />
            </svg>
            <span className="bg-info text-cream-50 rounded-xs px-1 py-0.5 text-[9px] font-medium">
              Mira
            </span>
          </motion.div>

          {/* Live cursor B */}
          <motion.div
            animate={{
              x: ["62%", "70%", "55%", "62%", "68%"],
              y: ["60%", "72%", "68%", "52%", "64%"],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "linear",
              delay: 1,
            }}
            className="pointer-events-none absolute flex items-center gap-1"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              className="fill-warning stroke-cream-50"
            >
              <path d="M2 2L14 8L8 9L7 14L2 2Z" strokeWidth="0.8" />
            </svg>
            <span className="bg-warning text-neutral-0 rounded-xs px-1 py-0.5 text-[9px] font-medium">
              Jonas
            </span>
          </motion.div>
        </div>

        {/* Inspector panel */}
        <div className="w-[148px] shrink-0 overflow-hidden border-l-2 border-neutral-200/60 bg-neutral-100 p-3">
          <p className="mb-3 truncate text-[10px] font-bold text-neutral-800">
            Classify with AI
          </p>

          {[
            { label: "Model", value: "gpt-4o", highlight: true },
            {
              label: "Prompt",
              value: "Categorize: {{ $json.items }}",
              multiline: true,
            },
            { label: "Temp", value: "0.2" },
            { label: "Output", value: "{ category, score }", highlight: true },
          ].map(({ label, value, highlight, multiline }) => (
            <div key={label} className="mb-2">
              <p className="mb-0.5 text-[8px] font-semibold tracking-wider text-neutral-600 uppercase">
                {label}
              </p>
              <div
                className={`rounded-xs border px-1.5 py-1 font-mono text-[9px] leading-tight ${highlight ? "border-forest-500/40 bg-forest-500/10 text-forest-300" : "border-neutral-300/40 bg-neutral-200/60 text-neutral-700"} ${multiline ? "line-clamp-2" : "truncate"}`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 border-t-2 border-neutral-200/60 bg-neutral-100 px-4 py-2">
        <span className="font-mono text-[9px] text-neutral-600">7 nodes</span>
        <span className="text-neutral-500">·</span>
        <span className="font-mono text-[9px] text-neutral-600">
          Last run: 2s ago
        </span>
        <span className="text-neutral-500">·</span>
        <span className="font-mono text-[9px] text-neutral-600">
          142 executions today
        </span>
        <span className="text-success ml-auto flex items-center gap-1 font-mono text-[9px] font-bold">
          <span className="bg-success animate-pulse-status size-1.5 rounded-full" />
          Active
        </span>
      </div>
    </div>
  );
}

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative pt-32 pb-24">
      <div className="section-container relative">
        {/* ── Hero copy (centered) ── */}
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Eyebrow */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="btn-stamp text-text-primary mb-8 inline-flex h-auto items-center gap-2.5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ boxShadow: "3px 3px 0 0 var(--hard-shadow-color)" }}
          >
            <span className="bg-accent-primary animate-pulse-status size-2 rounded-full shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent-primary)_30%,transparent)]" />
            v2.4 Shipped · 12 new nodes
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-text-primary mb-8 text-[clamp(40px,6.4vw,76px)] leading-[1.05] font-semibold tracking-tighter"
          >
            Build workflows
            <br />
            that <AnimatedWord /> for you.
          </motion.h1>

          {/* Lede */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-body-lg text-text-secondary mx-auto mb-10 max-w-2xl leading-relaxed"
          >
            FLOW is a node-based automation platform for engineers. Compose
            APIs, LLM agents, and data pipelines on a single canvas —
            version-controlled, observable, and self-hosted.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-8 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={() => router.push("/workflows/new")}
              className="btn-stamp btn-stamp-primary hover:btn-stamp-primary-hover hover:btn-stamp-hover active:btn-stamp-active text-body-md h-12 px-[22px]"
            >
              Start building free
              <ArrowRight className="size-4" />
            </button>

            <button className="btn-stamp hover:btn-stamp-hover active:btn-stamp-active text-body-md h-12 px-[22px]">
              <Play className="size-4 fill-current" />
              Watch demo · 2:14
            </button>
          </motion.div>

          {/* Meta */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-body-sm text-text-muted mb-16 flex flex-wrap items-center justify-center gap-3"
          >
            <span className="font-mono">No credit card</span>
            <span className="bg-border-default size-1 rounded-full" />
            <span className="font-mono">Self-host or cloud</span>
            <span className="bg-border-default size-1 rounded-full" />
            <span className="text-warning">★★★★★</span>
            <span>
              <span className="text-text-primary font-mono font-semibold">
                4.9
              </span>{" "}
              · 1.2k reviews
            </span>
          </motion.div>
        </motion.div>

        {/* ── MacBook mockup (full-width, below copy) ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1], delay: 0.4 }}
          className="relative w-full"
        >
          {/* Glow under mockup */}
          <div
            className="pointer-events-none absolute -inset-x-8 -bottom-4 h-24 opacity-40 blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 100%, var(--accent-press), transparent)",
            }}
          />

          {/* Subtle floating */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <AppMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
